import { openai } from '@ai-sdk/openai';
import { 
  streamText, 
  generateText,
  CoreMessage, 
  experimental_generateImage as generateImage, 
  tool 
} from 'ai';
import { z } from 'zod';
import { config } from '@/config';
import { AIServiceError } from '@/lib/errors';
import { 
  AIMessage, 
  ImageGenerationResult, 
  GenerateImageOptions 
} from '@/types';
import { AI_MODELS, DEFAULTS, IMAGE_GENERATION } from '@/lib/constants';

// Define Attachment type locally as it's not exported from ai/react
interface Attachment {
  contentType?: string;
  buffer: () => Promise<ArrayBuffer>;
}

class AIService {
  private readonly defaultModel = config.ai.openai.defaultModel;

  async generateChatCompletion(
    messages: AIMessage[],
    systemPrompt: string = DEFAULTS.SYSTEM_PROMPT,
    model: string = this.defaultModel,
    chatId?: string,
    userId?: string,
    toolChoice?: string // optional specific tool to force
  ) {
    try {
      // Trim messages to fit within the model's context window, if necessary
      const trimmedMessages = this.trimMessagesToFitContext(
        messages,
        systemPrompt,
        model,
        config.ai.openai.maxTokens, // reserve space for completion tokens
      );

      const coreMessages: CoreMessage[] = await Promise.all(
        trimmedMessages.map(async (message: AIMessage): Promise<CoreMessage> => {
          if (message.role === 'user' && message.attachments) {
            const imageAttachments = message.attachments.filter(
              (attachment: Attachment) => attachment.contentType?.startsWith('image/')
            );

            if (imageAttachments.length > 0) {
              const content: (
                | { type: 'text'; text: string }
                | { type: 'image'; image: Buffer | URL | string }
              )[] = [{ type: 'text', text: message.content }];
              
              for (const attachment of imageAttachments) {
                const imageBuffer = Buffer.from(await attachment.buffer());
                content.push({
                  type: 'image',
                  image: imageBuffer,
                });
              }

              return {
                role: 'user',
                content,
              };
            }
          }
          
          const { role, content, toolInvocations } = message;
          return { role, content, toolInvocations } as CoreMessage;
        })
      );

      const messagesWithSystem: CoreMessage[] = [
        { role: 'system', content: systemPrompt },
        ...coreMessages,
      ];

      const tools = this.createAITools(chatId);
      const latestUserMessage = trimmedMessages[trimmedMessages.length - 1];

      // Add explicit instruction for the model when web search is requested
      let finalSystemPrompt = systemPrompt;
      if (toolChoice === 'web_search') {
        finalSystemPrompt +=
          '\nYou have access to an external web search tool called "web_search_preview". ' +
          'Before generating the final answer, you MUST invoke this tool at least once to gather fresh information. ' +
          'After receiving the tool response, craft a comprehensive answer for the user.';
      }

      // Use Responses API when web search tool is requested
      const shouldUseWebSearch = toolChoice === 'web_search';
      
      let result;
      
      if (shouldUseWebSearch) {
        // Use OpenAI Responses API with web search tool
        result = streamText({
          model: openai.responses('gpt-4o-mini'),
          messages: [{ role: 'system', content: finalSystemPrompt }, ...coreMessages],
          tools: {
            web_search_preview: openai.tools.webSearchPreview(),
          },
          maxTokens: config.ai.openai.maxTokens,
          temperature: config.ai.openai.temperature,
          onFinish: async (result: { text: string }) => {
            if (chatId && result.text && result.text.trim() !== '') {
              const { chatService } = await import('./chat');
              await chatService.saveMessage({
                chatId,
                role: 'assistant',
                content: result.text,
                aiModel: 'gpt-4o-mini-responses',
              });
              
              await chatService.updateChatTimestamp(chatId);

              // Save conversation to memory
              if (userId && latestUserMessage?.content) {
                const { memoryService } = await import('./memory');
                await memoryService.addMemories([
                  { id: 'temp-user', role: 'user', content: latestUserMessage.content },
                  { id: 'temp-assistant', role: 'assistant', content: result.text }
                ], userId).catch(error => {
                  console.warn('Failed to save memories:', error);
                });
              }
            }
          },
        });
      } else {
        // Use regular model with tools for non-search requests
        result = streamText({
          model: openai(model),
          messages: messagesWithSystem,
          tools,
          toolChoice:
            toolChoice === 'generateImage'
              ? { type: 'tool', toolName: toolChoice }
              : undefined,
          maxTokens: config.ai.openai.maxTokens,
          temperature: config.ai.openai.temperature,
          onFinish: async (result: { text: string }) => {
            if (chatId && result.text && result.text.trim() !== '') {
              const { chatService } = await import('./chat');
              await chatService.saveMessage({
                chatId,
                role: 'assistant',
                content: result.text,
                aiModel: model,
              });
              
              await chatService.updateChatTimestamp(chatId);

              // Save conversation to memory
              if (userId && latestUserMessage?.content) {
                const { memoryService } = await import('./memory');
                await memoryService.addMemories([
                  { id: 'temp-user', role: 'user', content: latestUserMessage.content },
                  { id: 'temp-assistant', role: 'assistant', content: result.text }
                ], userId).catch(error => {
                  console.warn('Failed to save memories:', error);
                });
              }
            }
          },
        });
      }

      return result;
    } catch (error) {
      throw new AIServiceError('Failed to generate chat completion', { error, model });
    }
  }

  async generateTitle(message: string): Promise<string> {
    try {
      const { text: title } = await generateText({
        model: openai(AI_MODELS.GPT_4O_MINI),
        prompt: `Generate a short, concise title (${DEFAULTS.MAX_TITLE_WORDS} words max) for the following user query: "${message}"`,
        maxTokens: config.api.titleGeneration.maxTokens,
      });

      return title.replace(/"/g, ''); // Remove quotes from the generated title
    } catch (error) {
      throw new AIServiceError('Failed to generate title', { error, message });
    }
  }

  async generateImage(options: GenerateImageOptions): Promise<ImageGenerationResult> {
    try {
      const { image } = await generateImage({
        model: openai.image(AI_MODELS.DALL_E_3),
        prompt: options.prompt,
      });

      const dataUrl = `data:${image.mimeType || IMAGE_GENERATION.DEFAULT_MIME_TYPE};base64,${image.base64}`;
      
      // Save image as separate assistant message for persistence
      if (options.chatId) {
        const { chatService } = await import('./chat');
        await chatService.saveMessage({
          chatId: options.chatId,
          role: 'assistant',
          content: `${IMAGE_GENERATION.PREFIX}${dataUrl}${IMAGE_GENERATION.SUFFIX}`,
          aiModel: IMAGE_GENERATION.MODEL_NAME,
        });
        
        await chatService.updateChatTimestamp(options.chatId);
      }

      return { 
        image: image.base64, 
        prompt: options.prompt 
      };
    } catch (error) {
      throw new AIServiceError('Failed to generate image', { error, options });
    }
  }

  private createAITools(chatId?: string) {
    return {
      generateImage: tool({
        description: 'Generate an image based on a prompt',
        parameters: z.object({
          prompt: z.string().describe('The prompt to generate the image from'),
        }),
        execute: async ({ prompt }: { prompt: string }) => {
          if (!chatId) {
            throw new AIServiceError('Chat ID required for image generation');
          }
          
          return await this.generateImage({ prompt, chatId });
        },
      }),
    } as const;
  }

  /**
   * Estimate token count by assuming ~4 characters per token (rough heuristic).
   */
  private estimateTokenCount(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  /**
   * Return the max context window size (in tokens) for a given model.
   * Defaults to 8192 tokens if the model is unknown.
   */
  private getModelContextWindow(model: string): number {
    const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
      'gpt-3.5-turbo': 16385,
      'gpt-3.5-turbo-16k': 16385,
      'gpt-4': 8192,
      'gpt-4o': 128000,
      'gpt-4o-mini': 8192,
      'gpt-4.1': 8192,
      'gpt-4.1-mini': 8192,
      'gpt-4.1-nano': 4096,
    };

    return MODEL_CONTEXT_WINDOWS[model] || 8192;
  }

  /**
   * Trim historical messages so that the total estimated token count of the
   * system prompt + messages stays within the model's context window (minus
   * reserved tokens for the forthcoming completion).
   */
  private trimMessagesToFitContext(
    messages: AIMessage[],
    systemPrompt: string,
    model: string,
    reservedTokens: number,
  ): AIMessage[] {
    const contextWindow = this.getModelContextWindow(model);
    const maxInputTokens = Math.max(contextWindow - reservedTokens, 0);

    const systemTokens = this.estimateTokenCount(systemPrompt);

    let currentTokens = systemTokens;
    const trimmed: AIMessage[] = [];

    // Add messages from newest to oldest until we exceed the limit
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const msg = messages[i];
      const tokenCount = this.estimateTokenCount(msg.content);

      if (currentTokens + tokenCount > maxInputTokens) {
        break;
      }

      trimmed.unshift(msg); // maintain chronological order
      currentTokens += tokenCount;
    }

    // Ensure at least the latest user message is included
    if (trimmed.length === 0 && messages.length > 0) {
      trimmed.push(messages[messages.length - 1]);
    }

    return trimmed;
  }
}

export const aiService = new AIService(); 