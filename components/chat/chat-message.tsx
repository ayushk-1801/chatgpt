"use client";

import * as React from 'react';
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  Copy,
  ThumbsUp,
  ThumbsDown,
  Edit,
  RefreshCw,
  Check,
  Volume2,
  Pause,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MessageFormatter } from '@/components/ui/message-formatter';
import { type Message } from '@ai-sdk/react';
import Image from 'next/image';

interface Attachment {
  url: string;
  name?: string;
  contentType?: string;
}

// Define a more specific type for message ratings
type MessageRating = 'good' | 'bad' | null;

interface ChatMessageProps {
  message: Message;
  isLastMessage: boolean;
  onRate: (rating: 'good' | 'bad') => void;
  onCopy: () => void;
  onEdit: () => void;
  onRegenerate: () => void;
  rating: MessageRating;
  isCopied: boolean;
}

export function ChatMessage({
  message,
  isLastMessage,
  onRate,
  onCopy,
  onEdit,
  onRegenerate,
  rating,
  isCopied,
}: ChatMessageProps) {
  const { role, content, toolInvocations, attachments } = message as Message & { attachments?: Attachment[] };
  const isAssistant = role === 'assistant';
  const isUser = role === 'user';
  const [isPlaying, setIsPlaying] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Effect to clean up on unmount
  React.useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src); // Revoke the object URL to avoid memory leaks
        audioRef.current = null;
      }
    };
  }, []);

  const handleReadAloud = async () => {
    // If audio is currently playing, pause it.
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    // If we have a cached audio element, just play it.
    if (audioRef.current) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Failed to play cached audio:', error);
        setIsPlaying(false);
      }
      return;
    }

    // If no audio element, it's the first play. Fetch, create, and play.
    setIsPlaying(true);
    try {
      const response = await fetch('/api/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch speech: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
      };
      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        setIsPlaying(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };

      await audio.play();
    } catch (error) {
      console.error('Error fetching or playing speech:', error);
      setIsPlaying(false);
    }
  };

  const renderAttachments = () => {
    if (!attachments || attachments.length === 0) {
      return null;
    }

    return attachments
      .filter((attachment: Attachment) => attachment.contentType?.startsWith('image/'))
      .map((attachment: Attachment, index: number) => (
        <div key={`${message.id}-${index}`} className="mb-2">
          <Image
            src={attachment.url}
            width={300}
            height={300}
            alt={attachment.name ?? `attachment-${index}`}
            className="rounded-sm max-w-xs object-contain"
          />
        </div>
      ));
  };

  const renderToolInvocations = () => {
    if (!toolInvocations || toolInvocations.length === 0) {
      return null;
    }

    // TODO: Revisit typing for tool invocations
    return toolInvocations.map((toolInvocation: any) => {
      const { toolName, result } = toolInvocation;

      if (toolName === 'generateImage' && result?.image) {
        return (
          <img
            key={toolInvocation.toolCallId}
            src={`data:image/png;base64,${result.image}`}
            alt={result.prompt}
            className="mb-2 rounded-sm max-w-xs object-contain"
          />
        );
      }
      // Add other tool renderings here if needed
      return null;
    });
  };

  const renderContent = () => (
    <div
      className={`py-3 ${
        isUser
          ? 'px-4 bg-muted/50 dark:bg-neutral-700/40 text-foreground rounded-3xl'
          : 'text-foreground rounded-xl'
      }`}
    >
      <MessageFormatter content={content} className="leading-relaxed" />
    </div>
  );

  const renderAssistantActions = () => (
    <TooltipProvider delayDuration={100}>
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleReadAloud}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              {isPlaying ? <Pause size={16} /> : <Volume2 size={16} />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{isPlaying ? 'Pause' : 'Read aloud'}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onCopy}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              {isCopied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{isCopied ? 'Copied!' : 'Copy message'}</p>
          </TooltipContent>
        </Tooltip>

        {rating !== 'bad' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onRate('good')}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <ThumbsUp size={16} fill={rating === 'good' ? 'currentColor' : 'none'} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p>Good response</p></TooltipContent>
          </Tooltip>
        )}

        {rating !== 'good' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onRate('bad')}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <ThumbsDown size={16} fill={rating === 'bad' ? 'currentColor' : 'none'} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p>Bad response</p></TooltipContent>
          </Tooltip>
        )}
        
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={onRegenerate} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <RefreshCw size={16} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>Regenerate response</p></TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );

  const renderUserActions = () => (
    <TooltipProvider delayDuration={100}>
      <div className="flex items-center justify-end gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={onCopy} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              {isCopied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>{isCopied ? 'Copied!' : 'Copy message'}</p></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <Edit size={16} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>Edit message</p></TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );

  return (
    <div className="group">
      <div className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`flex gap-4 ${isUser ? 'flex-row-reverse max-w-[80%]' : 'flex-row'}`}>
          <div className="flex flex-col">
            {isUser && renderAttachments()}
            {renderToolInvocations()}
            {content && renderContent()}
            {isAssistant && !isLastMessage && renderAssistantActions()}
            {isUser && renderUserActions()}
          </div>
        </div>
      </div>
    </div>
  );
}
