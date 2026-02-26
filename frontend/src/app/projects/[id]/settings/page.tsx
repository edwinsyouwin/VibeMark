"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  projects as projectsApi,
  config as configApi,
} from "@/lib/api";
import type { Project, VibemarkConfig } from "@/lib/types";

export default function ProjectSettings() {
  const params = useParams();
  const router = useRouter();
  const projectId = Number(params.id);

  const [project, setProject] = useState<Project | null>(null);
  const [cfg, setCfg] = useState<VibemarkConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("");
  const [tone, setTone] = useState("");
  const [audience, setAudience] = useState("");
  const [tagline, setTagline] = useState("");
  const [keywords, setKeywords] = useState("");
  const [features, setFeatures] = useState("");

  useEffect(() => {
    Promise.all([projectsApi.get(projectId), configApi.get(projectId)])
      .then(([p, c]) => {
        setProject(p);
        setCfg(c);
        setName(p.name);
        setDescription(p.description);
        setLanguage(p.language);
        setTone(c.brand?.tone || "");
        setAudience(c.brand?.audience || "");
        setTagline(c.brand?.tagline || "");
        setKeywords(c.brand?.keywords?.join(", ") || "");
        setFeatures(c.project?.features?.join(", ") || "");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!project || !cfg) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await projectsApi.update(projectId, {
        name,
        description,
        language,
      });

      const updatedConfig: VibemarkConfig = {
        ...cfg,
        project: {
          ...cfg.project,
          name,
          description,
          language,
          features: features.split(",").map((s) => s.trim()).filter(Boolean),
        },
        brand: {
          ...cfg.brand,
          tone,
          audience,
          tagline,
          keywords: keywords.split(",").map((s) => s.trim()).filter(Boolean),
        },
      };
      await configApi.update(projectId, updatedConfig);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    try {
      await projectsApi.delete(projectId);
      router.push("/");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (loading) return <div className="p-8 text-muted-foreground">Loading...</div>;
  if (error && !project) return <div className="p-8 text-destructive">Error: {error}</div>;

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Project Settings</h1>

      <form onSubmit={handleSave} className="space-y-5">
        <fieldset className="space-y-4">
          <legend className="text-lg font-semibold mb-2">Project Info</legend>
          <Field label="Name" value={name} onChange={setName} required />
          <Field label="Description" value={description} onChange={setDescription} multiline />
          <Field label="Language" value={language} onChange={setLanguage} />
          <Field
            label="Features"
            value={features}
            onChange={setFeatures}
            placeholder="Comma-separated features"
          />
        </fieldset>

        <fieldset className="space-y-4 pt-4 border-t border-border">
          <legend className="text-lg font-semibold mb-2">Brand Voice</legend>
          <Field label="Tone" value={tone} onChange={setTone} placeholder="e.g. professional yet approachable" />
          <Field label="Audience" value={audience} onChange={setAudience} placeholder="e.g. frontend developers" />
          <Field label="Tagline" value={tagline} onChange={setTagline} />
          <Field
            label="Keywords"
            value={keywords}
            onChange={setKeywords}
            placeholder="Comma-separated keywords"
          />
        </fieldset>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-green-600">Settings saved!</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 rounded-md text-sm font-medium border border-input hover:bg-accent transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>

      <div className="mt-12 pt-6 border-t border-border">
        <h2 className="text-lg font-semibold text-destructive mb-3">Danger Zone</h2>
        <button
          onClick={handleDelete}
          className="px-4 py-2 rounded-md text-sm font-medium border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
        >
          Delete Project
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
}) {
  const cls =
    "w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cls}
          rows={3}
          placeholder={placeholder}
          required={required}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cls}
          placeholder={placeholder}
          required={required}
        />
      )}
    </div>
  );
}
