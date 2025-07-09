import { chatController } from '@/controllers/chat';

export const GET = chatController.getChatById;
export const PUT = chatController.editMessage;
export const DELETE = chatController.deleteMessagesAfter; 