'use client';

import { useChat } from '@ai-sdk/react';
import { PromptBox } from "@/components/ui/chatgpt-prompt-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Bot } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";

export default function ChatPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const { messages, input, handleInputChange, handleSubmit, isLoading, error, setInput } = useChat({
    id: slug, // Use slug as chat ID for persistence
  });
  
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Handle initial message from sessionStorage
  useEffect(() => {
    const initialMessage = sessionStorage.getItem('initialMessage');
    if (initialMessage && messages.length === 0) {
      setInput(initialMessage);
      sessionStorage.removeItem('initialMessage');
      
      // Auto-submit the initial message
      setTimeout(() => {
        const syntheticEvent = new Event('submit', { bubbles: true, cancelable: true }) as unknown as React.FormEvent;
        handleSubmit(syntheticEvent);
      }, 100);
    }
  }, [messages.length, setInput, handleSubmit]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    setIsTyping(true);
    await handleSubmit(e);
    setIsTyping(false);
  };

  const formatTime = () => {
    return new Date().toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="flex h-screen bg-[#212121] text-white">
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Messages Area */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 px-4">
          <div className="max-w-3xl mx-auto py-4 space-y-6">
            {messages.length === 0 ? (
              <div className="text-center py-8">
             
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="group">
                  <div className={`flex gap-4 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}>
                    <div className={`flex gap-4 max-w-[80%] ${
                      message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                    }`}>
                      {/* Message Content */}
                      <div className={`${
                        message.role === 'user' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-800 text-gray-100'
                      } rounded-2xl px-4 py-3`}>
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                          {message.content}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {/* Typing indicator */}
            {(isLoading || isTyping) && (
              <div className="flex gap-4 justify-start">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-gray-800 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area with PromptBox */}
        <div className=" border-gray-600/30 p-4">
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
              <p className="text-xs text-gray-500">
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