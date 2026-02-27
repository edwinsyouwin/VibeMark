"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  Sparkles,
  MessageSquare,
  BarChart3,
  FileText,
  ExternalLink,
} from "lucide-react";
import { getProject } from "@/lib/store";
import { Project } from "@/lib/types";
import ChatInterface from "@/components/chat-interface";
import AnalysisView from "@/components/analysis-view";
import DocumentUpload from "@/components/document-upload";

type Tab = "chat" | "analysis" | "documents";

export default function ProjectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("chat");

  const refreshProject = useCallback(() => {
    const p = getProject(projectId);
    if (p) setProject({ ...p });
  }, [projectId]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }
    refreshProject();
  }, [status, router, refreshProject]);

  if (status === "loading" || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-primary text-xl">Loading...</div>
      </div>
    );
  }

  if (!session) return null;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    {
      key: "chat",
      label: "Chat",
      icon: <MessageSquare className="w-4 h-4" />,
    },
    {
      key: "analysis",
      label: "Analysis",
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      key: "documents",
      label: "Documents",
      icon: <FileText className="w-4 h-4" />,
    },
  ];

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-surface-light shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-text-muted hover:text-text transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Sparkles className="w-5 h-5 text-accent" />
            <div>
              <h1 className="font-semibold">{project.repoName}</h1>
              <p className="text-xs text-text-muted">{project.repoFullName}</p>
            </div>
          </div>
          <a
            href={project.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text transition-colors"
          >
            View on GitHub
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </header>

      {/* Tab bar */}
      <div className="border-b border-surface-light shrink-0">
        <div className="max-w-7xl mx-auto px-4 flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === tab.key
                  ? "border-primary text-primary-light"
                  : "border-transparent text-text-muted hover:text-text"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.key === "analysis" && project.analysis && (
                <span className="w-2 h-2 bg-accent rounded-full" />
              )}
              {tab.key === "documents" && project.documents.length > 0 && (
                <span className="text-xs bg-surface-light rounded-full px-1.5">
                  {project.documents.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden max-w-7xl w-full mx-auto">
        {activeTab === "chat" && (
          <ChatInterface project={project} onUpdate={refreshProject} />
        )}
        {activeTab === "analysis" && (
          <>
            {project.analysis ? (
              <AnalysisView analysis={project.analysis} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <BarChart3 className="w-12 h-12 text-surface-lighter mb-4" />
                <p className="text-text-muted mb-2">No analysis yet</p>
                <p className="text-sm text-text-muted max-w-md">
                  Chat with your marketing consultant and share your story.
                  When you&apos;re ready, ask it to &ldquo;generate my marketing
                  analysis&rdquo; to see your strategy here.
                </p>
                <button
                  onClick={() => setActiveTab("chat")}
                  className="mt-4 text-sm text-primary-light hover:text-primary transition-colors cursor-pointer"
                >
                  Go to Chat
                </button>
              </div>
            )}
          </>
        )}
        {activeTab === "documents" && (
          <div className="p-6 max-w-2xl">
            <DocumentUpload
              projectId={project.id}
              documents={project.documents}
              onUpdate={refreshProject}
            />
            <div className="mt-6 text-sm text-text-muted">
              <p>
                Upload any additional context that helps the AI understand your
                product better:
              </p>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Product briefs or pitch deck text</li>
                <li>User feedback or testimonials</li>
                <li>Competitor notes</li>
                <li>Your personal story / motivation</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
