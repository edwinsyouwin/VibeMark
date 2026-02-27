"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sparkles, Github, Target, MessageSquare, Users } from "lucide-react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-primary text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 pt-20 pb-16">
        <div className="text-center animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Sparkles className="w-10 h-10 text-accent" />
            <h1 className="text-5xl font-bold tracking-tight">
              Vibe<span className="text-primary-light">Mark</span>
            </h1>
          </div>
          <p className="text-xl text-text-muted max-w-2xl mx-auto mb-4">
            Your AI marketing consultant for vibecoded apps
          </p>
          <p className="text-text-muted max-w-xl mx-auto mb-10">
            Connect your GitHub repo. Share your story. Get a real marketing
            strategy — taglines, personas, channels, and messaging — tailored
            for solopreneurs.
          </p>
          <button
            onClick={() => signIn("github")}
            className="inline-flex items-center gap-3 bg-primary hover:bg-primary-light text-white px-8 py-4 rounded-xl text-lg font-medium transition-colors cursor-pointer"
          >
            <Github className="w-6 h-6" />
            Sign in with GitHub
          </button>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Github className="w-7 h-7 text-primary-light" />}
            title="Connect Your Repo"
            description="Link your GitHub repository so VibeMark can understand your product — its tech, structure, and purpose."
          />
          <FeatureCard
            icon={<MessageSquare className="w-7 h-7 text-primary-light" />}
            title="Tell Your Story"
            description="Chat with your AI marketing consultant. Share context, goals, and vision. Upload extra docs for deeper insight."
          />
          <FeatureCard
            icon={<Target className="w-7 h-7 text-primary-light" />}
            title="Get Your Strategy"
            description="Receive personas, taglines, elevator pitches, and channel strategies built specifically for your product."
          />
        </div>
      </div>

      {/* Social proof / motivation */}
      <div className="border-t border-surface-light py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <Users className="w-8 h-8 text-accent mx-auto mb-4" />
          <p className="text-lg text-text-muted italic">
            &ldquo;You built something amazing with AI. Now let AI help you find
            the people who need it.&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-surface rounded-xl p-6 border border-surface-light">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-text-muted text-sm leading-relaxed">{description}</p>
    </div>
  );
}
