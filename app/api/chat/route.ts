import { chatController } from '@/controllers/chat';
import { config } from '@/config';

// Allow streaming responses up to configured duration
export const maxDuration = config.api.maxDuration;

export const POST = chatController.handleChatCompletion; 