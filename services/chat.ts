import Chat from '@/lib/models/Chat';
import Message from '@/lib/models/Message';
import { 
  Chat as ChatType, 
  ChatMessage as MessageType, 
  CreateChatOptions, 
  SaveMessageOptions,
  EditMessageOptions,
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
        .lean() as unknown as ChatType[];
      
      return { chats };
    } catch (error) {
      throw new DatabaseError('Failed to fetch user chats', { error, userId });
    }
  }

  async getChatWithMessages(slug: string, userId: string): Promise<ChatDetailsResponse> {
    try {
      await ensureDbConnection();
      
      const chat = await Chat.findOne({ slug, userId }).lean() as unknown as ChatType | null;
      
      if (!chat) {
        throw new NotFoundError('Chat not found');
      }

      const messages = await Message.find({ chatId: chat._id })
        .sort({ createdAt: 1 })
        .select('role content attachments originalContent isEdited editHistory createdAt')
        .lean() as unknown as MessageType[];
      
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
        attachments: options.attachments,
        model: options.model,
      });
      
      return message.toObject();
    } catch (error) {
      throw new DatabaseError('Failed to save message', { error, options });
    }
  }

  async editMessage(options: EditMessageOptions): Promise<MessageType> {
    try {
      await ensureDbConnection();
      
      const message = await Message.findById(options.messageId);
      
      if (!message) {
        throw new NotFoundError('Message not found');
      }

      // Verify the user owns this chat
      const chat = await Chat.findById(message.chatId);
      if (!chat || chat.userId !== options.userId) {
        throw new NotFoundError('Message not found or access denied');
      }

      // Store original content if this is the first edit
      if (!message.isEdited) {
        message.originalContent = message.content;
        message.isEdited = true;
        message.editHistory = [];
      }

      // Add current content to edit history
      message.editHistory.push({
        content: message.content,
        editedAt: new Date(),
      });

      // Update content
      message.content = options.newContent;
      
      await message.save();
      
      // Update chat timestamp
      await this.updateChatTimestamp(message.chatId.toString());
      
      return message.toObject();
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to edit message', { error, options });
    }
  }

  async deleteMessagesAfter(messageId: string, userId: string): Promise<void> {
    try {
      await ensureDbConnection();
      
      const message = await Message.findById(messageId);
      
      if (!message) {
        throw new NotFoundError('Message not found');
      }

      // Verify the user owns this chat
      const chat = await Chat.findById(message.chatId);
      if (!chat || chat.userId !== userId) {
        throw new NotFoundError('Message not found or access denied');
      }

      // Delete all messages created after this message
      await Message.deleteMany({
        chatId: message.chatId,
        createdAt: { $gt: message.createdAt }
      });

      // Update chat timestamp
      await this.updateChatTimestamp(message.chatId.toString());
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to delete messages after', { error, messageId, userId });
    }
  }

  /**
   * Permanently delete a chat and all of its messages
   */
  async deleteChat(slug: string, userId: string): Promise<void> {
    try {
      await ensureDbConnection();

      const chat = await Chat.findOne({ slug, userId });
      if (!chat) {
        throw new NotFoundError('Chat not found');
      }

      // Delete all messages associated with this chat
      await Message.deleteMany({ chatId: chat._id });

      // Delete the chat itself
      await Chat.deleteOne({ _id: chat._id });
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to delete chat', { error, slug, userId });
    }
  }

  async getChatMessages(chatId: string): Promise<MessageType[]> {
    try {
      await ensureDbConnection();
      
      const messages = await Message.find({ chatId })
        .sort({ createdAt: 1 })
        .lean() as unknown as MessageType[];
      
      return messages;
    } catch (error) {
      throw new DatabaseError('Failed to fetch chat messages', { error, chatId });
    }
  }
}

export const chatService = new ChatService(); 