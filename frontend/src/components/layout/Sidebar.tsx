"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { projects as projectsApi } from "@/lib/api";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const pathname = usePathname();
  const [projectList, setProjectList] = useState<Project[]>([]);

  useEffect(() => {
    projectsApi.list().then(setProjectList).catch(console.error);
  }, [pathname]);

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col h-screen sticky top-0">
      <div className="p-4 border-b border-border">
        <Link href="/" className="text-xl font-bold text-primary">
          Vibemark
        </Link>
        <p className="text-xs text-muted-foreground mt-1">Marketing automation</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <Link
          href="/"
          className={cn(
            "block px-3 py-2 rounded-md text-sm font-medium transition-colors",
            pathname === "/"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          Dashboard
        </Link>

        <div className="pt-4 pb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Projects
        </div>

        {projectList.map((project) => {
          const isActive = pathname.startsWith(`/projects/${project.id}`);
          return (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className={cn(
                "block px-3 py-2 rounded-md text-sm transition-colors truncate",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {project.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <Link
          href="/projects/new"
          className="block w-full text-center px-3 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          + New Project
        </Link>
      </div>
    </aside>
  );
}
