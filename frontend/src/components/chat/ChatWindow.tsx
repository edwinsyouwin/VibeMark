"use client";

import { useRef, useEffect } from "react";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

interface ChatWindowProps {
  messages: ChatMsg[];
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  header?: React.ReactNode;
}

export default function ChatWindow({
  messages,
  onSend,
  disabled,
  placeholder,
  header,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)]">
      {header && <div className="border-b border-border">{header}</div>}
      <div className="flex-1 overflow-y-auto px-4">
        {messages.map((msg, i) => (
          <ChatMessage
            key={i}
            role={msg.role}
            content={msg.content}
            isStreaming={msg.isStreaming}
          />
        ))}
        <div ref={bottomRef} />
      </div>
      <ChatInput onSend={onSend} disabled={disabled} placeholder={placeholder} />
    </div>
  );
}
