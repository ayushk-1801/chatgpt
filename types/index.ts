import { Document } from 'mongoose';
import { type Message as VercelAIMessage, type ToolInvocation as VercelAIToolInvocation } from 'ai';

// Base entity, for common fields
interface BaseEntity {
  createdAt: Date;
  updatedAt: Date;
}

// Chat types
export interface Chat extends BaseEntity {
  userId: string;
  title: string;
  slug: string;
}

export interface ChatDocument extends Chat, Document {}

export interface ChatWithMessages {
  chat: ChatDocument | null;
  messages: ChatMessageDocument[];
}

// Message types
export interface ChatMessage extends BaseEntity {
  chatId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  aiModel?: string;
  createdAt: Date;
}

export interface ChatMessageDocument extends ChatMessage, Document {}

// AI types
export interface AIMessage {
  id: string;
  role: VercelAIMessage['role'];
  content: string;
  attachments?: any[];
  toolInvocations?: VercelAIToolInvocation[];
}

// Image generation types
export interface GenerateImageOptions {
  prompt: string;
  chatId?: string;
}

export interface ImageGenerationResult {
  image: string; // base64 encoded image
  prompt: string;
}

// API response structure
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// Zod validation schemas might also be considered types
// Example:
// export type ChatRequestPayload = z.infer<typeof chatRequestSchema>;

// Memory-related types, if any, e.g. from mem0
export interface Memory {
  id: string;
  text: string;
  timestamp: Date;
} 