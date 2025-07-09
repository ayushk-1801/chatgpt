import { z } from 'zod';
import { VALIDATION, AI_MODELS } from '@/lib/constants';

// Message validation
export const messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1).max(VALIDATION.MESSAGE_MAX_LENGTH),
});

// Chat request validation
export const chatRequestSchema = z.object({
  messages: z.array(messageSchema).min(1),
  chatId: z.string().min(1),
  model: z.string().optional().default(AI_MODELS.GPT_4O),
  toolChoice: z
    .object({
      type: z.string().optional(),
      name: z.string(),
    })
    .optional(),
});

// Chat creation validation
export const createChatSchema = z.object({
  userId: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().max(VALIDATION.CHAT_TITLE_MAX_LENGTH).optional(),
});

// Title generation validation
export const titleGenerationSchema = z.object({
  chatId: z.string().min(1),
  message: z.string().min(1).max(VALIDATION.MESSAGE_MAX_LENGTH),
});

// File upload validation
export const uploadFileSchema = z.object({
  file: z.instanceof(File).refine(
    (file) => file.size <= VALIDATION.FILE_MAX_SIZE,
    'File size must be less than 10MB'
  ).refine(
    (file) => [
      ...VALIDATION.SUPPORTED_IMAGE_TYPES,
      ...VALIDATION.SUPPORTED_DOCUMENT_TYPES,
    ].includes(file.type),
    'Unsupported file type'
  ),
});

// Image generation validation
export const imageGenerationSchema = z.object({
  prompt: z.string().min(1).max(1000),
});

// Chat slug validation
export const chatSlugSchema = z.string().min(1).max(100);

// User ID validation
export const userIdSchema = z.string().min(1);

// Validation helper functions
export function validateChatRequest(data: unknown) {
  return chatRequestSchema.parse(data);
}

export function validateTitleGeneration(data: unknown) {
  return titleGenerationSchema.parse(data);
}

export function validateUploadFile(file: unknown) {
  return uploadFileSchema.parse({ file });
}

export function validateImageGeneration(data: unknown) {
  return imageGenerationSchema.parse(data);
}

export function validateChatSlug(slug: unknown) {
  return chatSlugSchema.parse(slug);
}

export function validateUserId(userId: unknown) {
  return userIdSchema.parse(userId);
} 