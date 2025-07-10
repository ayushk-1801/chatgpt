import { chatController } from '@/controllers/chat';

// Allow streaming responses up to configured duration (300 seconds)
export const maxDuration = 300;

export const POST = chatController.handleChatCompletion; 