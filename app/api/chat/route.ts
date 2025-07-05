import { openai } from '@ai-sdk/openai';
import { streamText, convertToCoreMessages, UIMessage } from 'ai';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/db';
import Chat from '@/lib/models/Chat';
import Message from '@/lib/models/Message';
import { NextRequest } from 'next/server';

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

    // Generate AI response
    const result = streamText({
      model: openai(modelIdentifier),
      system: 'You are a helpful assistant. Provide clear, concise, and accurate responses.',
      messages: convertToCoreMessages(messages),
      onFinish: async (result) => {
        // Save assistant response to database
        await Message.create({
          chatId: chat._id,
          role: 'assistant',
          content: result.text,
          model: modelIdentifier,
        });
        
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