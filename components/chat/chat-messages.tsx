"use client";

import React, { useRef, useEffect } from 'react';
import { type Message } from '@ai-sdk/react';
import { ChatMessage } from './chat-message';

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean; // For the typing indicator
  isHistoryLoading: boolean; // For the initial load
  onRate: (messageId: string, rating: 'good' | 'bad') => void;
  onCopy: (messageId: string, content: string) => void;
  onEdit: (messageIndex: number) => void;
  onRegenerate: (messageIndex: number) => void;
  ratings: Record<string, 'good' | 'bad'>;
  copiedMessageId: string | null;
}

export function ChatMessages({
  messages,
  isLoading,
  isHistoryLoading,
  onRate,
  onCopy,
  onEdit,
  onRegenerate,
  ratings,
  copiedMessageId,
}: ChatMessagesProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex-1 overflow-hidden">
      <div
        ref={scrollAreaRef}
        className="h-full px-4 scrollbar-hide overflow-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div
          className="max-w-3xl mx-auto py-4 space-y-6 pb-32 mb-20"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {isHistoryLoading ? (
            <div className="text-center py-8">
              <div className="w-5 h-5 bg-muted-foreground rounded-full animate-pulse mx-auto"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Start a new conversation.
            </div>
          ) : (
            messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                isLastMessage={index === messages.length - 1}
                isLoading={isLoading}
                onRate={(rating) => onRate(message.id, rating)}
                onCopy={() => onCopy(message.id, message.content)}
                onEdit={() => onEdit(index)}
                onRegenerate={() => onRegenerate(index)}
                rating={ratings[message.id] || null}
                isCopied={copiedMessageId === message.id}
              />
            ))
          )}
          {isLoading && (
            <div className="flex gap-4 justify-start">
                <div className="w-3 h-3 bg-muted-foreground rounded-full animate-pulse"></div>
            </div>
           )}
        </div>
      </div>
    </div>
  );
}
