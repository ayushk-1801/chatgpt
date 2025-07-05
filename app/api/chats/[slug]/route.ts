import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/db';
import Chat from '@/lib/models/Chat';
import Message from '@/lib/models/Message';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    await dbConnect();
    
    const chat = await Chat.findOne({ slug: params.slug, userId });
    
    if (!chat) {
      return new Response('Chat not found', { status: 404 });
    }

    const messages = await Message.find({ chatId: chat._id })
      .sort({ createdAt: 1 })
      .select('role content createdAt');
    
    return Response.json({
      chat,
      messages,
    });
  } catch (error) {
    console.error('Error fetching chat:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
} 