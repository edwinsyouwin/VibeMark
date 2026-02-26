"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { content as contentApi } from "@/lib/api";
import type { GeneratedContentRecord } from "@/lib/types";

export default function ContentLibrary() {
  const params = useParams();
  const projectId = Number(params.id);

  const [items, setItems] = useState<GeneratedContentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<GeneratedContentRecord | null>(null);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    contentApi
      .list(projectId)
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  async function handleSave() {
    if (!selected) return;
    try {
      const updated = await contentApi.update(selected.id, editContent);
      setItems((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      setSelected(updated);
      setEditing(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this content?")) return;
    try {
      await contentApi.delete(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleCopy() {
    if (!selected) return;
    await navigator.clipboard.writeText(selected.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <div className="p-8 text-muted-foreground">Loading...</div>;
  if (error && !items.length) return <div className="p-8 text-destructive">Error: {error}</div>;

  return (
    <div className="flex h-[calc(100vh-2rem)]">
      {/* List */}
      <div className="w-72 border-r border-border overflow-y-auto">
        <div className="p-4 border-b border-border">
          <h1 className="text-lg font-semibold">Content Library</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {items.length} item{items.length !== 1 && "s"}
          </p>
        </div>
        {items.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">
            No content generated yet. Use the Generate page to create content.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setSelected(item);
                  setEditing(false);
                }}
                className={`w-full p-3 text-left hover:bg-accent transition-colors ${
                  selected?.id === item.id ? "bg-accent" : ""
                }`}
              >
                <div className="font-medium text-sm capitalize">
                  {item.channel}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {new Date(item.created_at).toLocaleDateString()}
                  {item.model_used && ` · ${item.model_used}`}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail */}
      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold capitalize">
                {selected.channel}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="px-3 py-1 text-xs rounded-md border border-input hover:bg-accent transition-colors"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
                {editing ? (
                  <>
                    <button
                      onClick={handleSave}
                      className="px-3 py-1 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="px-3 py-1 text-xs rounded-md border border-input hover:bg-accent transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setEditContent(selected.content);
                      setEditing(true);
                    }}
                    className="px-3 py-1 text-xs rounded-md border border-input hover:bg-accent transition-colors"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => handleDelete(selected.id)}
                  className="px-3 py-1 text-xs rounded-md border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>

            {editing ? (
              <div className="grid grid-cols-2 gap-4 h-[calc(100vh-12rem)]">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-full px-3 py-2 rounded-md border border-input bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
                <div className="overflow-y-auto border border-border rounded-md p-4 prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{editContent}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{selected.content}</ReactMarkdown>
              </div>
            )}

            {selected.prompt_tokens && (
              <p className="text-xs text-muted-foreground mt-4">
                Tokens: {selected.prompt_tokens} in → {selected.output_tokens} out
                {selected.model_used && ` · ${selected.model_used}`}
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select content to preview
          </div>
        )}
      </div>
    </div>
  );
}
