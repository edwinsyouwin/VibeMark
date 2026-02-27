"use client";

import { useEffect, useState } from "react";
import { X, Search, Lock, Globe, Loader2 } from "lucide-react";
import { GitHubRepo, Project, RepoFile } from "@/lib/types";
import { createProject, addRepoFile } from "@/lib/store";

// Files to auto-fetch for marketing context
const AUTO_FETCH_PATTERNS = [
  "package.json",
  "Cargo.toml",
  "pyproject.toml",
  "setup.py",
  "go.mod",
  "Gemfile",
  "pom.xml",
  "build.gradle",
  "CONTRIBUTING.md",
  "CHANGELOG.md",
  "LICENSE",
  ".github/FUNDING.yml",
];

interface RepoSelectorProps {
  onClose: () => void;
  onProjectCreated: (project: Project) => void;
}

export default function RepoSelector({
  onClose,
  onProjectCreated,
}: RepoSelectorProps) {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRepos() {
      try {
        const res = await fetch("/api/github/repos");
        if (!res.ok) throw new Error("Failed to fetch repositories");
        const data = await res.json();
        setRepos(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load repos");
      } finally {
        setLoading(false);
      }
    }
    fetchRepos();
  }, []);

  const filtered = repos.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = async (repo: GitHubRepo) => {
    setSelecting(repo.id);
    try {
      const [owner, repoName] = repo.full_name.split("/");

      // Fetch README and file tree in parallel
      const [readmeRes, treeRes] = await Promise.all([
        fetch(`/api/github/repos/${owner}/${repoName}/readme`),
        fetch(`/api/github/repos/${owner}/${repoName}/tree`),
      ]);

      const readmeData = await readmeRes.json();
      const treeData = await treeRes.json();

      const project = createProject(
        {
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description,
          html_url: repo.html_url,
          language: repo.language,
        },
        readmeData.content
      );

      // Auto-fetch key config files from the tree
      if (treeData.entries) {
        const filesToFetch = (treeData.entries as { path: string; type: string }[])
          .filter(
            (entry) =>
              entry.type === "blob" &&
              AUTO_FETCH_PATTERNS.some(
                (pattern) =>
                  entry.path === pattern ||
                  entry.path.endsWith(`/${pattern}`)
              )
          )
          .map((entry) => entry.path);

        // Fetch all key files in parallel
        const fileResults = await Promise.all(
          filesToFetch.map(async (path) => {
            try {
              const res = await fetch(
                `/api/github/repos/${owner}/${repoName}/file`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ path }),
                }
              );
              if (!res.ok) return null;
              const data = await res.json();
              return { path, content: data.content as string };
            } catch {
              return null;
            }
          })
        );

        for (const result of fileResults) {
          if (result && result.content) {
            const repoFile: RepoFile = {
              id: crypto.randomUUID(),
              path: result.path,
              content: result.content.slice(0, 50000),
              autoFetched: true,
            };
            addRepoFile(project.id, repoFile);
          }
        }
      }

      onProjectCreated(project);
    } catch {
      setError("Failed to set up project");
      setSelecting(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-surface-light rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-surface-light">
          <h2 className="text-lg font-semibold">Select a Repository</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-surface-light">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search repositories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-light border border-surface-lighter rounded-lg pl-10 pr-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-400 text-sm">
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-text-muted text-sm">
              No repositories found
            </div>
          ) : (
            filtered.map((repo) => (
              <button
                key={repo.id}
                onClick={() => handleSelect(repo)}
                disabled={selecting !== null}
                className="w-full text-left p-4 rounded-xl hover:bg-surface-light transition-colors flex items-start gap-3 disabled:opacity-50 cursor-pointer"
              >
                <div className="mt-0.5">
                  {repo.private ? (
                    <Lock className="w-4 h-4 text-text-muted" />
                  ) : (
                    <Globe className="w-4 h-4 text-text-muted" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{repo.name}</span>
                    {repo.language && (
                      <span className="text-xs text-primary-light bg-primary/10 px-2 py-0.5 rounded-full">
                        {repo.language}
                      </span>
                    )}
                    {repo.stargazers_count > 0 && (
                      <span className="text-xs text-accent">
                        {repo.stargazers_count}
                      </span>
                    )}
                  </div>
                  {repo.description && (
                    <p className="text-sm text-text-muted truncate mt-1">
                      {repo.description}
                    </p>
                  )}
                </div>
                {selecting === repo.id && (
                  <Loader2 className="w-4 h-4 text-primary animate-spin mt-1" />
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
