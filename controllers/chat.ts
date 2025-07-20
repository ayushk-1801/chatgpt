import { NextRequest } from 'next/server';
import { chatService } from '@/services/chat';
import { aiService } from '@/services/ai';
import { memoryService } from '@/services/memory';
import { requireAuth } from '@/middleware/auth';
import { createSuccessResponse, withErrorHandling } from '@/middleware/error';
import { validateChatRequest, validateTitleGeneration, validateChatSlug } from '@/lib/validations';
import { ERROR_MESSAGES } from '@/lib/constants';
import { NotFoundError, ValidationError } from '@/lib/errors';

class ChatController {
  // Create a new chat
  createChat = withErrorHandling(async (req: NextRequest) => {
    const userId = await requireAuth();
    const { chatId, initialMessage } = await req.json();

    if (!chatId || !initialMessage) {
      throw new ValidationError('chatId and initialMessage are required.');
    }

    const chat = await chatService.findOrCreateChat(chatId, userId);
    
    if (!chat._id) {
      throw new ValidationError('Failed to create or find chat');
    }
    
    // Do not save the initial user message here.
    // The chat page will append the first user message once the user is redirected,
    // allowing the AI response to be streamed in real-time without duplicating messages.
    
    return createSuccessResponse({ chat });
  });

  // Get all user chats
  getAllChats = withErrorHandling(async () => {
    const userId = await requireAuth();
    const chats = await chatService.getAllUserChats(userId);
    return createSuccessResponse(chats);
  });

  // Get specific chat with messages
  getChatById = withErrorHandling(async (
    req: NextRequest,
    { params }: { params: { slug: string } }
  ) => {
    const userId = await requireAuth();
    const slug = validateChatSlug(params.slug);
    
    const chatDetails = await chatService.getChatWithMessages(slug, userId);
    return createSuccessResponse(chatDetails);
  });

  // Edit a message
  editMessage = withErrorHandling(async (req: NextRequest) => {
    const userId = await requireAuth();
    const { messageId, newContent } = await req.json();

    if (!messageId || !newContent) {
      throw new ValidationError('messageId and newContent are required.');
    }

    const updatedMessage = await chatService.editMessage({
      messageId,
      newContent,
      userId,
    });

    return createSuccessResponse({ message: updatedMessage });
  });

  // Delete messages after a specific message (for regeneration)
  deleteMessagesAfter = withErrorHandling(async (req: NextRequest) => {
    const userId = await requireAuth();
    const { messageId } = await req.json();

    if (!messageId) {
      throw new ValidationError('messageId is required.');
    }

    await chatService.deleteMessagesAfter(messageId, userId);

    return createSuccessResponse({ success: true });
  });

  // Delete an entire chat and its messages
  deleteChat = withErrorHandling(async (
    _req: NextRequest,
    { params }: { params: { slug: string } }
  ) => {
    const userId = await requireAuth();
    const slug = validateChatSlug(params.slug);

    await chatService.deleteChat(slug, userId);

    return createSuccessResponse({ success: true });
  });

  // Handle chat completion
  handleChatCompletion = withErrorHandling(async (req: NextRequest) => {
    const userId = await requireAuth();
    const body = await req.json();
    const { messages, chatId, model, toolChoice, attachments } = validateChatRequest(body);

    if (!chatId) {
      throw new ValidationError(ERROR_MESSAGES.CHAT_ID_REQUIRED);
    }

    // Find or create chat
    const chat = await chatService.findOrCreateChat(chatId, userId);
    
    if (!chat._id) {
      throw new ValidationError('Failed to create or find chat');
    }

    // Save the latest user message to database
    const latestUserMessage = messages[messages.length - 1];
    if (latestUserMessage?.role === 'user') {
      // Convert attachment IDs to the format expected by the Message schema
      const messageAttachments = attachments?.map((attachmentId: string) => ({
        attachmentId: attachmentId
      })) || [];

      await chatService.saveMessage({
        chatId: chat._id.toString(),
        role: 'user',
        content: latestUserMessage.content,
        attachments: messageAttachments,
      });
    }

    // Get relevant memories and build system prompt
    let systemPrompt = 'You are a helpful assistant. Provide clear, concise, and accurate responses.';
    
    if (latestUserMessage?.role === 'user') {
      const memoriesForPrompt = await memoryService.getRelevantMemoriesForPrompt(
        latestUserMessage.content,
        userId
      );
      systemPrompt += memoriesForPrompt;
    }

    // Process attachments for the latest user message
    let processedMessages = messages;
    if (attachments && attachments.length > 0 && latestUserMessage?.role === 'user') {
      // Import MediaAttachment to get attachment details
      const { default: MediaAttachment } = await import('@/lib/models/MediaAttachment');
      
      // Get attachment documents
      const attachmentDocs = await MediaAttachment.find({
        _id: { $in: attachments }
      });

      // Update the latest user message with proper attachment format for AI
      const lastIndex = messages.length - 1;
      processedMessages = [...messages];
      processedMessages[lastIndex] = {
        ...latestUserMessage,
        attachments: attachmentDocs.map(doc => ({
          url: doc.secureUrl,
          name: doc.originalName,
          contentType: doc.mimeType,
        }))
      };
    }

    // Convert messages to AI format
    const aiMessages = processedMessages.map((msg, index) => ({
      id: `msg-${index}`,
      role: msg.role,
      content: msg.content,
      // Preserve attachments (if any) so AI service can process images & PDFs
      attachments: msg.attachments,
      toolInvocations: undefined,
    }));

    // Generate AI response
    const result = await aiService.generateChatCompletion(
      aiMessages,
      systemPrompt,
      model,
      chat._id.toString(),
      userId,
      toolChoice?.name // pass selected tool name if provided
    );

    return result.toDataStreamResponse();
  });

  // Generate chat title
  generateTitle = withErrorHandling(async (req: NextRequest) => {
    const userId = await requireAuth();
    const body = await req.json();
    const { chatId, message } = validateTitleGeneration(body);

    // Verify chat ownership
    const chat = await chatService.getChatWithMessages(chatId, userId);
    if (!chat.chat) {
      throw new NotFoundError(ERROR_MESSAGES.CHAT_NOT_FOUND);
    }

    const title = await aiService.generateTitle(message);
    
    await chatService.updateChatTitle(chatId, userId, title);

    return createSuccessResponse({ title });
  });
}

export const chatController = new ChatController(); 