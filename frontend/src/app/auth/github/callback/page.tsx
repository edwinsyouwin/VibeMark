"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { github } from "@/lib/api";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Connecting to GitHub...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setError("No authorization code received from GitHub.");
      return;
    }

    github
      .callback(code)
      .then((result) => {
        setStatus(`Connected as ${result.username}! Redirecting...`);
        setTimeout(() => router.push("/"), 1500);
      })
      .catch((e) => setError(e.message));
  }, [searchParams, router]);

  return (
    <div className="p-8 max-w-md mx-auto mt-20 text-center">
      <h1 className="text-xl font-bold mb-4">GitHub Authorization</h1>
      {error ? (
        <div>
          <p className="text-destructive mb-4">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Go to Dashboard
          </button>
        </div>
      ) : (
        <p className="text-muted-foreground">{status}</p>
      )}
    </div>
  );
}

export default function GitHubCallbackPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
      <CallbackContent />
    </Suspense>
  );
}
