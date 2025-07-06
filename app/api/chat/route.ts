import { openai } from '@ai-sdk/openai';
// @ts-expect-error Ignore missing type declarations for the ai SDK
import { streamText, CoreMessage, OnFinishResult, experimental_generateImage as generateImage, tool } from 'ai';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/db';
import Chat from '@/lib/models/Chat';
import Message from '@/lib/models/Message';
import { NextRequest } from 'next/server';
import { MemoryClient } from 'mem0ai';
import { z } from 'zod';

if (!process.env.MEM0_API_KEY) {
  throw new Error('MEM0_API_KEY is not set in the environment variables.');
}

const memory = new MemoryClient({
  apiKey: process.env.MEM0_API_KEY,
});

// Allow streaming responses up to 30 seconds
export const maxDuration = 300;

async function getFileBuffer(url: string): Promise<Buffer> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.statusText}`);
        }
        const buffer = await response.arrayBuffer();
        return Buffer.from(buffer);
    } catch (error) {
        console.error('Error getting file buffer:', error);
        throw error;
    }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { messages, chatId, model }: { messages: CoreMessage[]; chatId?: string, model?: string } = await req.json();
    
    await dbConnect();

    // Get or create chat
    let chat;
    if (chatId) {
      chat = await Chat.findOne({ slug: chatId, userId });
      if (!chat) {
        // Create new chat if it doesn't exist
        chat = new Chat({
          userId,
          slug: chatId,
          title: (messages[0]?.content as string)?.substring(0, 50) + '...' || 'New Chat',
        });
        await chat.save();
      }
    } else {
      return new Response('Chat ID required', { status: 400 });
    }

    // Process the latest message for files and images
    const latestUserMessage = messages[messages.length - 1];
    const imageRegex = /\[image:(.*?)\]([\s\S]*)/;
    const fileRegex = /\[file:(.*?),name:(.*?),type:(.*?)\]([\s\S]*)/;
    
    let textContent = '';
    const coreMessages: CoreMessage[] = [...messages];
    const userMessageToProcess = coreMessages[coreMessages.length - 1];

    if (userMessageToProcess.role === 'user' && typeof userMessageToProcess.content === 'string') {
        const imageMatch = userMessageToProcess.content.match(imageRegex);
        const fileMatch = userMessageToProcess.content.match(fileRegex);

        if (imageMatch) {
            const imageUrl = imageMatch[1];
            textContent = imageMatch[2];
            userMessageToProcess.content = [
                { type: 'text', text: textContent },
                { type: 'image', image: new URL(imageUrl) },
            ];
        } else if (fileMatch) {
            const fileUrl = fileMatch[1];
            const fileName = fileMatch[2];
            const fileType = fileMatch[3];
            textContent = fileMatch[4] || ' ';
            const fileBuffer = await getFileBuffer(fileUrl);
            
            const content: ({ type: 'text'; text: string; } | { type: 'file'; data: Buffer; mediaType: string; filename: string; })[] = [
                { type: 'text', text: textContent },
                { 
                    type: 'file', 
                    data: fileBuffer,
                    mediaType: fileType,
                    filename: fileName,
                }
            ];
            userMessageToProcess.content = content;
        }
    }

    // Save the latest user message to database
    if (latestUserMessage && latestUserMessage.role === 'user') {
      await Message.create({
        chatId: chat._id,
        role: 'user',
        content: textContent || (latestUserMessage.content as string),
      });
    }

    const modelIdentifier = model || 'gpt-4o';

    let systemPrompt = 'You are a helpful assistant. Provide clear, concise, and accurate responses.';
    
    if (latestUserMessage && latestUserMessage.role === 'user') {
      const queryText = textContent || (latestUserMessage.content as string);
      const relevantMemories = await memory.search(queryText, { user_id: userId });
      if (relevantMemories && relevantMemories.length > 0) {
        const memoriesStr = relevantMemories
          .map(entry => `- ${entry.memory}`)
          .join('\n');
        systemPrompt += `\n\nHere are some relevant memories about the user:\n${memoriesStr}`;
      }
    }

    // Redact any base64 image data in previous assistant messages to avoid sending large payloads back to the model
    const formattedCoreMessages: CoreMessage[] = coreMessages.map(m => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (m.role === 'assistant' && (m as any).toolInvocations) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (m as any).toolInvocations.forEach((ti: any) => {
          if (ti.toolName === 'generateImage' && ti.state === 'result') {
            ti.result.image = 'redacted-for-length';
          }
        });
      }
      return m;
    });

    const messagesWithMemory: CoreMessage[] = [
      { role: 'system', content: systemPrompt },
      ...formattedCoreMessages,
    ];

    // Define tools the model can call
    const tools = {
      generateImage: tool({
        description: 'Generate an image based on a prompt',
        parameters: z.object({
          prompt: z.string().describe('The prompt to generate the image from'),
        }),
        execute: async ({ prompt }: { prompt: string }) => {
          const { image } = await generateImage({
            model: openai.image('dall-e-3'),
            prompt,
          });
          const dataUrl = `data:${image.mimeType || 'image/png'};base64,${image.base64}`;
          // Save image as separate assistant message for persistence
          await Message.create({
            chatId: chat._id,
            role: 'assistant',
            content: `[image:${dataUrl}]`,
            model: 'image-generation',
          });
          await Chat.findByIdAndUpdate(chat._id, { updatedAt: new Date() });
          return { image: image.base64, prompt };
        },
      }),
    } as const;

    // Generate AI response
    const result = streamText({
      model: openai(modelIdentifier),
      messages: messagesWithMemory,
      tools,
      onFinish: async (result: OnFinishResult) => {
        if (result.text && result.text.trim() !== '') {
          await Message.create({
            chatId: chat._id,
            role: 'assistant',
            content: result.text,
            model: modelIdentifier,
          });
        }

        // Save messages to mem0
        const userMessageText = textContent || (latestUserMessage.content as string);
        if (userMessageText) {
          await memory.add([
            { role: 'user', content: userMessageText },
            { role: 'assistant', content: result.text }
          ], { user_id: userId });
        }
        
        // Update chat's updatedAt timestamp
        await Chat.findByIdAndUpdate(chat._id, { updatedAt: new Date() });
      },
    });

    // Return generic data stream response (includes tool invocation events)
    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
} 