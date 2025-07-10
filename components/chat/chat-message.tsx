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
  X,
  Save,
  Globe,
  File as FileIcon,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { MessageFormatter } from '@/components/ui/message-formatter';
import { type Message } from '@ai-sdk/react';
import Image from 'next/image';
import { MessageAttachment as Attachment } from '@/types';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { mainModels, moreModels } from '@/lib/models';
import { useModel } from '@/hooks/use-model';

// Attachment type is imported from shared types
// Define a more specific type for message ratings
type MessageRating = 'good' | 'bad' | null;

interface ChatMessageProps {
  message: Message;
  isLastMessage: boolean;
  /**
   * Indicates if the chat is currently streaming a response. While a message is still
   * streaming (isLoading === true) we usually hide the action buttons for the in-flight
   * assistant message to avoid user interaction with incomplete content. Once
   * streaming is finished (isLoading === false) we want the action buttons visible.
   */
  isLoading: boolean;
  onRate: (rating: 'good' | 'bad') => void;
  onCopy: () => void;
  onEdit: (newContent: string) => void;
  onRegenerate: (toolChoice?: string) => void;
  rating: MessageRating;
  isCopied: boolean;
}

export function ChatMessage({
  message,
  isLastMessage,
  isLoading,
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
  const { selectedModel, setSelectedModel } = useModel();
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editContent, setEditContent] = React.useState(content);
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

  // Reset edit content when message content changes
  React.useEffect(() => {
    setEditContent(content);
  }, [content]);

  const handleEditStart = () => {
    setIsEditing(true);
    setEditContent(content);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditContent(content);
  };

  const handleEditSave = () => {
    if (editContent.trim() && editContent !== content) {
      onEdit(editContent.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleEditSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleEditCancel();
    }
  };

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

    return attachments.map((attachment: Attachment, index: number) => {
      const key = `${message.id}-${index}`;

      // Image preview
      if (attachment.contentType?.startsWith('image/') && attachment.url) {
        return (
          <div key={key} className="mb-2">
            <Image
              src={attachment.url}
              width={300}
              height={300}
              alt={attachment.name ?? `attachment-${index}`}
              className="rounded-sm max-w-xs object-contain"
            />
          </div>
        );
      }

      // PDF preview – replicate prompt box style
      if (attachment.contentType?.startsWith('application/pdf')) {
        return (
          <div key={key} className="mb-2 flex items-center gap-2 p-2 rounded-md bg-muted/20 dark:bg-neutral-800/30 w-fit">
            {attachment.url ? (
              <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <FileIcon className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm truncate max-w-[200px]">{attachment.name || 'document.pdf'}</span>
              </a>
            ) : (
              <div className="flex items-center gap-2">
                <FileIcon className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm truncate max-w-[200px]">{attachment.name || 'document.pdf'}</span>
              </div>
            )}
          </div>
        );
      }

      // Fallback – ignore unsupported types for now
      return null;
    });
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

      if (toolName === 'web_search' && result?.results) {
        return (
          <div
            key={toolInvocation.toolCallId}
            className="mb-2 rounded-md border p-3 bg-muted/30 dark:bg-neutral-800/40 text-sm space-y-2"
          >
            <p className="font-medium text-muted-foreground">Web results:</p>
            <ul className="list-disc pl-4 space-y-1">
              {result.results.slice(0, 5).map((item: any, idx: number) => (
                <li key={idx}>
                  <a
                    href={item.url || item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-blue-600 dark:text-blue-400"
                  >
                    {item.title || item.url}
                  </a>
                  {item.snippet && <p className="text-xs text-muted-foreground">{item.snippet}</p>}
                </li>
              ))}
            </ul>
          </div>
        );
      }

      if (toolName === 'web_search' && (!result || !result.results)) {
        return (
          <div
            key={toolInvocation.toolCallId}
            className="mb-2 rounded-md border p-3 bg-muted/20 dark:bg-neutral-800/20 text-sm flex items-center gap-2"
          >
            <svg
              className="animate-spin h-4 w-4 text-muted-foreground"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4zm2 5.292l2 2V18a6 6 0 106-6h-2a4 4 0 11-4 4v1.292z"
              ></path>
            </svg>
            <span>Searching the web...</span>
          </div>
        );
      }
      // Add other tool renderings here if needed
      return null;
    });
  };

  const renderContent = () => {
    if (isEditing && isUser) {
      return (
        <div className="w-full py-3">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full min-h-[100px] resize-none bg-muted/50 border border-border rounded-lg p-3 text-foreground"
            placeholder="Edit your message..."
            autoFocus
          />
          <div className="flex items-center justify-end gap-2 mt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleEditCancel}
              className="flex items-center gap-1"
            >
              <X size={14} />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleEditSave}
              disabled={!editContent.trim() || editContent === content}
              className="flex items-center gap-1"
            >
              <Save size={14} />
              Save & Regenerate
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Ctrl+Enter to save, Esc to cancel
          </p>
        </div>
      );
    }

    return (
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
  };

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
        
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <RefreshCw size={16} />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p>Regenerate response</p></TooltipContent>
          </Tooltip>
          <DropdownMenuContent
            align="start"
            className="w-64 rounded-xl bg-white dark:bg-[#303030] p-2 shadow-2xl border-none"
          >
            <DropdownMenuLabel className="text-neutral-500 dark:text-neutral-400 px-2 py-1.5 text-sm font-medium cursor-default">Switch model</DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1 bg-border" />
            {mainModels.map((model) => (
              <DropdownMenuItem
                key={model.model}
                className={`rounded-md p-2 cursor-pointer transition-colors flex items-start justify-between gap-2 ${selectedModel === model.model ? 'bg-neutral-100 dark:bg-[#515151]' : 'hover:bg-neutral-100 dark:hover:bg-[#515151]'}`}
                onClick={() => {
                  if (model.model !== selectedModel) {
                    setSelectedModel(model.model);
                  }
                  onRegenerate();
                }}
              >
                <div>
                  <div className="font-medium text-sm">{model.displayName}</div>
                  <div className="text-xs text-neutral-600 dark:text-neutral-400">
                    {model.description}
                  </div>
                </div>
                {selectedModel === model.model && <Check size={14} />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="rounded-md hover:bg-neutral-100 dark:hover:bg-[#515151] p-2 cursor-pointer transition-colors">
                <span className="font-medium text-sm">More models</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-64 rounded-xl bg-white dark:bg-[#303030] p-2 shadow-2xl border-none">
                {moreModels.map((model) => (
                  <DropdownMenuItem
                    key={model.model}
                    className={`rounded-md p-2 cursor-pointer transition-colors flex items-start justify-between gap-2 ${selectedModel === model.model ? 'bg-neutral-100 dark:bg-[#515151]' : 'hover:bg-neutral-100 dark:hover:bg-[#515151]'}`}
                    onClick={() => {
                      if (model.model !== selectedModel) {
                        setSelectedModel(model.model);
                      }
                      onRegenerate();
                    }}
                  >
                    <div>
                      <div className="font-medium text-sm">{model.displayName}</div>
                      <div className="text-xs text-neutral-600 dark:text-neutral-400">
                        {model.description}
                      </div>
                    </div>
                    {selectedModel === model.model && <Check size={14} />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator className="my-1 bg-border" />
            <DropdownMenuItem
              className="rounded-md hover:bg-neutral-100 dark:hover:bg-[#515151] p-2 cursor-pointer transition-colors text-sm"
              onClick={() => onRegenerate()}
            >
              Try again
            </DropdownMenuItem>
            <DropdownMenuItem
              className="rounded-md hover:bg-neutral-100 dark:hover:bg-[#515151] p-2 cursor-pointer transition-colors text-sm flex items-center gap-2"
              onClick={() => onRegenerate('web_search')}
            >
              <Globe size={14} />
              <span>Search the web</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );

  const renderUserActions = () => (
    <TooltipProvider delayDuration={100}>
      <div className="flex items-center justify-end gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isEditing && (
          <>
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
                <button onClick={handleEditStart} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <Edit size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Edit message</p></TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </TooltipProvider>
  );

  return (
    <div className="group">
      <div className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'} ${isEditing && isUser ? 'w-full' : isUser ? 'max-w-[80%]' : ''}`}>
          <div className={`flex flex-col ${isEditing && isUser ? 'w-full' : ''}`}>
            {isUser && renderAttachments()}
            {renderToolInvocations()}
            {content && renderContent()}
            {/*
              Show assistant action buttons when:
              1. The message is not the last one (historical messages)
              2. OR it is the last one **and** the assistant has finished streaming (isLoading === false)
            */}
            {isAssistant && (!isLastMessage || !isLoading) && renderAssistantActions()}
            {isUser && renderUserActions()}
          </div>
        </div>
      </div>
    </div>
  );
}
