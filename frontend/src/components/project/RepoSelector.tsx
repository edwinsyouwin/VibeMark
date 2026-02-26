"use client";

import { useEffect, useState } from "react";
import { github } from "@/lib/api";
import type { GitHubRepo } from "@/lib/types";

interface RepoSelectorProps {
  onSelect: (repo: GitHubRepo) => void;
}

export default function RepoSelector({ onSelect }: RepoSelectorProps) {
  const [connected, setConnected] = useState(false);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    github
      .status()
      .then((s) => {
        setConnected(s.connected);
        if (s.connected) {
          return github.repos().then(setRepos);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleConnect() {
    try {
      const { url } = await github.getAuthUrl();
      window.location.href = url;
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Checking GitHub connection...</p>;

  if (!connected) {
    return (
      <div className="border border-dashed border-border rounded-lg p-6 text-center">
        <p className="text-sm text-muted-foreground mb-3">
          Connect your GitHub account to import repositories.
        </p>
        {error && <p className="text-sm text-destructive mb-3">{error}</p>}
        <button
          onClick={handleConnect}
          className="px-4 py-2 rounded-md text-sm font-medium bg-foreground text-background hover:opacity-90 transition-colors"
        >
          Connect GitHub
        </button>
      </div>
    );
  }

  const filtered = repos.filter(
    (r) =>
      r.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search repositories..."
        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring mb-3"
      />
      {error && <p className="text-sm text-destructive mb-2">{error}</p>}
      <div className="max-h-64 overflow-y-auto divide-y divide-border border border-border rounded-md">
        {filtered.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">No repositories found</p>
        ) : (
          filtered.map((repo) => (
            <button
              key={repo.id}
              onClick={() => onSelect(repo)}
              className="w-full p-3 text-left hover:bg-accent transition-colors"
            >
              <div className="font-medium text-sm">{repo.full_name}</div>
              {repo.description && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {repo.description}
                </p>
              )}
              <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                {repo.language && <span>{repo.language}</span>}
                {repo.private && <span>Private</span>}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
