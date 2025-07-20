"use client";

import { useState, useEffect } from 'react';
import { type Message } from '@ai-sdk/react';

interface DatabaseMessage {
  _id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  model?: string;
  attachments?: {
    url?: string;
    name?: string;
    contentType?: string;
  }[];
}

// In-memory cache to avoid hitting the API repeatedly for the same chat
const chatMemoryCache: Record<string, Message[]> = {};

const getCachedMessages = (slug: string): Message[] | null => {
  return chatMemoryCache[slug] ?? null;
};

const setCachedMessages = (slug: string, messages: Message[]) => {
  chatMemoryCache[slug] = messages;
};

export function useChatHistory(slug: string, setMessages: (messages: Message[]) => void) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let didCancel = false;

    const loadChatHistory = async () => {
      setIsLoading(true);
      setError(null);

      const cached = getCachedMessages(slug);
      if (cached && cached.length > 0) {
        setMessages(cached);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/chats/${slug}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch chat: ${response.statusText}`);
        }
        
        const result = await response.json();
        if (!result.success || !result.data || !result.data.messages) {
          throw new Error('Invalid API response format');
        }

        const uiMessages = result.data.messages.map((msg: DatabaseMessage) => ({
          id: msg._id,
          role: msg.role,
          content: msg.content,
          createdAt: new Date(msg.createdAt),
          model: msg.model,
          attachments: msg.attachments || [],
        }));

        if (!didCancel) {
          setMessages(uiMessages);
          setCachedMessages(slug, uiMessages);
        }
      } catch (e) {
        if (!didCancel) {
          setError(e instanceof Error ? e : new Error('An unknown error occurred'));
        }
      } finally {
        if (!didCancel) {
          setIsLoading(false);
        }
      }
    };

    if (slug) {
      loadChatHistory();
    }

    return () => {
      didCancel = true;
    };
  }, [slug, setMessages]);
  
  // Expose a function to update the cache externally
  const updateCachedMessages = (messages: Message[]) => {
    setCachedMessages(slug, messages);
  };

  return { isLoading, error, updateCachedMessages };
}
