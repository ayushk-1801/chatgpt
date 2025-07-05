"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { CodeBlock } from "./code-block"; // Import the new CodeBlock component

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

export function MarkdownMessage({ content, className }: MarkdownMessageProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-6 mb-4 border-b pb-2 text-2xl font-bold">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-5 mb-3 text-xl font-bold">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-4 mb-2 text-lg font-bold">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="mt-3 mb-2 text-base font-bold">{children}</h4>
          ),
          h5: ({ children }) => (
            <h5 className="mt-2 mb-1 text-sm font-bold">{children}</h5>
          ),
          h6: ({ children }) => (
            <h6 className="mt-2 mb-1 text-xs font-bold">{children}</h6>
          ),
          p: ({ children }) => (
            <p className="mb-4 leading-relaxed last:mb-0">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mb-4 ml-6 list-outside list-disc space-y-2">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-4 ml-6 list-outside list-decimal space-y-2">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-2">{children}</li>,
          pre: ({ children, ...props }) => (
            <pre {...props} className="mb-4">
              {children}
            </pre>
          ),
          code: ({ inline, className, children, ...props }: any) => {
            if (inline) {
              return (
                <code
                  {...props}
                  className="bg-neutral-600 rounded-sm mx-0.5 px-1 py-0.5 font-mono text-sm"
                >
                  {children}
                </code>
              );
            }
            const match = /language-(\w+)/.exec(className || "");
            return match ? (
              <CodeBlock className={className}>
                {String(children).replace(/\n$/, "")}
              </CodeBlock>
            ) : (
              <code {...props} className={className}>
                {children}
              </code>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="text-muted-foreground mb-4 border-l-4 border-neutral-600 pl-4 italic">
              {children}
            </blockquote>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 underline transition-colors"
            >
              {children}
            </a>
          ),
          img: ({ src, alt }) => (
            <img
              src={src || ""}
              alt={alt || ""}
              className="mb-4 h-auto max-w-full rounded-lg"
            />
          ),
          table: ({ children }) => (
            <div className="mb-4 overflow-x-auto rounded-lg border border-neutral-700">
              <table className="min-w-full divide-y divide-neutral-700">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-neutral-800/50">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2 text-left font-medium text-neutral-200">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-t border-neutral-700 px-4 py-2 text-neutral-300">
              {children}
            </td>
          ),
          hr: () => <hr className="my-6 border-t border-neutral-700" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
} 