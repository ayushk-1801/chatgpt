import { chatController } from '@/controllers/chat';

export const GET = chatController.getAllChats;
export const POST = chatController.createChat; 