"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { conversations as convApi } from "@/lib/api";
import ChatWindow from "@/components/chat/ChatWindow";
import { useChat } from "@/hooks/useChat";

export default function BrainstormPage() {
  const params = useParams();
  const projectId = Number(params.id);

  const [convId, setConvId] = useState<number | null>(null);
  const [topic, setTopic] = useState("");
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { messages, streaming, sendMessage, addMessage, setMessages } = useChat(convId);

  async function handleStart() {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const conv = await convApi.create(projectId, "brainstorm", topic.trim());
      setConvId(conv.id);

      // Send the initial brainstorm prompt to get the opener
      const res = await fetch(`/api/conversations/${conv.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `I want to brainstorm about: ${topic.trim()}. Help me think through this as my marketing consultant.`,
        }),
      });

      if (!res.ok) throw new Error(`API ${res.status}`);

      // Stream the opener
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

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
              }
            } catch {}
          }
        }
      }

      setMessages([{ role: "assistant", content: fullText }]);
      setStarted(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(content: string) {
    if (!convId) return;
    try {
      await sendMessage(content);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!started) {
    return (
      <div className="p-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-2">Brainstorm</h1>
        <p className="text-muted-foreground mb-6">
          Start an open-ended marketing strategy session. Pick any topic —
          launch strategy, pricing, naming, positioning, etc.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Topic</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStart()}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. launch strategy, naming ideas, pricing model"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            onClick={handleStart}
            disabled={loading || !topic.trim()}
            className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? "Starting..." : "Start Brainstorm"}
          </button>
        </div>

        <div className="mt-8 text-sm text-muted-foreground">
          <p className="font-medium mb-2">Suggested topics:</p>
          <div className="flex flex-wrap gap-2">
            {[
              "Launch strategy",
              "Pricing model",
              "Product naming",
              "Positioning",
              "Content marketing",
              "Community building",
            ].map((t) => (
              <button
                key={t}
                onClick={() => setTopic(t)}
                className="px-3 py-1 rounded-full border border-border text-xs hover:bg-accent transition-colors"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <ChatWindow
        messages={messages}
        onSend={handleSend}
        disabled={streaming}
        placeholder="Share your thoughts..."
        header={
          <div className="px-4 py-3">
            <h1 className="text-lg font-semibold">
              Brainstorm: {topic}
            </h1>
          </div>
        }
      />
    </div>
  );
}
