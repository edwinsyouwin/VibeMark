export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
  private: boolean;
}

export interface UploadedDocument {
  id: string;
  name: string;
  content: string;
  type: "text" | "markdown" | "pdf";
}

export interface Project {
  id: string;
  repoName: string;
  repoFullName: string;
  repoDescription: string | null;
  repoUrl: string;
  repoLanguage: string | null;
  documents: UploadedDocument[];
  readmeContent: string | null;
  chatHistory: ChatMessage[];
  analysis: MarketingAnalysis | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface UserPersona {
  name: string;
  description: string;
  painPoints: string[];
  valueProp: string;
  channels: string[];
}

export interface MarketingAnalysis {
  story: string;
  tagline: string;
  elevatorPitch: string;
  userPersonas: UserPersona[];
  keyMessages: string[];
  channelStrategy: string[];
}
