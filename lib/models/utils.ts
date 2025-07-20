import mongoose from 'mongoose';
import Chat from './Chat';
import Message from './Message';

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
  TOOL = 'tool'
}

interface CreateChatOptions {
  title: string;
  model: string;
  temperature: number;
  maxTokens: number;
  userId?: string;
}

interface AddMessageOptions {
  chatId: string;
  content: string;
  role: MessageRole;
  attachments?: mongoose.Types.ObjectId[];
  generationMetadata?: {
    model?: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    temperature?: number;
    maxTokens?: number;
    finishReason?: string;
    responseTime?: number;
  };
}

export class ChatBranchingUtils {
  static async createNewChat(options: CreateChatOptions) {
    const { title, model, temperature, maxTokens, userId } = options;
    
    // Generate a unique slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    
    const uniqueSlug = `${slug}-${Date.now()}`;
    
    const chat = new Chat({
      title,
      slug: uniqueSlug,
      userId: userId || 'anonymous', // Default to anonymous if no userId provided
    });
    
    await chat.save();
    
    return { chat };
  }
  
  static async addMessage(options: AddMessageOptions) {
    const { chatId, content, role, attachments = [], generationMetadata } = options;
    
    const messageData: any = {
      chatId,
      content,
      role,
    };
    
    // Add attachments as references to MediaAttachment documents
    if (attachments.length > 0) {
      messageData.attachments = attachments.map(id => ({
        attachmentId: id,
      }));
    }
    
    // Add generation metadata for assistant messages
    if (role === MessageRole.ASSISTANT && generationMetadata) {
      messageData.model = generationMetadata.model;
      messageData.generationMetadata = generationMetadata;
    }
    
    const message = new Message(messageData);
    await message.save();
    
    return message;
  }
  
  static async getChatWithMessages(chatId: string) {
    const chat = await Chat.findById(chatId);
    const messages = await Message.find({ chatId }).sort({ createdAt: 1 });
    
    return { chat, messages };
  }
} 