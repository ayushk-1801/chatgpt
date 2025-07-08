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
  // Get all user chats
  getAllChats = withErrorHandling(async (req: NextRequest) => {
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

  // Handle chat completion
  handleChatCompletion = withErrorHandling(async (req: NextRequest) => {
    const userId = await requireAuth();
    const body = await req.json();
    const { messages, chatId, model } = validateChatRequest(body);

    if (!chatId) {
      throw new ValidationError(ERROR_MESSAGES.CHAT_ID_REQUIRED);
    }

    // Find or create chat
    const chat = await chatService.findOrCreateChat(chatId, userId);

    // Save the latest user message to database
    const latestUserMessage = messages[messages.length - 1];
    if (latestUserMessage?.role === 'user') {
      await chatService.saveMessage({
        chatId: chat._id,
        role: 'user',
        content: latestUserMessage.content,
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

    // Generate AI response
    const result = await aiService.generateChatCompletion(
      messages,
      systemPrompt,
      model,
      chat._id,
      userId
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