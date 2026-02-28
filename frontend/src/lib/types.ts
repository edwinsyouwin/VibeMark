/** TypeScript types mirroring the Python Pydantic models. */

export interface Project {
  id: number;
  name: string;
  description: string;
  language: string;
  repo_url: string;
  github_repo_full_name: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  name: string;
  description?: string;
  language?: string;
  repo_url?: string;
  github_repo_full_name?: string;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
  language?: string;
  repo_url?: string;
  github_repo_full_name?: string;
}

export interface ProjectProfile {
  name: string;
  description: string;
  language: string;
  frameworks: string[];
  features: string[];
  repo_url: string;
  license: string;
  readme_content: string;
}

export interface MarketingInsights {
  problem_statement: string;
  target_personas: string[];
  value_proposition: string;
  differentiators: string[];
  use_cases: string[];
  competitors: string[];
  origin_story: string;
  goals: string[];
}

export interface BrandVoice {
  tone: string;
  audience: string;
  tagline: string;
  keywords: string[];
}

export interface VibemarkConfig {
  project: ProjectProfile;
  brand: BrandVoice;
  insights: MarketingInsights;
  model: string;
}

export type Channel = "social" | "landing" | "readme";

export interface Conversation {
  id: number;
  project_id: number;
  conversation_type: "interview" | "brainstorm";
  topic: string;
  current_topic_index: number;
  status: "active" | "finished";
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface GeneratedContentRecord {
  id: number;
  project_id: number;
  channel: Channel;
  content: string;
  model_used: string;
  prompt_tokens: number | null;
  output_tokens: number | null;
  created_at: string;
}

export interface GitHubRepo {
  id: number;
  full_name: string;
  name: string;
  description: string | null;
  language: string | null;
  html_url: string;
  private: boolean;
}
