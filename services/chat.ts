import { Chat } from '@/lib/models/Chat';
import { Message } from '@/lib/models/Message';
import { MediaAttachment } from '@/lib/models/MediaAttachment';
import { 
  Chat as ChatType, 
  ChatMessage as MessageType, 
  CreateChatOptions, 
  SaveMessageOptions,
  EditMessageOptions,
  ChatsListResponse,
  ChatDetailsResponse 
} from '@/types';
import { DatabaseError, NotFoundError, ValidationError } from '@/lib/errors';
import { DEFAULTS } from '@/lib/constants';
import { ensureDbConnection } from './database';

class ChatService {
  async getAllUserChats(userId: string): Promise<ChatsListResponse> {
    try {
      await ensureDbConnection();
      
      const chats = await Chat.find({ userId })
        .sort({ updatedAt: -1 })
        .select('slug title createdAt updatedAt')
        .lean<ChatType[]>();
      
      return { chats };
    } catch (error) {
      throw new DatabaseError('Failed to fetch user chats', { error, userId });
    }
  }

  async getChatWithMessages(slug: string, userId: string): Promise<ChatDetailsResponse> {
    try {
      await ensureDbConnection();
      
      const chat = await Chat.findOne({ slug, userId }).lean<ChatType>();
      
      if (!chat) {
        throw new NotFoundError('Chat not found');
      }

      const messages = await Message.find({ chatId: chat._id })
        .sort({ createdAt: 1 })
        .populate<{ attachments: { attachmentId: typeof MediaAttachment }[] }>({
          path: 'attachments.attachmentId',
          model: MediaAttachment,
          select: 'originalName mimeType mediaType secureUrl cloudinaryId fileSize'
        })
        .select('role content attachments originalContent isEdited editHistory createdAt')
        .lean<MessageType[]>();
      
      // Transform attachments to the expected frontend format
      const transformedMessages = messages.map(message => ({
        ...message,
        attachments: message.attachments?.map((att: any) => {
          if (att.attachmentId) {
            // New format with MediaAttachment reference
            return {
              id: att.attachmentId._id, // Include the attachment ID for editing
              url: att.attachmentId.secureUrl,
              name: att.attachmentId.originalName,
              contentType: att.attachmentId.mimeType,
            };
          } else {
            // Legacy format (backward compatibility)
            return {
              url: att.url,
              name: att.name,
              contentType: att.contentType,
            };
          }
        }) || []
      }));
      
      return { chat, messages: transformedMessages };
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
      await Chat.findByIdAndUpdate(chatId, { updatedAt: new Date() }).exec();
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

  async editMessageByPosition(options: {
    chatSlug: string;
    messageIndex: number;
    originalContent: string;
    newContent: string;
    userId: string;
  }): Promise<MessageType> {
    try {
      await ensureDbConnection();
      
      // First find the chat
      const chat = await Chat.findOne({ slug: options.chatSlug, userId: options.userId });
      if (!chat) {
        throw new NotFoundError('Chat not found');
      }

      // Get all messages for this chat, ordered by creation time
      const messages = await Message.find({ chatId: chat._id })
        .sort({ createdAt: 1 });

      console.log('Found messages for editing:', {
        totalMessages: messages.length,
        requestedIndex: options.messageIndex,
        originalContent: options.originalContent?.slice(0, 50)
      });

      // Find the message at the specified index
      if (options.messageIndex >= messages.length || options.messageIndex < 0) {
        throw new NotFoundError('Message index out of range');
      }

      const messageToEdit = messages[options.messageIndex];
      
      // Verify the content matches (for safety)
      if (messageToEdit.content !== options.originalContent) {
        console.error('Content mismatch:', {
          expected: options.originalContent?.slice(0, 50),
          actual: messageToEdit.content?.slice(0, 50)
        });
        throw new ValidationError('Message content does not match - message may have been modified');
      }

      console.log('Found message to edit:', {
        messageId: messageToEdit._id,
        role: messageToEdit.role,
        originalContent: messageToEdit.content?.slice(0, 50)
      });

      // Store original content if this is the first edit
      if (!messageToEdit.isEdited) {
        messageToEdit.originalContent = messageToEdit.content;
        messageToEdit.isEdited = true;
        messageToEdit.editHistory = [];
      }

      // Add current content to edit history
      messageToEdit.editHistory.push({
        content: messageToEdit.content,
        editedAt: new Date(),
      });

      // Update content
      messageToEdit.content = options.newContent;
      
      await messageToEdit.save();
      
      // Update chat timestamp
      await this.updateChatTimestamp(messageToEdit.chatId.toString());
      
      return messageToEdit.toObject();
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to edit message by position', { error, options });
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
      
      const messageToDelete = await Message.findById(messageId);
      
      if (!messageToDelete) {
        throw new NotFoundError('Message not found');
      }

      // Verify the user owns this chat
      const chat = await Chat.findById(messageToDelete.chatId);
      if (!chat || chat.userId !== userId) {
        throw new NotFoundError('Message not found or access denied');
      }

      // Delete all messages created after this message
      await Message.deleteMany({
        chatId: messageToDelete.chatId,
        createdAt: { $gt: messageToDelete.createdAt }
      });

      // Update chat timestamp
      await this.updateChatTimestamp(messageToDelete.chatId.toString());
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
        .lean<MessageType[]>();
      
      return messages;
    } catch (error) {
      throw new DatabaseError('Failed to fetch chat messages', { error, chatId });
    }
  }
}

export const chatService = new ChatService(); 