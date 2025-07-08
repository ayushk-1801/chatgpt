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
    userId?: string
  ) {
    try {
      const coreMessages: CoreMessage[] = await Promise.all(
        messages.map(async (message): Promise<CoreMessage> => {
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
      const latestUserMessage = messages[messages.length - 1];

      const result = streamText({
        model: openai(model),
        messages: messagesWithSystem,
        tools,
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
      // OpenAI built-in web search tool
      web_search_preview: openai.tools.webSearchPreview({
        searchContextSize: 'high',
      }),
    } as const;
  }
}

export const aiService = new AIService(); 