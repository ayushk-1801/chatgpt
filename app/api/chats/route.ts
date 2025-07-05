import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/db';
import Chat from '@/lib/models/Chat';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    await dbConnect();
    
    const chats = await Chat.find({ userId })
      .sort({ updatedAt: -1 })
      .select('slug title createdAt updatedAt');
    
    return Response.json(chats);
  } catch (error) {
    console.error('Error fetching chats:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
} 