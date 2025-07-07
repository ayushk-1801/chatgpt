import React from 'react';
import { cn } from '@/lib/utils';
import { MarkdownMessage } from './markdown-message';

interface MessageFormatterProps {
  content: string;
  className?: string;
}

export const MessageFormatter: React.FC<MessageFormatterProps> = ({ 
  content, 
  className 
}) => {
  return (
    <div className={cn("text-foreground max-w-none", className)}>
      <MarkdownMessage content={content} />
    </div>
  );
}; 