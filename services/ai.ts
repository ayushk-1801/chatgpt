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
  GenerateImageOptions,
  MessageAttachment 
} from '@/types';
import { AI_MODELS, DEFAULTS, IMAGE_GENERATION } from '@/lib/constants';

// MessageAttachment type re-used for runtime checks (importing from shared types)

// Helper to convert Attachment (File or remote URL) to Buffer for AI SDK
async function attachmentToBuffer(attachment: MessageAttachment): Promise<Buffer | null> {
  try {
    // If the attachment includes a buffer() function (File from FormData)
    const potentialBufferFn = (attachment as unknown as { buffer?: () => Promise<ArrayBuffer> }).buffer;
    if (typeof potentialBufferFn === 'function') {
      const arr = await potentialBufferFn.call(attachment);
      return Buffer.from(arr);
    }

    // Fallback to fetch the file from its URL
    if (attachment.url) {
      const res = await fetch(attachment.url);
      if (!res.ok) return null;
      const arr = await res.arrayBuffer();
      return Buffer.from(arr);
    }
  } catch (err) {
    console.warn('Failed to fetch attachment buffer', err);
  }
  return null;
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
          if (message.role === 'user' && message.attachments && message.attachments.length > 0) {
            const content: (
              | { type: 'text'; text: string }
              | { type: 'image'; image: Buffer | URL | string }
              | { type: 'file'; data: Buffer; mimeType: string }
            )[] = [{ type: 'text', text: message.content }];

            // Iterate over each attachment and push appropriate content blocks
            for (const attachment of message.attachments as MessageAttachment[]) {
              if (!attachment.contentType) continue;

              // Handle images
              if (attachment.contentType.startsWith('image/')) {
                const imgData = await attachmentToBuffer(attachment);
                if (imgData) {
                  content.push({ type: 'image', image: imgData });
                }
              }

              // Handle PDFs
              if (attachment.contentType === 'application/pdf') {
                const pdfData = await attachmentToBuffer(attachment);
                if (pdfData) {
                  content.push({ type: 'file', data: pdfData, mimeType: 'application/pdf' });
                }
              }
            }

            return {
              role: 'user',
              content,
            };
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
      } else if (toolChoice === 'writeCode') {
        finalSystemPrompt +=
          '\nYou are an expert software developer. Focus on writing clean, efficient, and well-documented code. ' +
          'Use the writeCode tool to structure your response and provide detailed explanations.';
      } else if (toolChoice === 'deepResearch') {
        finalSystemPrompt +=
          '\nYou are a research specialist. Conduct thorough analysis and provide comprehensive insights. ' +
          'Use the deepResearch tool to structure your research approach and findings.';
      } else if (toolChoice === 'generateImage') {
        finalSystemPrompt +=
          '\nYou can generate images using the generateImage tool. When requested, create detailed and creative prompts for image generation.';
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
                model: 'gpt-4o-mini-responses',
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
        // Determine if reasoningEffort should be set
        const reasoningModels = ['o3', 'o3-mini', 'o4', 'o4-mini'];
        const providerOptions = reasoningModels.some((m) => model.startsWith(m))
          ? { openai: { reasoningEffort: 'low' as const } }
          : undefined;

        result = streamText({
          model: openai(model),
          messages: messagesWithSystem,
          tools,
          toolChoice:
            toolChoice === 'generateImage' || 
            toolChoice === 'writeCode' || 
            toolChoice === 'deepResearch'
              ? { type: 'tool', toolName: toolChoice }
              : undefined,
          maxTokens: config.ai.openai.maxTokens,
          temperature: config.ai.openai.temperature,
          providerOptions,
          onFinish: async (result: { text: string }) => {
            if (chatId && result.text && result.text.trim() !== '') {
              const { chatService } = await import('./chat');
              await chatService.saveMessage({
                chatId,
                role: 'assistant',
                content: result.text,
                model: model,
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

      // Attempt to upload the generated image to Cloudinary so we can persist a lightweight URL
      let cloudinaryUrl: string | null = null;
      try {
        const { default: cloudinary } = await import('@/lib/cloudinary');
        const uploadResult = await cloudinary.uploader.upload(dataUrl, {
          resource_type: 'image',
          folder: 'chatgpt-generated',
        });
        cloudinaryUrl = uploadResult.secure_url;
      } catch (uploadErr) {
        console.warn('Failed to upload generated image to Cloudinary, falling back to data URL:', uploadErr);
      }

      // Save image as separate assistant message for persistence. Prefer Cloudinary URL, fall back to data URL.
      if (options.chatId) {
        const { chatService } = await import('./chat');
        await chatService.saveMessage({
          chatId: options.chatId,
          role: 'assistant',
          content: `${IMAGE_GENERATION.PREFIX}${(cloudinaryUrl || dataUrl)}${IMAGE_GENERATION.SUFFIX}`,
          model: IMAGE_GENERATION.MODEL_NAME,
        });
        
        await chatService.updateChatTimestamp(options.chatId);
      }

      // Keep returning base64 so the client can instantly preview the image while streaming
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
      writeCode: tool({
        description: 'Write, review, or debug code in various programming languages',
        parameters: z.object({
          language: z.string().describe('The programming language (e.g., javascript, python, typescript)'),
          task: z.string().describe('The coding task or problem to solve'),
          code: z.string().optional().describe('Existing code to review or debug (optional)'),
        }),
        execute: async ({ language, task, code }) => {
          // This tool enhances the system prompt for coding tasks
          return {
            language: language || 'javascript',
            task: task || 'general coding',
            code: code || '',
            guidance: `I'll help you with ${task || 'coding'} in ${language || 'javascript'}. ${code ? 'I\'ll review and improve the provided code.' : 'I\'ll write clean, well-documented code for you.'}`
          };
        },
      }),
      deepResearch: tool({
        description: 'Conduct comprehensive research on a topic using advanced analysis',
        parameters: z.object({
          topic: z.string().describe('The research topic or question'),
          depth: z.enum(['basic', 'detailed', 'comprehensive']).describe('The depth of research required'),
          sources: z.array(z.string()).optional().describe('Specific sources or domains to focus on'),
        }),
        execute: async ({ topic, depth, sources }) => {
          // This tool enhances the system prompt for research tasks
          return {
            topic: topic || 'general research',
            depth: depth || 'basic',
            sources: sources || [],
            guidance: `I'll conduct ${depth || 'basic'} research on "${topic || 'the specified topic'}". ${sources?.length ? `Focusing on: ${sources.join(', ')}` : 'I\'ll analyze multiple perspectives and provide comprehensive insights.'}`
          };
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