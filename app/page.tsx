'use client';

import { PromptBox } from "@/components/ui/chatgpt-prompt-input";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generateChatId = () => {
    // Generate a UUID for the chat ID
    return crypto.randomUUID();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const prompt = formData.get('prompt') as string;
    
    if (prompt?.trim()) {
      // Store the initial message in sessionStorage to be picked up by the chat page
      sessionStorage.setItem('initialMessage', prompt.trim());
      
      // Generate a new chat ID and redirect to the chat page
      const chatId = generateChatId();
      router.push(`/c/${chatId}`);
    }
    
    setIsSubmitting(false);
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
          />
        </form>
      </div>
    </div>
  );
}
