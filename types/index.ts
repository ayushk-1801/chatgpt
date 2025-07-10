import { Document, Types } from 'mongoose';
import { type Message as VercelAIMessage, type ToolInvocation as VercelAIToolInvocation } from 'ai';

// Base entity, for common fields
interface BaseEntity {
  createdAt: Date;
  updatedAt: Date;
}

// Chat types
export interface Chat extends BaseEntity {
  _id?: string | Types.ObjectId; // MongoDB document id
  userId: string;
  title: string;
  slug: string;
}

export interface ChatDocument extends Document {
  _id: Types.ObjectId;
  userId: string;
  title: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatWithMessages {
  chat: ChatDocument | null;
  messages: ChatMessageDocument[];
}

// Message edit history
export interface MessageEditEntry {
  content: string;
  editedAt: Date;
}

// Attachment interface
export interface MessageAttachment {
  url?: string; // optional because newly uploaded local files may not have a remote URL yet
  name?: string;
  contentType?: string;
  // optional buffer method when running on server side with File
  buffer?: () => Promise<ArrayBuffer>;
}

// Message types
export interface ChatMessage extends BaseEntity {
  chatId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  attachments?: MessageAttachment[];
  originalContent?: string;
  isEdited?: boolean;
  editHistory?: MessageEditEntry[];
  aiModel?: string;
  createdAt: Date;
}

export interface ChatMessageDocument extends ChatMessage, Document {}

// Chat operation options
export interface CreateChatOptions {
  userId: string;
  slug: string;
  title?: string;
}

export interface SaveMessageOptions {
  chatId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  attachments?: MessageAttachment[];
  model?: string;
}

export interface EditMessageOptions {
  messageId: string;
  newContent: string;
  userId: string;
}

// API response types for chat operations
export interface ChatsListResponse {
  chats: Chat[];
}

export interface ChatDetailsResponse {
  chat: Chat | null;
  messages: ChatMessage[];
}

// AI types
export interface AIMessage {
  id: string;
  role: VercelAIMessage['role'];
  content: string;
  attachments?: MessageAttachment[];
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

// Memory-related types, if any, e.g. from mem0
export interface Memory {
  id: string;
  text: string;
  timestamp: Date;
}

// Memory-related types specifically for the `MemoryService`
export interface MemoryEntry {
  id: string;
  /** The textual memory content */
  memory: string;
  /** Optional relevance score returned by the memory service */
  score?: number;
  /** Creation timestamp */
  createdAt?: Date;
}

export interface MemorySearchOptions {
  /** The id of the user whose memories are being queried */
  userId: string;
  /** Maximum number of memories to return */
  limit?: number;
} 