/** Typed fetch wrapper for the Vibemark API. */

import type {
  Channel,
  Conversation,
  GeneratedContentRecord,
  GitHubRepo,
  Project,
  ProjectCreate,
  ProjectUpdate,
  VibemarkConfig,
} from "./types";

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Projects ─────────────────────────────────────────────────────────

export const projects = {
  list: () => request<Project[]>("/projects"),
  get: (id: number) => request<Project>(`/projects/${id}`),
  create: (data: ProjectCreate) =>
    request<Project>("/projects", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: ProjectUpdate) =>
    request<Project>(`/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<void>(`/projects/${id}`, { method: "DELETE" }),
};

// ── Config ───────────────────────────────────────────────────────────

export const config = {
  get: (projectId: number) =>
    request<VibemarkConfig>(`/projects/${projectId}/config`),
  update: (projectId: number, data: VibemarkConfig) =>
    request<VibemarkConfig>(`/projects/${projectId}/config`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

// ── Scan ─────────────────────────────────────────────────────────────

export const scan = {
  trigger: (projectId: number) =>
    request<VibemarkConfig>(`/projects/${projectId}/scan`, {
      method: "POST",
    }),
};

// ── Conversations ────────────────────────────────────────────────────

export const conversations = {
  list: (projectId: number) =>
    request<Conversation[]>(
      `/projects/${projectId}/conversations`
    ),
  create: (projectId: number, type: "interview" | "brainstorm", topic?: string) =>
    request<Conversation>(`/conversations`, {
      method: "POST",
      body: JSON.stringify({ project_id: projectId, conversation_type: type, topic: topic || "" }),
    }),
  advance: (conversationId: number) =>
    request<{ opener: string | null; topic_index: number }>(
      `/conversations/${conversationId}/advance`,
      { method: "POST" }
    ),
  finish: (conversationId: number) =>
    request<{ synthesis: string }>(`/conversations/${conversationId}/finish`, {
      method: "POST",
    }),
};

// SSE message streaming — returns an EventSource-like reader
export function streamMessage(
  conversationId: number,
  content: string
): { reader: ReadableStreamDefaultReader<string>; abort: () => void } {
  const controller = new AbortController();

  const stream = fetch(`${BASE}/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
    signal: controller.signal,
  }).then((res) => {
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.body!.pipeThrough(new TextDecoderStream()).getReader();
  });

  // Wrap the promise-based reader
  const readable = new ReadableStream<string>({
    async start(ctrl) {
      try {
        const reader = await stream;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          ctrl.enqueue(value);
        }
        ctrl.close();
      } catch (e) {
        if ((e as Error).name !== "AbortError") ctrl.error(e);
        else ctrl.close();
      }
    },
  });

  return {
    reader: readable.getReader(),
    abort: () => controller.abort(),
  };
}

// ── Generation ───────────────────────────────────────────────────────

export function streamGenerate(
  projectId: number,
  channel: Channel
): { reader: ReadableStreamDefaultReader<string>; abort: () => void } {
  const controller = new AbortController();

  const stream = fetch(`${BASE}/projects/${projectId}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel }),
    signal: controller.signal,
  }).then((res) => {
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.body!.pipeThrough(new TextDecoderStream()).getReader();
  });

  const readable = new ReadableStream<string>({
    async start(ctrl) {
      try {
        const reader = await stream;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          ctrl.enqueue(value);
        }
        ctrl.close();
      } catch (e) {
        if ((e as Error).name !== "AbortError") ctrl.error(e);
        else ctrl.close();
      }
    },
  });

  return {
    reader: readable.getReader(),
    abort: () => controller.abort(),
  };
}

// ── GitHub ────────────────────────────────────────────────────────────

export const github = {
  getAuthUrl: () => request<{ url: string }>("/github/auth-url"),
  callback: (code: string) =>
    request<{ username: string }>("/github/callback", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
  status: () => request<{ connected: boolean; username: string }>("/github/status"),
  repos: () => request<GitHubRepo[]>("/github/repos"),
};

// ── Content Library ──────────────────────────────────────────────────

export const content = {
  list: (projectId: number) =>
    request<GeneratedContentRecord[]>(`/projects/${projectId}/content`),
  get: (contentId: number) =>
    request<GeneratedContentRecord>(`/content/${contentId}`),
  update: (contentId: number, newContent: string) =>
    request<GeneratedContentRecord>(`/content/${contentId}`, {
      method: "PUT",
      body: JSON.stringify({ content: newContent }),
    }),
  delete: (contentId: number) =>
    request<void>(`/content/${contentId}`, { method: "DELETE" }),
};
