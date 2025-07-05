"use client";

import { useChat } from "@ai-sdk/react";
import { PromptBox } from "@/components/ui/chatgpt-prompt-input";
import { MessageFormatter } from "@/components/ui/message-formatter";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Copy, ThumbsUp, ThumbsDown, Volume2, Edit, RefreshCw, Download } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DatabaseMessage {
  _id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  model?: string;
}

export default function ChatPage() {
  const params = useParams();
  const slug = params.slug as string;

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    setMessages,
    append,
  } = useChat({
    id: slug, // Use slug as chat ID for persistence
    body: {
      chatId: slug, // Pass chatId to the API
    },
  });

  // --- Chat message cache utility ---
  type ChatMessage = typeof messages extends Array<infer T> ? T : never;
  const chatMemoryCache: Record<string, ChatMessage[]> = {};

  function getCachedMessages(slug: string): ChatMessage[] | null {
    // Check in-memory first
    if (chatMemoryCache[slug]) return chatMemoryCache[slug];
    // Then check localStorage
    const key = `chat_messages_${slug}`;
    const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    if (raw) {
      try {
        const parsed: ChatMessage[] = JSON.parse(raw);
        // Convert createdAt back to Date if present
        const parsedWithDates = parsed.map((msg: ChatMessage) => ({ ...msg, createdAt: msg.createdAt ? new Date(msg.createdAt) : undefined }));
        chatMemoryCache[slug] = parsedWithDates;
        return parsedWithDates;
      } catch {}
    }
    return null;
  }

  function setCachedMessages(slug: string, messages: ChatMessage[]) {
    chatMemoryCache[slug] = messages;
    if (typeof window !== 'undefined') {
      // Convert Date to string for storage if present
      const toStore = messages.map(msg => ({
        ...msg,
        createdAt: msg.createdAt
          ? (msg.createdAt instanceof Date
              ? msg.createdAt.toISOString()
              : msg.createdAt)
          : undefined
      }));
      localStorage.setItem(`chat_messages_${slug}` , JSON.stringify(toStore));
    }
  }
  // --- End cache utility ---

  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Load existing messages when the page loads
  useEffect(() => {
    let didCancel = false;
    const loadChatHistory = async () => {
      // Try cache first
      const cached = getCachedMessages(slug);
      if (cached && cached.length > 0) {
        setMessages(cached);
        setIsLoadingHistory(false);
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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsTyping(true);
    await handleSubmit(e);
    setIsTyping(false);
  };

  return (
    <div className="flex h-screen bg-[#212121] text-white overflow-hidden">
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
                messages.map((message, index) => (
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
                          <div
                            className={`${
                              message.role === "user"
                                ? "px-4 bg-neutral-700/50 text-white"
                                : "text-gray-100"
                            } rounded-4xl  py-3`}
                          >
                            <MessageFormatter 
                              content={message.content}
                              className="leading-relaxed"
                            />
                          </div>
                          
                          {/* Action buttons for assistant messages */}
                          {message.role === "assistant" && !(isLoading && index === messages.length - 1) && (
                            <TooltipProvider delayDuration={100}>
                              <div className="flex items-center gap-0.5">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => navigator.clipboard.writeText(message.content)}
                                      className="p-1.5 rounded-md hover:bg-neutral-700 text-gray-200 hover:text-white transition-colors"
                                    >
                                      <Copy size={16} />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom">
                                    <p>Copy message</p>
                                  </TooltipContent>
                                </Tooltip>
                                
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      className="p-1.5 rounded-md hover:bg-neutral-700 text-gray-200 hover:text-white transition-colors"
                                    >
                                      <ThumbsUp size={16} />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom">
                                    <p>Good response</p>
                                  </TooltipContent>
                                </Tooltip>
                                
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      className="p-1.5 rounded-md hover:bg-neutral-700 text-gray-200 hover:text-white transition-colors"
                                    >
                                      <ThumbsDown size={16} />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom">
                                    <p>Bad response</p>
                                  </TooltipContent>
                                </Tooltip>
                                
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      className="p-1.5 rounded-md hover:bg-neutral-700 text-gray-200 hover:text-white transition-colors"
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
                                      className="p-1.5 rounded-md hover:bg-neutral-700 text-gray-200 hover:text-white transition-colors"
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
                                      className="p-1.5 rounded-md hover:bg-neutral-700 text-gray-200 hover:text-white transition-colors"
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
                                      className="p-1.5 rounded-md hover:bg-neutral-700 text-gray-200 hover:text-white transition-colors"
                                    >
                                      <Download size={16} />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom">
                                    <p>Download</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </TooltipProvider>
                          )}

                          {/* Action buttons for user messages - only on hover */}
                          {message.role === "user" && (
                            <TooltipProvider delayDuration={100}>
                              <div className="flex items-center justify-end gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => navigator.clipboard.writeText(message.content)}
                                      className="p-1.5 rounded-md hover:bg-neutral-600 text-gray-200 hover:text-white transition-colors"
                                    >
                                      <Copy size={16} />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom">
                                    <p>Copy message</p>
                                  </TooltipContent>
                                </Tooltip>
                                
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      className="p-1.5 rounded-md hover:bg-neutral-600 text-gray-200 hover:text-white transition-colors"
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
                ))
              )}

              {/* Typing indicator */}
              {(isLoading || isTyping) && (
                <div className="flex gap-4 justify-start">
                  <div className="w-3 h-3 bg-gray-500 rounded-full animate-pulse"></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fixed Input Area at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-[#212121] py-2 pt-0 border-gray-600/30">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={onSubmit}>
              <PromptBox
                name="prompt"
                value={input}
                onChange={handleInputChange}
                disabled={isLoading}
                placeholder="Ask anything"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </form>

            {/* Footer text */}
            <div className="text-center mt-2">
              <p className="text-xs text-gray-300">
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
