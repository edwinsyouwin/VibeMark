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

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/readme`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3.raw",
      },
    }
  );

  if (!res.ok) {
    return NextResponse.json({ content: null });
  }

  const content = await res.text();
  return NextResponse.json({ content });
}
