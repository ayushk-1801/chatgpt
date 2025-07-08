"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useChat } from "@ai-sdk/react";
import { PromptBox } from "@/components/ui/chatgpt-prompt-input";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useModel } from "@/hooks/use-model";
import { useChatHistory } from "@/hooks/use-chat-history";
import { ChatMessages } from "@/components/chat/chat-messages";

interface FilePreview {
  url: string;
  type: string;
  name: string;
  uploadStatus: "uploading" | "success" | "error";
  publicUrl?: string;
  dataUrl?: string;
  file?: File;
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
    error: chatError,
    setMessages,
    append,
    setInput,
  } = useChat({
    id: slug,
    body: {
      chatId: slug,
      model: selectedModel,
    },
    onFinish: async () => {
      if (initialMessageRef.current) {
        try {
          const response = await fetch("/api/chats/title", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chatId: slug,
              message: initialMessageRef.current,
            }),
          });
          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              window.dispatchEvent(new CustomEvent("chat-title-updated"));
            } else {
              console.error("Title generation failed:", result.error);
            }
          } else {
            console.error(
              "Failed to generate chat title:",
              response.status,
              response.statusText
            );
          }
        } catch (error) {
          console.error("Failed to generate chat title:", error);
        } finally {
          initialMessageRef.current = null;
        }
      }
    },
  });

  const { isLoading: isHistoryLoading, error: historyError, updateCachedMessages } = useChatHistory(slug, setMessages);

  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [messageRatings, setMessageRatings] = useState<Record<string, "good" | "bad">>({});
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Handle initial message from sessionStorage
  useEffect(() => {
    const initialMessage = sessionStorage.getItem("initialMessage");
    if (initialMessage && messages.length === 0 && !isHistoryLoading) {
      sessionStorage.removeItem("initialMessage");
      initialMessageRef.current = initialMessage;
      append({ content: initialMessage, role: "user" });
    }
  }, [messages.length, isHistoryLoading, append, slug]);

  // Update cache whenever messages change
  useEffect(() => {
    if (!isHistoryLoading && messages.length > 0) {
      updateCachedMessages(messages);
    }
  }, [messages, isHistoryLoading, updateCachedMessages]);

  const handleFileChange = async (file: File) => {
    const localUrl = URL.createObjectURL(file);
    setFilePreview({
      url: localUrl,
      type: file.type,
      name: file.name,
      uploadStatus: "success",
      file: file,
    });
  };

  const handleRemoveFile = () => {
    if (filePreview && filePreview.url.startsWith("blob:")) {
      URL.revokeObjectURL(filePreview.url);
    }
    setFilePreview(null);
  };

  const handleCopyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error("Failed to copy message:", err);
    }
  };

  const handleRateMessage = (messageId: string, rating: "good" | "bad") => {
    setMessageRatings((prev) => ({ ...prev, [messageId]: rating }));
  };

  const handleEditUserMessage = (messageIndex: number) => {
    // This logic needs to be re-implemented or moved to a modal/editing component
    console.log("Editing message at index:", messageIndex);
  };

  const handleRegenerateAssistant = async (assistantIndex: number) => {
    const lastUserMessage = messages[assistantIndex -1];
    if (lastUserMessage?.role === 'user') {
      const newMessages = messages.slice(0, assistantIndex);
      setMessages(newMessages);
      await append({
        content: lastUserMessage.content,
        role: "user",
      });
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !filePreview) return;
    const attachments = filePreview?.file ? (() => {
      const fileList = new DataTransfer();
      fileList.items.add(filePreview.file);
      return fileList.files;
    })() : undefined;
    if (input.trim() || attachments) {
      await append({ content: input, role: "user" }, { experimental_attachments: attachments });
    }
    setInput("");
    handleRemoveFile();
  };

  return (
    <div className="flex h-screen bg-background dark:bg-[#212121] text-foreground overflow-hidden">
      <div className="flex-1 flex flex-col w-full mx-auto relative">
        <ChatMessages
          messages={messages}
          isLoading={isLoading}
          isHistoryLoading={isHistoryLoading}
          onRate={handleRateMessage}
          onCopy={handleCopyMessage}
          onEdit={handleEditUserMessage}
          onRegenerate={handleRegenerateAssistant}
          ratings={messageRatings}
          copiedMessageId={copiedMessageId}
        />
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
            <div className="text-center mt-2">
              <p className="text-xs text-muted-foreground">
                ChatGPT can make mistakes. Check important info.
              </p>
            </div>
            {(chatError || historyError) && (
              <div className="mt-2 text-sm text-red-400 text-center">
                Error: {chatError?.message || historyError?.message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
