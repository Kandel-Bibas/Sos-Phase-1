"use client";

import { useState, useRef, useEffect } from "react";
import { sendChatQuery } from "@/lib/api/client";
import type { ChatMessage, Citation } from "@/lib/api/types";

function CitationItem({ citation }: { citation: Citation }) {
  const pagesText = citation.pages.length === 1 
    ? `Page ${citation.pages[0]}` 
    : `Pages ${citation.pages[0]}-${citation.pages[citation.pages.length - 1]}`;
  
  return (
    <div className="rounded border border-zinc-300 bg-zinc-50 p-2 text-xs dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="font-medium text-zinc-900 dark:text-zinc-100">
            {citation.document}
          </p>
          {citation.section && (
            <p className="text-zinc-600 dark:text-zinc-400">
              Section {citation.section}
            </p>
          )}
          <p className="text-zinc-500 dark:text-zinc-500">{pagesText}</p>
          {citation.statute_codes.length > 0 && (
            <p className="mt-1 text-zinc-500 dark:text-zinc-500">
              Statutes: {citation.statute_codes.join(", ")}
            </p>
          )}
        </div>
        <div className="text-right">
          <span className="inline-block rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {(citation.relevance * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await sendChatQuery({ query: userMessage.content });
      
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response.answer,
        citations: response.citations,
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <main className="flex flex-1 flex-col items-center justify-center p-4">
        <div className="w-full max-w-3xl">
          <h1 className="mb-6 text-center text-3xl font-semibold text-black dark:text-zinc-50">
            Chatbot
          </h1>

          <div className="mb-4 flex h-[500px] flex-col overflow-y-auto rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-zinc-500 dark:text-zinc-400">
                Start a conversation by typing a message below
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        message.role === "user"
                          ? "bg-blue-500 text-white"
                          : "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                      {message.role === "assistant" && message.citations && message.citations.length > 0 && (
                        <div className="mt-3 border-t border-zinc-300 pt-3 dark:border-zinc-700">
                          <p className="mb-2 text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-400">
                            Citations
                          </p>
                          <div className="space-y-2">
                            {message.citations.map((citation, citIndex) => (
                              <CitationItem key={citIndex} citation={citation} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-700 dark:bg-red-900 dark:text-red-300">
              Error: {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-black placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-400"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="rounded-lg bg-blue-500 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Sending..." : "Send"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
