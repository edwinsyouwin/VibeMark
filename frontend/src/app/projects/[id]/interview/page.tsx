"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { conversations as convApi } from "@/lib/api";
import ChatWindow from "@/components/chat/ChatWindow";
import { useChat } from "@/hooks/useChat";

const TOPIC_TITLES = [
  "The Problem You Solve",
  "Who It's For",
  "What Makes You Different",
  "Your Value Proposition",
  "Your Origin Story",
  "Marketing Goals",
];

export default function InterviewPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = Number(params.id);

  const [convId, setConvId] = useState<number | null>(null);
  const [topicIndex, setTopicIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const { messages, streaming, sendMessage, addMessage, setMessages } = useChat(convId);

  // Create conversation on mount
  useEffect(() => {
    convApi
      .create(projectId, "interview")
      .then((conv) => {
        setConvId(conv.id);
        // Load initial opener message
        fetch(`/api/conversations/${conv.id}/messages`)
          .then((r) => r.json())
          .then((msgs: any[]) => {
            setMessages(
              msgs.map((m) => ({ role: m.role, content: m.content }))
            );
          });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  async function handleSend(content: string) {
    if (!convId) return;

    try {
      const shouldAdvance = await sendMessage(content);
      if (shouldAdvance) {
        // Auto-advance after a short delay
        setTimeout(() => handleAdvance(), 1000);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleAdvance() {
    if (!convId) return;
    try {
      const result = await convApi.advance(convId);
      if (result.opener) {
        setTopicIndex(result.topic_index);
        addMessage({ role: "assistant", content: result.opener });
      } else {
        // All topics done — finish
        handleFinish();
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleFinish() {
    if (!convId) return;
    try {
      const result = await convApi.finish(convId);
      if (result.synthesis) {
        addMessage({ role: "assistant", content: result.synthesis });
      }
      setFinished(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (loading) return <div className="p-8 text-muted-foreground">Starting interview...</div>;
  if (error) return <div className="p-8 text-destructive">Error: {error}</div>;

  return (
    <div className="h-screen flex flex-col">
      <ChatWindow
        messages={messages}
        onSend={handleSend}
        disabled={streaming || finished}
        placeholder={finished ? "Interview complete!" : "Type your answer..."}
        header={
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-lg font-semibold">Marketing Interview</h1>
              <div className="flex gap-2">
                <button
                  onClick={handleAdvance}
                  disabled={streaming || finished}
                  className="px-3 py-1 text-xs rounded-md border border-input hover:bg-accent disabled:opacity-50 transition-colors"
                >
                  Skip Topic
                </button>
                <button
                  onClick={handleFinish}
                  disabled={streaming || finished}
                  className="px-3 py-1 text-xs rounded-md border border-input hover:bg-accent disabled:opacity-50 transition-colors"
                >
                  Finish Early
                </button>
              </div>
            </div>
            {/* Topic progress */}
            <div className="flex gap-1.5">
              {TOPIC_TITLES.map((title, i) => (
                <div
                  key={i}
                  className="flex-1"
                  title={title}
                >
                  <div
                    className={`h-1.5 rounded-full transition-colors ${
                      i < topicIndex
                        ? "bg-green-500"
                        : i === topicIndex
                        ? "bg-primary"
                        : "bg-secondary"
                    }`}
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                    {title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        }
      />
    </div>
  );
}
