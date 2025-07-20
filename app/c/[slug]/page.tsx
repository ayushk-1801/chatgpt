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
  attachmentId?: string;
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
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  // Handle initial message and tool selection from sessionStorage
  useEffect(() => {
    const initialMessage = sessionStorage.getItem("initialMessage");
    const initialTool = sessionStorage.getItem("selectedTool");
    
    if (initialMessage && messages.length === 0 && !isHistoryLoading) {
      sessionStorage.removeItem("initialMessage");
      sessionStorage.removeItem("selectedTool");
      initialMessageRef.current = initialMessage;
      
      // Set the initial tool selection if it exists
      if (initialTool) {
        setSelectedTool(initialTool);
      }
      
      // Prepare options for tool choice if tool was selected
      const options: any = {};
      if (initialTool) {
        options.body = { toolChoice: { type: "tool", name: initialTool } };
      }
      
      append({ content: initialMessage, role: "user" }, options);
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
      uploadStatus: "uploading",
      file: file,
    });

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const { data } = await res.json();

      setFilePreview((prev) => prev ? { ...prev, uploadStatus: "success", publicUrl: data.url, attachmentId: data.attachmentId } : null);
    } catch (err) {
      console.error("File upload error", err);
      setFilePreview((prev) => prev ? { ...prev, uploadStatus: "error" } : null);
    }
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

  const handleEditUserMessage = async (messageIndex: number, newContent: string) => {
    try {
      const messageToEdit = messages[messageIndex];
      if (!messageToEdit) return;

      console.log('Message to edit details:', {
        messageIndex,
        messageId: messageToEdit.id,
        messageIdType: typeof messageToEdit.id,
        messageIdLength: messageToEdit.id?.length,
        dbId: (messageToEdit as any).dbId,
        content: messageToEdit.content?.slice(0, 30) + '...',
        role: messageToEdit.role
      });

      // Find the database message by position and content match
      // This is more reliable than using IDs that might be overridden by useChat
      const editPayload = {
        messageIndex: messageIndex,
        originalContent: messageToEdit.content,
        newContent,
        chatSlug: slug
      };
      
      console.log('Editing message with payload:', editPayload);
      
      const response = await fetch(`/api/chats/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Edit message error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Failed to edit message: ${response.status} ${response.statusText} - ${errorText}`);
      }

      // Delete all messages after the edited message
      await fetch(`/api/chats/${slug}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: messageToEdit.id,
        }),
      });

      // Remove messages after the edited one from UI
      const updatedMessages = messages.slice(0, messageIndex);
      setMessages(updatedMessages);

      // Trigger regeneration by sending the edited message with preserved attachments
      const messageData: any = {
        content: newContent,
        role: "user",
      };

      // Set up options for the backend
      const options: any = {};

      // Preserve attachments if the original message had them
      if (messageToEdit.attachments && messageToEdit.attachments.length > 0) {
        // Include attachments for UI display
        messageData.attachments = messageToEdit.attachments;
        
        // Extract attachment IDs for backend processing
        const attachmentIds = messageToEdit.attachments
          .map((att: any) => att.id)
          .filter(Boolean); // Remove any undefined IDs
        
        if (attachmentIds.length > 0) {
          options.body = {
            attachments: attachmentIds
          };
        }
        
        console.log('Preserving attachments during edit:', {
          uiFormat: messageToEdit.attachments,
          attachmentIds: attachmentIds
        });
      }

      // append() will add the edited message and trigger AI response
      await append(messageData, options);
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  };

  const handleRegenerateAssistant = async (assistantIndex: number, toolChoice?: string) => {
    const lastUserMessageIndex = assistantIndex - 1;
    const lastUserMessage = messages[lastUserMessageIndex];
    if (!lastUserMessage || lastUserMessage.role !== 'user') return;

    // Remove both the last user message and the assistant message we are regenerating
    const newMessages = messages.slice(0, lastUserMessageIndex);
    setMessages(newMessages);

    const options: any = {};
    if (toolChoice) {
      options.body = { toolChoice: { type: 'tool', name: toolChoice } };
      // Also update the UI to show the selected tool
      setSelectedTool(toolChoice);
    }

    await append(
      {
        content: lastUserMessage.content,
        role: 'user',
      },
      options,
    );
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !filePreview) return;
    if (filePreview && filePreview.uploadStatus !== 'success') {
      // Wait until upload finishes
      return;
    }
    const hasText = input.trim().length > 0;
    // Build local attachment metadata so UI can instantly display it
    const attachmentMeta = filePreview && filePreview.publicUrl
      ? [{
          url: filePreview.publicUrl,
          name: filePreview.name,
          contentType: filePreview.type,
        }]
      : undefined;

    if (hasText || attachmentMeta) {
      const options: any = {};
      if (selectedTool) {
        // Pass the toolChoice instruction to backend
        options.body = { toolChoice: { type: "tool", name: selectedTool } };
      }

      // Include attachment IDs in the request body for the backend
      if (filePreview?.attachmentId) {
        options.body = {
          ...options.body,
          attachments: [filePreview.attachmentId]
        };
      }

      await append(
        { content: input, role: "user", ...(attachmentMeta ? { attachments: attachmentMeta } : {}) } as any,
        options,
      );
    }
    // Reset selected tool after sending
    setSelectedTool(null);
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
                selectedTool={selectedTool}
                onSelectedToolChange={setSelectedTool}
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
