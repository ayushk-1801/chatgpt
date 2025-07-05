import { PromptBox } from "@/components/ui/chatgpt-prompt-input";

export default function ChatPage({ params }: { params: { slug: string } }) {
  return (
    <div className="flex flex-col h-screen bg-background dark:bg-[#212121]">
      {/* Chat history area */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Placeholder for chat messages */}
        <div className="text-center text-foreground">
          <p>This is the chat page for {params.slug}.</p>
          <p>Chat history will go here.</p>
        </div>
      </div>

      {/* Prompt input area */}
      <div className="p-2 pt-0">
        <div className="mx-auto w-full max-w-3xl">
          <PromptBox />
          <p className="text-center text-xs text-gray-200 mt-2">
            ChatGPT can make mistakes. Check important info. See{" "}
            <u className="cursor-pointer">Cookie Preferences</u>.
          </p>
        </div>
      </div>
    </div>
  );
} 