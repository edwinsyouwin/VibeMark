"use client";

import {
  Quote,
  Users,
  Megaphone,
  Target,
  MessageCircle,
  Zap,
} from "lucide-react";
import { MarketingAnalysis } from "@/lib/types";

interface AnalysisViewProps {
  analysis: MarketingAnalysis;
}

export default function AnalysisView({ analysis }: AnalysisViewProps) {
  return (
    <div className="p-6 space-y-8 overflow-y-auto h-full">
      {/* Story */}
      <section>
        <SectionHeader icon={<Quote className="w-5 h-5" />} title="Your Story" />
        <p className="text-text-muted text-sm leading-relaxed">
          {analysis.story}
        </p>
      </section>

      {/* Tagline */}
      <section>
        <SectionHeader icon={<Zap className="w-5 h-5" />} title="Tagline" />
        <p className="text-2xl font-bold text-primary-light">
          &ldquo;{analysis.tagline}&rdquo;
        </p>
      </section>

      {/* Elevator Pitch */}
      <section>
        <SectionHeader
          icon={<Megaphone className="w-5 h-5" />}
          title="Elevator Pitch"
        />
        <div className="bg-surface-light rounded-xl p-4 border border-surface-lighter">
          <p className="text-sm leading-relaxed italic">
            {analysis.elevatorPitch}
          </p>
        </div>
      </section>

      {/* User Personas */}
      <section>
        <SectionHeader
          icon={<Users className="w-5 h-5" />}
          title="User Personas"
        />
        <div className="grid gap-4 md:grid-cols-2">
          {analysis.userPersonas.map((persona, i) => (
            <div
              key={i}
              className="bg-surface-light rounded-xl p-5 border border-surface-lighter"
            >
              <h4 className="font-semibold text-primary-light mb-2">
                {persona.name}
              </h4>
              <p className="text-sm text-text-muted mb-3">
                {persona.description}
              </p>

              <div className="mb-3">
                <span className="text-xs font-medium text-accent uppercase tracking-wide">
                  Pain Points
                </span>
                <ul className="mt-1 space-y-1">
                  {persona.painPoints.map((p, j) => (
                    <li
                      key={j}
                      className="text-xs text-text-muted flex items-start gap-1.5"
                    >
                      <span className="text-red-400 mt-0.5">-</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-3">
                <span className="text-xs font-medium text-green-400 uppercase tracking-wide">
                  Value Proposition
                </span>
                <p className="text-xs text-text-muted mt-1">
                  {persona.valueProp}
                </p>
              </div>

              <div>
                <span className="text-xs font-medium text-blue-400 uppercase tracking-wide">
                  Channels
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {persona.channels.map((c, j) => (
                    <span
                      key={j}
                      className="text-xs bg-surface rounded px-2 py-0.5 text-text-muted"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Key Messages */}
      <section>
        <SectionHeader
          icon={<MessageCircle className="w-5 h-5" />}
          title="Key Marketing Messages"
        />
        <div className="space-y-2">
          {analysis.keyMessages.map((msg, i) => (
            <div
              key={i}
              className="flex items-start gap-3 bg-surface-light rounded-lg px-4 py-3 border border-surface-lighter"
            >
              <span className="text-accent font-bold text-sm">{i + 1}</span>
              <p className="text-sm text-text-muted">{msg}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Channel Strategy */}
      <section>
        <SectionHeader
          icon={<Target className="w-5 h-5" />}
          title="Channel Strategy"
        />
        <div className="space-y-2">
          {analysis.channelStrategy.map((strategy, i) => (
            <div
              key={i}
              className="flex items-start gap-3 bg-surface-light rounded-lg px-4 py-3 border border-surface-lighter"
            >
              <Zap className="w-4 h-4 text-primary-light shrink-0 mt-0.5" />
              <p className="text-sm text-text-muted">{strategy}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-accent">{icon}</span>
      <h3 className="text-lg font-semibold">{title}</h3>
    </div>
  );
}
