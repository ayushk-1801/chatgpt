'use client';

import { PromptBox } from "@/components/ui/chatgpt-prompt-input";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  const generateChatId = () => {
    // Generate a UUID for the chat ID
    return crypto.randomUUID();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const prompt = formData.get('prompt') as string;
    
    if (prompt?.trim()) {
      try {
        const chatId = generateChatId();
        
        // Create the chat first
        const response = await fetch('/api/chats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ chatId, initialMessage: prompt.trim() }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create chat');
        }

        const result = await response.json();
        const newChatSlug = result.data.chat.slug;

        // Store the initial message in sessionStorage to be picked up by the chat page
        sessionStorage.setItem('initialMessage', prompt.trim());

        router.push(`/c/${newChatSlug}`);

      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unexpected error occurred.");
        }
        setIsSubmitting(false);
      }
    } else {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background dark:bg-[#212121] p-4">
      <div className="w-full max-w-3xl flex flex-col gap-10 mb-80">
        <div className="text-center">
          <p className="text-2xl text-foreground">
            How Can I Help You Today?
          </p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <PromptBox 
            name="prompt" 
            disabled={isSubmitting}
            className={isSubmitting ? "opacity-50 pointer-events-none" : ""}
            onFileChange={() => {}}
            onRemoveFile={() => {}}
            filePreview={null}
            selectedTool={selectedTool}
            onSelectedToolChange={setSelectedTool}
          />
          {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
        </form>
      </div>
    </div>
  );
}
