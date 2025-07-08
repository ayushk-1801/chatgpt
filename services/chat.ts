import Chat from '@/lib/models/Chat';
import Message from '@/lib/models/Message';
import { 
  Chat as ChatType, 
  Message as MessageType, 
  CreateChatOptions, 
  SaveMessageOptions,
  ChatsListResponse,
  ChatDetailsResponse 
} from '@/types';
import { DatabaseError, NotFoundError } from '@/lib/errors';
import { DEFAULTS } from '@/lib/constants';
import { ensureDbConnection } from './database';

class ChatService {
  async getAllUserChats(userId: string): Promise<ChatsListResponse> {
    try {
      await ensureDbConnection();
      
      const chats = await Chat.find({ userId })
        .sort({ updatedAt: -1 })
        .select('slug title createdAt updatedAt')
        .lean();
      
      return { chats };
    } catch (error) {
      throw new DatabaseError('Failed to fetch user chats', { error, userId });
    }
  }

  async getChatWithMessages(slug: string, userId: string): Promise<ChatDetailsResponse> {
    try {
      await ensureDbConnection();
      
      const chat = await Chat.findOne({ slug, userId }).lean();
      
      if (!chat) {
        throw new NotFoundError('Chat not found');
      }

      const messages = await Message.find({ chatId: chat._id })
        .sort({ createdAt: 1 })
        .select('role content createdAt')
        .lean();
      
      return { chat, messages };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to fetch chat details', { error, slug, userId });
    }
  }

  async findOrCreateChat(slug: string, userId: string, title?: string): Promise<ChatType> {
    try {
      await ensureDbConnection();
      
      let chat = await Chat.findOne({ slug, userId });
      
      if (!chat) {
        chat = new Chat({
          userId,
          slug,
          title: title || DEFAULTS.CHAT_TITLE,
        });
        await chat.save();
      }
      
      return chat.toObject();
    } catch (error) {
      throw new DatabaseError('Failed to find or create chat', { error, slug, userId });
    }
  }

  async createChat(options: CreateChatOptions): Promise<ChatType> {
    try {
      await ensureDbConnection();
      
      const chat = new Chat({
        userId: options.userId,
        slug: options.slug,
        title: options.title || DEFAULTS.CHAT_TITLE,
      });
      
      await chat.save();
      return chat.toObject();
    } catch (error) {
      throw new DatabaseError('Failed to create chat', { error, options });
    }
  }

  async updateChatTitle(slug: string, userId: string, title: string): Promise<void> {
    try {
      await ensureDbConnection();
      
      const chat = await Chat.findOne({ slug, userId });
      
      if (!chat) {
        throw new NotFoundError('Chat not found');
      }
      
      chat.title = title;
      await chat.save();
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to update chat title', { error, slug, userId, title });
    }
  }

  async updateChatTimestamp(chatId: string): Promise<void> {
    try {
      await Chat.findByIdAndUpdate(chatId, { updatedAt: new Date() });
    } catch (error) {
      throw new DatabaseError('Failed to update chat timestamp', { error, chatId });
    }
  }

  async saveMessage(options: SaveMessageOptions): Promise<MessageType> {
    try {
      await ensureDbConnection();
      
      const message = await Message.create({
        chatId: options.chatId,
        role: options.role,
        content: options.content,
        model: options.model,
      });
      
      return message.toObject();
    } catch (error) {
      throw new DatabaseError('Failed to save message', { error, options });
    }
  }

  async getChatMessages(chatId: string): Promise<MessageType[]> {
    try {
      await ensureDbConnection();
      
      const messages = await Message.find({ chatId })
        .sort({ createdAt: 1 })
        .lean();
      
      return messages;
    } catch (error) {
      throw new DatabaseError('Failed to fetch chat messages', { error, chatId });
    }
  }
}

export const chatService = new ChatService(); 