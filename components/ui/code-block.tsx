"use client";

import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check, Pencil } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CodeBlockProps {
  children: React.ReactNode;
  className?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ children, className }) => {
  const [isCopied, setIsCopied] = React.useState(false);
  const codeString = String(children).replace(/\n$/, "");

  // Extract language from className (e.g., "language-javascript")
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "text";

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
  };

  return (
    <div className="relative my-4 rounded-lg bg-neutral-900 font-mono text-sm">
      <div className="flex items-center justify-between px-4 py-2 text-xs text-neutral-400">
        <span>{language}</span>
        <div className="flex items-center gap-2">
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
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
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="flex items-center gap-1.5 rounded-md px-2 py-1 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white">
                  <Pencil size={14} />
                  <span>Edit</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit code</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
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