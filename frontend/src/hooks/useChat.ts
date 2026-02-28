"use client";

import { useState, useCallback, useRef } from "react";
import type { ChatMsg } from "@/components/chat/ChatWindow";

/**
 * Hook for managing SSE-streamed chat sessions.
 */
export function useChat(conversationId: number | null) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const addMessage = useCallback((msg: ChatMsg) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const setMessagesFromData = useCallback((msgs: ChatMsg[]) => {
    setMessages(msgs);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId || streaming) return;

      // Add user message
      setMessages((prev) => [...prev, { role: "user", content }]);

      // Start streaming response
      setStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;

      // Add placeholder for streaming assistant message
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", isStreaming: true },
      ]);

      try {
        const res = await fetch(
          `/api/conversations/${conversationId}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content }),
            signal: controller.signal,
          }
        );

        if (!res.ok) throw new Error(`API ${res.status}`);

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";
        let shouldAdvance = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "token") {
                  fullText += data.content;
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last && last.role === "assistant") {
                      updated[updated.length - 1] = {
                        ...last,
                        content: fullText,
                        isStreaming: true,
                      };
                    }
                    return updated;
                  });
                } else if (data.type === "done") {
                  shouldAdvance = data.should_advance || false;
                }
              } catch {
                // Ignore malformed JSON
              }
            }
          }
        }

        // Finalize the message
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === "assistant") {
            updated[updated.length - 1] = {
              ...last,
              content: fullText,
              isStreaming: false,
            };
          }
          return updated;
        });

        return shouldAdvance;
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          // Remove the placeholder on error
          setMessages((prev) => {
            const updated = [...prev];
            if (updated[updated.length - 1]?.isStreaming) {
              updated.pop();
            }
            return updated;
          });
          throw e;
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [conversationId, streaming]
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    messages,
    streaming,
    sendMessage,
    addMessage,
    setMessages: setMessagesFromData,
    abort,
  };
}
