"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { projects as projectsApi, config as configApi } from "@/lib/api";
import type { Project, VibemarkConfig } from "@/lib/types";

export default function ProjectOverview() {
  const params = useParams();
  const projectId = Number(params.id);
  const [project, setProject] = useState<Project | null>(null);
  const [cfg, setCfg] = useState<VibemarkConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([projectsApi.get(projectId), configApi.get(projectId)])
      .then(([p, c]) => {
        setProject(p);
        setCfg(c);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <div className="p-8 text-muted-foreground">Loading...</div>;
  if (error) return <div className="p-8 text-destructive">Error: {error}</div>;
  if (!project) return <div className="p-8">Project not found</div>;

  const insights = cfg?.insights;
  const hasInsights = insights && (
    insights.problem_statement ||
    insights.value_proposition ||
    insights.target_personas?.length > 0
  );

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground mt-1">{project.description}</p>
          )}
          <div className="flex gap-3 mt-2 text-sm text-muted-foreground">
            {project.language && <span>{project.language}</span>}
            {project.repo_url && (
              <a
                href={project.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Repository
              </a>
            )}
          </div>
        </div>
        <Link
          href={`/projects/${projectId}/settings`}
          className="px-3 py-1.5 text-sm rounded-md border border-input hover:bg-accent transition-colors"
        >
          Settings
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <ActionCard
          href={`/projects/${projectId}/interview`}
          title="Interview"
          description="Guided marketing discovery session"
          color="cyan"
        />
        <ActionCard
          href={`/projects/${projectId}/brainstorm`}
          title="Brainstorm"
          description="Open-ended strategy discussion"
          color="magenta"
        />
        <ActionCard
          href={`/projects/${projectId}/generate`}
          title="Generate"
          description="Create marketing content"
          color="green"
        />
        <ActionCard
          href={`/projects/${projectId}/content`}
          title="Content Library"
          description="View generated content"
          color="orange"
        />
      </div>

      {/* Marketing Insights Summary */}
      {hasInsights ? (
        <div className="border border-border rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-4">Marketing Insights</h2>
          <div className="space-y-4 text-sm">
            {insights.problem_statement && (
              <div>
                <h3 className="font-medium text-muted-foreground">Problem</h3>
                <p className="mt-1">{insights.problem_statement}</p>
              </div>
            )}
            {insights.value_proposition && (
              <div>
                <h3 className="font-medium text-muted-foreground">Value Proposition</h3>
                <p className="mt-1">{insights.value_proposition}</p>
              </div>
            )}
            {insights.target_personas?.length > 0 && (
              <div>
                <h3 className="font-medium text-muted-foreground">Target Personas</h3>
                <ul className="mt-1 list-disc list-inside">
                  {insights.target_personas.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
            {insights.differentiators?.length > 0 && (
              <div>
                <h3 className="font-medium text-muted-foreground">Differentiators</h3>
                <ul className="mt-1 list-disc list-inside">
                  {insights.differentiators.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-border rounded-lg p-8 text-center">
          <h2 className="text-lg font-medium mb-2">No insights yet</h2>
          <p className="text-muted-foreground mb-4">
            Start an interview to discover your marketing foundation.
          </p>
          <Link
            href={`/projects/${projectId}/interview`}
            className="inline-block px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Start Interview
          </Link>
        </div>
      )}
    </div>
  );
}

function ActionCard({
  href,
  title,
  description,
  color,
}: {
  href: string;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="block border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
    >
      <h3 className="font-semibold text-sm">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </Link>
  );
}
