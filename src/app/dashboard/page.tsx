"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Plus,
  Sparkles,
  FolderGit2,
  Trash2,
  LogOut,
  ArrowRight,
} from "lucide-react";
import { getAllProjects, deleteProject } from "@/lib/store";
import { Project } from "@/lib/types";
import RepoSelector from "@/components/repo-selector";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showRepoSelector, setShowRepoSelector] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    setProjects(getAllProjects());
  }, []);

  const handleDelete = (id: string) => {
    deleteProject(id);
    setProjects(getAllProjects());
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-primary text-xl">Loading...</div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-surface-light">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-accent" />
            <span className="text-xl font-bold">
              Vibe<span className="text-primary-light">Mark</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-text-muted">
              {session.user?.name}
            </span>
            <button
              onClick={() => signOut()}
              className="text-text-muted hover:text-text transition-colors cursor-pointer"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Your Projects</h1>
          <button
            onClick={() => setShowRepoSelector(true)}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-light text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>

        {projects.length === 0 && !showRepoSelector ? (
          <div className="text-center py-20">
            <FolderGit2 className="w-12 h-12 text-surface-lighter mx-auto mb-4" />
            <p className="text-text-muted mb-4">No projects yet</p>
            <button
              onClick={() => setShowRepoSelector(true)}
              className="inline-flex items-center gap-2 bg-surface hover:bg-surface-light border border-surface-light text-text px-5 py-2.5 rounded-lg text-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Connect a GitHub repo to get started
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-surface border border-surface-light rounded-xl p-5 flex items-center justify-between group"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">
                    {project.repoName}
                  </h3>
                  <p className="text-text-muted text-sm truncate">
                    {project.repoFullName}
                    {project.repoLanguage && (
                      <span className="ml-2 text-primary-light">
                        {project.repoLanguage}
                      </span>
                    )}
                  </p>
                  {project.analysis && (
                    <p className="text-accent text-xs mt-1">
                      Analysis complete
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="p-2 text-text-muted hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => router.push(`/project/${project.id}`)}
                    className="inline-flex items-center gap-1.5 bg-primary/20 hover:bg-primary/30 text-primary-light px-4 py-2 rounded-lg text-sm transition-colors cursor-pointer"
                  >
                    Open
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showRepoSelector && (
          <RepoSelector
            onClose={() => setShowRepoSelector(false)}
            onProjectCreated={(project) => {
              setProjects(getAllProjects());
              setShowRepoSelector(false);
              router.push(`/project/${project.id}`);
            }}
          />
        )}
      </div>
    </div>
  );
}
