"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { projects as projectsApi } from "@/lib/api";
import type { Project } from "@/lib/types";

export default function Dashboard() {
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    projectsApi
      .list()
      .then(setProjectList)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Loading projects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <p className="text-destructive">Error: {error}</p>
        <p className="text-sm text-muted-foreground mt-2">
          Make sure the API server is running on port 8000.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Your marketing automation projects
          </p>
        </div>
        <Link
          href="/projects/new"
          className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          + New Project
        </Link>
      </div>

      {projectList.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <h2 className="text-lg font-medium mb-2">No projects yet</h2>
          <p className="text-muted-foreground mb-4">
            Create your first project to get started with marketing automation.
          </p>
          <Link
            href="/projects/new"
            className="inline-block px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Create Project
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {projectList.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="block border border-border rounded-lg p-5 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{project.name}</h2>
                  {project.description && (
                    <p className="text-muted-foreground mt-1 text-sm">
                      {project.description}
                    </p>
                  )}
                </div>
                {project.language && (
                  <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                    {project.language}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Updated {new Date(project.updated_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
