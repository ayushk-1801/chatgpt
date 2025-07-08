import { chatController } from '@/controllers/chat';
import { config } from '@/config';

export const maxDuration = config.api.titleGeneration.maxDuration;

export const POST = chatController.generateTitle; 