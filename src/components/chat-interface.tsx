"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Sparkles } from "lucide-react";
import { ChatMessage, Project, MarketingAnalysis } from "@/lib/types";
import { addChatMessage, updateAnalysis } from "@/lib/store";

interface ChatInterfaceProps {
  project: Project;
  onUpdate: () => void;
}

export default function ChatInterface({
  project,
  onUpdate,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [project.chatHistory]);

  // Auto-greeting on first open
  useEffect(() => {
    if (project.chatHistory.length === 0) {
      sendMessage(
        "I just connected my repository. Help me figure out how to market this app."
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    addChatMessage(project.id, userMsg);
    onUpdate();
    setInput("");
    setSending(true);

    try {
      const messages = [
        ...project.chatHistory.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        { role: "user", content: text },
      ];

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          context: {
            repoName: project.repoName,
            repoDescription: project.repoDescription,
            repoLanguage: project.repoLanguage,
            readmeContent: project.readmeContent,
            repoFiles: project.repoFiles,
            documents: project.documents,
          },
        }),
      });

      if (!res.ok) throw new Error("Chat request failed");

      const data = await res.json();
      const assistantContent: string = data.message;

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: assistantContent,
        timestamp: Date.now(),
      };

      addChatMessage(project.id, assistantMsg);

      // Check for analysis block
      const analysisMatch = assistantContent.match(
        /===ANALYSIS_START===([\s\S]*?)===ANALYSIS_END===/
      );
      if (analysisMatch) {
        try {
          // Extract JSON from within the analysis block (might be wrapped in markdown code fence)
          const jsonStr = analysisMatch[1]
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();
          const analysis: MarketingAnalysis = JSON.parse(jsonStr);
          updateAnalysis(project.id, analysis);
        } catch {
          // Analysis parsing failed, that's ok
        }
      }

      onUpdate();
    } catch {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "Sorry, I encountered an error. Please check that the AI API key is configured and try again.",
        timestamp: Date.now(),
      };
      addChatMessage(project.id, errorMsg);
      onUpdate();
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    sendMessage(input.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const quickPrompts = [
    "Generate my marketing analysis",
    "What makes my app unique?",
    "Who is my ideal customer?",
    "Help me write a tagline",
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {project.chatHistory.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-white rounded-br-md"
                  : "bg-surface-light text-text rounded-bl-md"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="whitespace-pre-wrap">
                  {msg.content
                    .replace(/===ANALYSIS_START===[\s\S]*?===ANALYSIS_END===/, "[Marketing analysis generated — see the Analysis tab]")
                  }
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-surface-light rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-primary-light rounded-full animate-pulse-dot" />
              <span
                className="w-2 h-2 bg-primary-light rounded-full animate-pulse-dot"
                style={{ animationDelay: "0.2s" }}
              />
              <span
                className="w-2 h-2 bg-primary-light rounded-full animate-pulse-dot"
                style={{ animationDelay: "0.4s" }}
              />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts */}
      {project.chatHistory.length > 0 &&
        project.chatHistory.length < 8 &&
        !sending && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="text-xs bg-surface-light hover:bg-surface-lighter text-text-muted px-3 py-1.5 rounded-full transition-colors cursor-pointer"
              >
                <Sparkles className="w-3 h-3 inline mr-1" />
                {prompt}
              </button>
            ))}
          </div>
        )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-surface-light"
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Share your story, ask for marketing advice..."
            rows={1}
            className="flex-1 bg-surface-light border border-surface-lighter rounded-xl px-4 py-3 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary resize-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="bg-primary hover:bg-primary-light disabled:opacity-40 text-white p-3 rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
