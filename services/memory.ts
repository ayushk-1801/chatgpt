import { MemoryClient } from 'mem0ai';
import { config } from '@/config';
import { MemoryServiceError } from '@/lib/errors';
import { MemoryEntry, MemorySearchOptions, AIMessage } from '@/types';

// Minimal message structure accepted by mem0
type MemoryClientMessage = {
  role: 'user' | 'assistant';
  content: string;
};

class MemoryService {
  private memory: MemoryClient;

  constructor() {
    this.memory = new MemoryClient({
      apiKey: config.ai.memory.apiKey,
    });
  }

  async searchMemories(query: string, options: MemorySearchOptions): Promise<MemoryEntry[]> {
    try {
      const searchOptions = {
        user_id: options.userId,
        limit: options.limit || config.ai.memory.searchLimit,
      };

      const relevantMemories = await this.memory.search(query, searchOptions) as unknown as MemoryEntry[];
      
      return relevantMemories || [];
    } catch (error) {
      throw new MemoryServiceError('Failed to search memories', { error, query, options });
    }
  }

  async addMemories(messages: AIMessage[], userId: string): Promise<void> {
    try {
      const formatted: MemoryClientMessage[] = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      if (formatted.length === 0) return;

      await this.memory.add(formatted, { user_id: userId });
    } catch (error) {
      throw new MemoryServiceError('Failed to add memories', { error, userId });
    }
  }

  async formatMemoriesForPrompt(memories: MemoryEntry[]): Promise<string> {
    if (!memories || memories.length === 0) {
      return '';
    }

    const memoriesStr = memories
      .map(entry => `- ${entry.memory}`)
      .join('\n');
    
    return `\n\nHere are some relevant memories about the user:\n${memoriesStr}`;
  }

  async getRelevantMemoriesForPrompt(query: string, userId: string): Promise<string> {
    try {
      const memories = await this.searchMemories(query, { userId });
      return await this.formatMemoriesForPrompt(memories);
    } catch (error) {
      // Don't throw error for memory failures - just log and continue without memories
      console.warn('Memory search failed, continuing without memories:', error);
      return '';
    }
  }
}

export const memoryService = new MemoryService(); 