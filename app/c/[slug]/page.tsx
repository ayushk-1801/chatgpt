"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useChat } from "@ai-sdk/react";
import { PromptBox } from "@/components/ui/chatgpt-prompt-input";
import { MessageFormatter } from "@/components/ui/message-formatter";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Copy, ThumbsUp, ThumbsDown, Volume2, Edit, RefreshCw, Download, FileText, Check } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useModel } from "@/hooks/use-model";
import { v4 as uuidv4 } from 'uuid';

interface DatabaseMessage {
  _id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  model?: string;
}

interface FilePreview {
  url: string;
  type: string;
  name: string;
  uploadStatus: 'uploading' | 'success' | 'error';
  publicUrl?: string;
}

export default function ChatPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { selectedModel } = useModel();
  const initialMessageRef = useRef<string | null>(null);

  const {
    messages,
    input,
    handleInputChange,
    isLoading,
    error,
    setMessages,
    append,
    setInput,
  } = useChat({
    id: slug, // Use slug as chat ID for persistence
    body: {
      chatId: slug, // Pass chatId to the API
      model: selectedModel,
    },
    onFinish: async () => {
      if (initialMessageRef.current) {
        try {
          await fetch('/api/chats/title', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: slug, message: initialMessageRef.current }),
          });
          window.dispatchEvent(new CustomEvent('chat-title-updated'));
        } catch (error) {
          console.error("Failed to generate chat title:", error);
        } finally {
          initialMessageRef.current = null; // Clear after use
        }
      }
    },
  });

  // --- Chat message cache utility ---
  type ChatMessage = typeof messages extends Array<infer T> ? T : never;
  const chatMemoryCache: Record<string, ChatMessage[]> = {};

  const getCachedMessages = (slug: string): ChatMessage[] | null => {
    // Only use in-memory cache to avoid localStorage quota issues
    return chatMemoryCache[slug] ?? null;
  };

  const setCachedMessages = (slug: string, messages: ChatMessage[]) => {
    // Store messages only in the in-memory cache
    chatMemoryCache[slug] = messages;
  };
  // --- End cache utility ---

  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [messageRatings, setMessageRatings] = useState<Record<string, 'good' | 'bad'>>({});
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Branching conversation state
  const [branches, setBranches] = useState<ChatMessage[][]>([]);
  const [activeBranchIndex, setActiveBranchIndex] = useState(0);
  const [branchPivot, setBranchPivot] = useState<number | null>(null);

  // Track inline editing
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  // Load existing messages when the page loads
  useEffect(() => {
    let didCancel = false;
    const loadChatHistory = async () => {
      // Try cache first
      const cached = getCachedMessages(slug);
      if (cached && cached.length > 0) {
        setMessages(cached);
        setIsLoadingHistory(false);
        // Initialize branches on first load
        setBranches([cached]);
        return;
      }
      try {
        const response = await fetch(`/api/chats/${slug}`);
        if (response.ok) {
          const data = await response.json();
          // Convert database messages to UI messages format
          const uiMessages = data.messages.map((msg: DatabaseMessage) => ({
            id: msg._id,
            role: msg.role,
            content: msg.content,
            createdAt: new Date(msg.createdAt),
            model: msg.model,
          }));
          if (!didCancel) {
            setMessages(uiMessages);
            setCachedMessages(slug, uiMessages);
            // Initialize branches on first load
            setBranches([uiMessages]);
          }
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
      } finally {
        if (!didCancel) setIsLoadingHistory(false);
      }
    };
    loadChatHistory();
    return () => { didCancel = true; };
  }, [slug, setMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle initial message from sessionStorage
  useEffect(() => {
    const initialMessage = sessionStorage.getItem("initialMessage");
    if (initialMessage && messages.length === 0 && !isLoadingHistory) {
      sessionStorage.removeItem("initialMessage");
      initialMessageRef.current = initialMessage;

      // Auto-submit the initial message
      append({
        content: initialMessage,
        role: 'user',
      });
    }
  }, [messages.length, isLoadingHistory, append, slug]);

  // Update cache whenever messages change (and not loading history)
  useEffect(() => {
    if (!isLoadingHistory && messages.length > 0) {
      setCachedMessages(slug, messages);
    }
  }, [messages, isLoadingHistory, slug]);

  // Keep active branch array in sync with messages
  useEffect(() => {
    setBranches(prev => {
      const copy = [...prev];
      copy[activeBranchIndex] = messages;
      return copy;
    });
  }, [messages]);

  const handleFileChange = async (file: File) => {
    const localUrl = URL.createObjectURL(file);
    
    // Set initial preview state
    setFilePreview({ 
      url: localUrl, 
      type: file.type, 
      name: file.name,
      uploadStatus: 'uploading' 
    });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'File upload failed');
      }

      setFilePreview(prev => prev ? {
        ...prev,
        uploadStatus: 'success',
        publicUrl: result.url,
      } : null);

    } catch (err) {
      console.error("Upload error:", err);
      setFilePreview(prev => prev ? {
        ...prev,
        uploadStatus: 'error',
      } : null);
    }
  };

  const handleRemoveFile = () => {
    if (filePreview) {
      // Revoke the local URL to free up memory
      if (filePreview.url.startsWith('blob:')) {
          URL.revokeObjectURL(filePreview.url);
      }
      setFilePreview(null);
    }
  };

  const handleCopyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      // Reset the copied state after 2 seconds
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  const handleRateMessage = (messageId: string, rating: 'good' | 'bad') => {
    setMessageRatings(prev => ({
      ...prev,
      [messageId]: rating
    }));
  };

  const handleEditUserMessage = (messageIndex: number) => {
    const msg = messages[messageIndex];
    if (!msg || msg.role !== 'user') return;

    // Start inline editing
    setEditingIndex(messageIndex);
    setEditingText(typeof msg.content === 'string' ? msg.content : '');
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditingText('');
  };

  const saveEditedMessage = async () => {
    if (editingIndex === null) return;
    const base = messages.slice(0, editingIndex); // messages before the edited message
    const newUserMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: editingText,
      createdAt: new Date(),
    } as ChatMessage;

    const newBranch = [...base, newUserMessage];

    // Create new branch and switch to it
    setBranchPivot(editingIndex);
    setBranches(prev => [...prev, newBranch]);
    const newBranchIndex = branches.length; // index of the branch we're adding
    setActiveBranchIndex(newBranchIndex);
    setMessages(newBranch);
    setCachedMessages(slug, newBranch);

    // Send new user message to backend to generate assistant response
    await append({
      content: editingText,
      role: 'user',
    });

    setEditingIndex(null);
    setEditingText('');
  };

  const handleRegenerateAssistant = async (assistantIndex: number) => {
    const msg = messages[assistantIndex];
    if (!msg || msg.role !== 'assistant') return;

    const kept = messages.slice(0, assistantIndex); // exclude assistant message to regenerate

    // Branch point is the user message just before assistantIndex
    const pivot = assistantIndex - 1;
    setBranchPivot(pivot);

    setBranches(prev => [...prev, kept]);
    const newBranchIndex = branches.length;
    setActiveBranchIndex(newBranchIndex);
    setMessages(kept);
    setCachedMessages(slug, kept);

    const lastUserMessage = kept[kept.length - 1];
    if (lastUserMessage && lastUserMessage.role === 'user') {
      await append({
        content: typeof lastUserMessage.content === 'string' ? lastUserMessage.content : '',
        role: 'user',
      });
    }
  };

  const switchBranch = (direction: 'prev' | 'next') => {
    if (branchPivot === null) return;
    const total = branches.length;
    if (direction === 'prev' && activeBranchIndex > 0) {
      const idx = activeBranchIndex - 1;
      setActiveBranchIndex(idx);
      setMessages(branches[idx]);
    }
    if (direction === 'next' && activeBranchIndex < total - 1) {
      const idx = activeBranchIndex + 1;
      setActiveBranchIndex(idx);
      setMessages(branches[idx]);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !(filePreview && filePreview.uploadStatus === 'success')) return;

    let messageContent = input;

    if (filePreview && filePreview.uploadStatus === 'success' && filePreview.publicUrl) {
      if (filePreview.type.startsWith('image/')) {
        messageContent = `[image:${filePreview.publicUrl}]${input}`;
      } else {
        messageContent = `[file:${filePreview.publicUrl},name:${filePreview.name},type:${filePreview.type}]${input}`;
      }
    }

    if (messageContent.trim()) {
      await append({
        content: messageContent,
        role: 'user',
      });
    }

    setInput('');
    handleRemoveFile();
  };

  // Rendering for message editing textarea inside message bubble
  const renderEditingArea = () => {
    return (
      <div className="flex flex-col gap-2 w-full p-3">
        <textarea
          className="w-full rounded-md p-2 resize-none focus:outline-none"
          value={editingText}
          onChange={e => setEditingText(e.target.value)}
        />
        <div className="flex gap-2 ml-auto">
          <button
            type="button"
            className="px-3 py-2 rounded-full bg-muted hover:bg-muted/70 text-sm"
            onClick={cancelEditing}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded-full bg-primary text-primary-foreground text-sm"
            onClick={saveEditedMessage}
          >
            Send
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-background dark:bg-[#212121] text-foreground overflow-hidden">
      <div className="flex-1 flex flex-col w-full mx-auto w-full relative">
        {/* Messages Area - Scrollable with fixed height */}
        <div className="flex-1 overflow-hidden">
          <div
            ref={scrollAreaRef}
            className="h-full px-4 scrollbar-hide overflow-auto"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            <div
              className="max-w-3xl mx-auto py-4 space-y-6 pb-32 mb-20"
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              {isLoadingHistory ? (
                <div className="text-center py-8">
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8"></div>
              ) : (
                messages.map((message, index) => {
                  const imageRegex = /\[image:(.*?)\]([\s\S]*)/;
                  const fileRegex = /\[file:(.*?),name:(.*?),type:(.*?)\]([\s\S]*)/;

                  let imageUrl: string | null = null;
                  let fileInfo: { url: string; name: string; type: string } | null = null;
                  let messageText: string = message.content;

                  {
                    const imageMatch = message.content.match(imageRegex);
                    const fileMatch = message.content.match(fileRegex);

                    if (imageMatch) {
                      imageUrl = imageMatch[1];
                      messageText = imageMatch[2];
                    } else if (fileMatch) {
                      fileInfo = { url: fileMatch[1], name: fileMatch[2], type: fileMatch[3] };
                      messageText = fileMatch[4];
                    }
                  }

                  const hasAttachment = imageUrl || fileInfo;

                  // Render content from tool invocations (images, web search, etc.)
                  const toolElements = Array.isArray((message as any).toolInvocations)
                    ? (message as any).toolInvocations
                        .map((ti: any) => {
                          if (ti.toolName === 'generateImage') {
                            if (ti.state === 'result') {
                              return (
                                <img
                                  key={ti.toolCallId}
                                  src={`data:image/png;base64,${ti.result.image}`}
                                  alt={ti.result.prompt}
                                  className="mb-2 rounded-sm max-w-xs object-contain"
                                />
                              );
                            }
                            return (
                              <div key={ti.toolCallId} className="mb-2 animate-pulse text-muted-foreground">
                                Generating image...
                              </div>
                            );
                          }

                          if (ti.toolName === 'web_search_preview') {
                            if (ti.state === 'result') {
                              // Vercel AI SDK returns `sources` array; fall back to `results` for legacy shape
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              const sources = (ti.result.sources || ti.result.results || []) as Array<any>;

                              return (
                                <div key={ti.toolCallId} className="mb-2 flex flex-wrap gap-2 max-w-xl">
                                  {sources.map((src, idx) => {
                                    // Determine URL field – different shapes are possible
                                    const rawUrl: string = src.url || src.link || src;
                                    let domain = rawUrl;
                                    try {
                                      const hostname = new URL(rawUrl).hostname;
                                      domain = hostname.replace(/^www\./, '');
                                    } catch {
                                      // If URL parsing fails, just show as-is (unlikely)
                                    }

                                    return (
                                      <a
                                        key={`${domain}-${idx}`}
                                        href={rawUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-muted/60 hover:bg-muted rounded-full px-3 py-1 text-sm text-muted-foreground"
                                      >
                                        {domain}
                                      </a>
                                    );
                                  })}
                                </div>
                              );
                            }
                            return (
                              <div key={ti.toolCallId} className="mb-2 animate-pulse text-muted-foreground">
                                Searching the web...
                              </div>
                            );
                          }

                          return null;
                        })
                        .filter(Boolean)
                    : null;

                  const isEditing = index === editingIndex;

                  if (isEditing && message.role === 'user') {
                    // Render standalone full-width editing container
                    return (
                      <div key={message.id} className="w-full">
                        <div className="bg-muted/50 dark:bg-neutral-700/40 text-foreground rounded-3xl w-full">
                          {renderEditingArea()}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={message.id} className="group">
                      <div
                        className={`flex gap-4 ${
                          message.role === "user"
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`flex gap-4  ${
                            message.role === "user"
                              ? "flex-row-reverse max-w-[80%]"
                              : "flex-row"
                          }`}
                        >
                          {/* Message Content */}
                          <div className="flex flex-col">
                            {imageUrl && (
                              <div className="mb-2">
                                <img src={imageUrl} alt="User upload" className="rounded-sm max-w-xs object-contain" />
                              </div>
                            )}

                            {fileInfo && (
                              <a href={fileInfo.url} target="_blank" rel="noopener noreferrer" className="mb-2">
                                <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3 max-w-xs hover:bg-muted transition-colors">
                                  <FileText className="h-8 w-8 text-foreground flex-shrink-0" />
                                  <div className="flex flex-col overflow-hidden">
                                    <span className="text-foreground font-medium truncate">{fileInfo.name}</span>
                                    <span className="text-muted-foreground text-sm">{fileInfo.type.split('/')[1]?.toUpperCase() || 'File'}</span>
                                  </div>
                                </div>
                              </a>
                            )}

                            {/* Tool invocation elements (e.g., generated images) */}
                            {toolElements}

                            {(message.role === 'assistant' || messageText.trim()) && (
                              <div
                                className={`${
                                  message.role === "user"
                                    ? `px-4 bg-muted/50 dark:bg-neutral-700/40 text-foreground rounded-3xl ${hasAttachment ? 'rounded-tr-sm' : ''}`
                                    : "text-foreground rounded-xl"
                                } py-3`}
                              >
                                <MessageFormatter 
                                  content={messageText}
                                  className="leading-relaxed"
                                />
                              </div>
                            )}
                            
                            {/* Action buttons for assistant messages */}
                            {message.role === "assistant" && !(isLoading && index === messages.length - 1) && (
                              <TooltipProvider delayDuration={100}>
                                <div className="flex items-center gap-0.5">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => handleCopyMessage(message.id, message.content)}
                                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                      >
                                        {copiedMessageId === message.id ? (
                                          <Check size={16} />
                                        ) : (
                                          <Copy size={16} />
                                        )}
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                      <p>{copiedMessageId === message.id ? 'Copied!' : 'Copy message'}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  
                                  {messageRatings[message.id] !== 'bad' && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          onClick={() => handleRateMessage(message.id, 'good')}
                                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                          <ThumbsUp size={16} fill={messageRatings[message.id] === 'good' ? 'currentColor' : 'none'} />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom">
                                        <p>Good response</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  
                                  {messageRatings[message.id] !== 'good' && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          onClick={() => handleRateMessage(message.id, 'bad')}
                                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                          <ThumbsDown size={16} fill={messageRatings[message.id] === 'bad' ? 'currentColor' : 'none'} />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom">
                                        <p>Bad response</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                      >
                                        <Volume2 size={16} />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                      <p>Read aloud</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                        onClick={() => handleEditUserMessage(index)}
                                      >
                                        <Edit size={16} />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                      <p>Edit message</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                        onClick={() => handleRegenerateAssistant(index)}
                                      >
                                        <RefreshCw size={16} />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                      <p>Regenerate response</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                      >
                                        <Download size={16} />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                      <p>Download</p>
                                    </TooltipContent>
                                  </Tooltip>

                                  {/* Branch navigation for pivot message */}
                                  {branchPivot === index && branches.length > 1 && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground ml-1">
                                      <button
                                        type="button"
                                        onClick={() => switchBranch('prev')}
                                        disabled={activeBranchIndex === 0}
                                        className="p-1 rounded-md hover:bg-muted disabled:opacity-40"
                                      >
                                        &lt;
                                      </button>
                                      <span>{activeBranchIndex + 1}/{branches.length}</span>
                                      <button
                                        type="button"
                                        onClick={() => switchBranch('next')}
                                        disabled={activeBranchIndex === branches.length - 1}
                                        className="p-1 rounded-md hover:bg-muted disabled:opacity-40"
                                      >
                                        &gt;
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </TooltipProvider>
                            )}

                            {/* Action buttons for user messages - only on hover */}
                            {message.role === "user" && !isEditing && (
                              <TooltipProvider delayDuration={100}>
                                <div className="flex items-center justify-end gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => handleCopyMessage(message.id, message.content)}
                                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                      >
                                        {copiedMessageId === message.id ? (
                                          <Check size={16} />
                                        ) : (
                                          <Copy size={16} />
                                        )}
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                      <p>{copiedMessageId === message.id ? 'Copied!' : 'Copy message'}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                        onClick={() => handleEditUserMessage(index)}
                                      >
                                        <Edit size={16} />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                      <p>Edit message</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {(isLoading || isLoadingHistory) && (
                <div className="flex gap-4 justify-start">
                  <div className="w-3 h-3 bg-muted-foreground rounded-full animate-pulse"></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fixed Input Area at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-background dark:bg-[#212121] py-2 pt-0 border-border/30">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={onSubmit}>
              <PromptBox
                name="prompt"
                value={input}
                onChange={handleInputChange}
                disabled={isLoading}
                placeholder="Ask anything"
                className="bg-muted border-border text-foreground"
                onFileChange={handleFileChange}
                onRemoveFile={handleRemoveFile}
                filePreview={filePreview}
              />
            </form>

            {/* Footer text */}
            <div className="text-center mt-2">
              <p className="text-xs text-muted-foreground">
                ChatGPT can make mistakes. Check important info.
              </p>
            </div>

            {/* Error display */}
            {error && (
              <div className="mt-2 text-sm text-red-400 text-center">
                Error: {error.message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
