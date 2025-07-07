import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/db';
import Chat from '@/lib/models/Chat';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { chatId, message }: { chatId: string; message: string } = await req.json();
    
    if (!chatId || !message) {
      return new Response('Missing chatId or message', { status: 400 });
    }

    await dbConnect();

    const chat = await Chat.findOne({ slug: chatId, userId });

    if (!chat) {
      return new Response('Chat not found', { status: 404 });
    }

    const { text: title } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt: `Generate a short, concise title (5 words max) for the following user query: "${message}"`,
      maxTokens: 20,
    });

    chat.title = title.replace(/"/g, ''); // Remove quotes from the generated title
    await chat.save();

    return NextResponse.json({ title: chat.title });

  } catch (error) {
    console.error('Title generation error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
} 