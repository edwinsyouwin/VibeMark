import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = (session as unknown as Record<string, unknown>).accessToken as string;

  const res = await fetch(
    "https://api.github.com/user/repos?sort=updated&per_page=100&type=owner",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch repos" },
      { status: res.status }
    );
  }

  const repos = await res.json();
  return NextResponse.json(repos);
}
