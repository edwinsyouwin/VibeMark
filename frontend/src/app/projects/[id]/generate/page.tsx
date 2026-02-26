"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Channel } from "@/lib/types";

const CHANNELS: { value: Channel; label: string; description: string }[] = [
  {
    value: "social",
    label: "Social Media",
    description: "Twitter thread, LinkedIn post, HN/Reddit",
  },
  {
    value: "landing",
    label: "Landing Page",
    description: "Hero, features, how it works, CTA",
  },
  {
    value: "readme",
    label: "README",
    description: "Badges, quick start, usage, contributing",
  },
];

export default function GeneratePage() {
  const params = useParams();
  const projectId = Number(params.id);

  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [generating, setGenerating] = useState(false);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [contentId, setContentId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    if (!selectedChannel) return;
    setGenerating(true);
    setContent("");
    setError(null);
    setContentId(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: selectedChannel }),
      });

      if (!res.ok) throw new Error(`API ${res.status}`);

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
                setContent(fullText);
              } else if (data.type === "done") {
                setContentId(data.content_id);
              }
            } catch {}
          }
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Generate Content</h1>

      {/* Channel picker */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {CHANNELS.map((ch) => (
          <button
            key={ch.value}
            onClick={() => setSelectedChannel(ch.value)}
            className={`p-4 rounded-lg border text-left transition-colors ${
              selectedChannel === ch.value
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <h3 className="font-semibold text-sm">{ch.label}</h3>
            <p className="text-xs text-muted-foreground mt-1">{ch.description}</p>
          </button>
        ))}
      </div>

      <button
        onClick={handleGenerate}
        disabled={generating || !selectedChannel}
        className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors mb-6"
      >
        {generating ? "Generating..." : "Generate"}
      </button>

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      {/* Preview */}
      {content && (
        <div className="border border-border rounded-lg">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <span className="text-sm font-medium">
              {selectedChannel?.toUpperCase()} Preview
            </span>
            <button
              onClick={handleCopy}
              className="px-3 py-1 text-xs rounded-md border border-input hover:bg-accent transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="p-4 prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{content}</ReactMarkdown>
            {generating && (
              <span className="inline-block w-2 h-4 bg-current animate-pulse" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
