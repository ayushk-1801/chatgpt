"use client";

import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check, Pencil } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTheme } from "next-themes";

interface CodeBlockProps {
  children: React.ReactNode;
  className?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ children, className }) => {
  const [isCopied, setIsCopied] = React.useState(false);
  const { theme, resolvedTheme } = useTheme();
  const codeString = String(children).replace(/\n$/, "");

  // Extract language from className (e.g., "language-javascript")
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "text";

  // Determine which syntax highlighting theme to use
  const syntaxTheme = (resolvedTheme || theme) === 'dark' ? oneDark : oneLight;

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
  };

  return (
    <div className="relative my-4 rounded-lg bg-muted dark:bg-sidebar font-mono text-sm">
      <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground">
        <span>{language}</span>
        <div className="flex items-center gap-2">
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {isCopied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{isCopied ? "Copied" : "Copy"}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copy to clipboard</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <SyntaxHighlighter
        language={language}
        style={syntaxTheme}
        customStyle={{ margin: 0, padding: "1rem", backgroundColor: "transparent" }}
        codeTagProps={{
          style: {
            fontFamily: "inherit",
          },
        }}
      >
        {codeString}
      </SyntaxHighlighter>
    </div>
  );
}; 