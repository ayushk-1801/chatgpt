import { PromptBox } from "@/components/ui/chatgpt-prompt-input";

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background dark:bg-[#212121] p-4">
      <div className="w-full max-w-3xl flex flex-col gap-10 mb-80">
          <p className="text-center text-3xl text-foreground">
            How Can I Help You?
          </p>
          <PromptBox />
      </div>
    </div>
  );
}
