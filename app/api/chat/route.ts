import { openai } from '@ai-sdk/openai';
import { streamText, convertToCoreMessages, UIMessage, OnFinishResult } from 'ai';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/db';
import Chat from '@/lib/models/Chat';
import Message from '@/lib/models/Message';
import { NextRequest } from 'next/server';
import { MemoryClient } from 'mem0ai';

if (!process.env.MEM0_API_KEY) {
  throw new Error('MEM0_API_KEY is not set in the environment variables.');
}

const memory = new MemoryClient({
  apiKey: process.env.MEM0_API_KEY,
});

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { messages, chatId }: { messages: UIMessage[]; chatId?: string } = await req.json();
    
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
          title: messages[0]?.content?.substring(0, 50) + '...' || 'New Chat',
        });
        await chat.save();
      }
    } else {
      return new Response('Chat ID required', { status: 400 });
    }

    // Save the latest user message to database
    const latestMessage = messages[messages.length - 1];
    if (latestMessage && latestMessage.role === 'user') {
      await Message.create({
        chatId: chat._id,
        role: 'user',
        content: latestMessage.content,
      });
    }

    const modelIdentifier = 'gpt-4o';

    const latestUserMessage = messages[messages.length - 1];
    let systemPrompt = 'You are a helpful assistant. Provide clear, concise, and accurate responses.';

    if (latestUserMessage && latestUserMessage.role === 'user') {
      const relevantMemories = await memory.search(latestUserMessage.content, { user_id: userId });
      if (relevantMemories && relevantMemories.length > 0) {
        const memoriesStr = relevantMemories
          .map(entry => `- ${entry.memory}`)
          .join('\n');
        systemPrompt += `\n\nHere are some relevant memories about the user:\n${memoriesStr}`;
      }
    }

    const messagesWithMemory = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    // Generate AI response
    const result = streamText({
      model: openai(modelIdentifier),
      messages: convertToCoreMessages(messagesWithMemory),
      onFinish: async (result: OnFinishResult) => {
        // Save assistant response to database
        await Message.create({
          chatId: chat._id,
          role: 'assistant',
          content: result.text,
          model: modelIdentifier,
        });

        // Save messages to mem0
        const userMessage = messages[messages.length - 1];
        if (userMessage.role === 'user') {
          await memory.add([
            { role: 'user', content: userMessage.content },
            { role: 'assistant', content: result.text }
          ], { user_id: userId });
        }
        
        // Update chat's updatedAt timestamp
        await Chat.findByIdAndUpdate(chat._id, { updatedAt: new Date() });
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
} 