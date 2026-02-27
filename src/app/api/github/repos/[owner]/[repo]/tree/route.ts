import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { owner, repo } = await params;
  const accessToken = (session as unknown as Record<string, unknown>).accessToken as string;

  // Get the default branch first
  const repoRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!repoRes.ok) {
    return NextResponse.json({ error: "Failed to fetch repo" }, { status: repoRes.status });
  }

  const repoData = await repoRes.json();
  const branch = repoData.default_branch;

  // Fetch the full recursive tree
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!treeRes.ok) {
    return NextResponse.json({ error: "Failed to fetch tree" }, { status: treeRes.status });
  }

  const treeData = await treeRes.json();

  // Filter to relevant files only (skip huge binary dirs, node_modules, etc.)
  const IGNORED_PREFIXES = [
    "node_modules/", ".git/", "vendor/", "dist/", "build/", ".next/",
    "__pycache__/", ".venv/", "venv/", ".cache/", "coverage/",
  ];

  const entries = (treeData.tree || [])
    .filter((entry: { path: string; type: string; size?: number }) => {
      if (IGNORED_PREFIXES.some((p) => entry.path.startsWith(p))) return false;
      // Skip large files (>200KB)
      if (entry.type === "blob" && entry.size && entry.size > 200000) return false;
      return true;
    })
    .map((entry: { path: string; type: string; size?: number }) => ({
      path: entry.path,
      type: entry.type,
      size: entry.size,
    }));

  return NextResponse.json({ entries });
}
