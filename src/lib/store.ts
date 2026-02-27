"use client";

import { Project, ChatMessage, UploadedDocument, MarketingAnalysis, RepoFile } from "./types";

const STORAGE_KEY = "vibemark_projects";

function getProjects(): Project[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveProjects(projects: Project[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function getAllProjects(): Project[] {
  return getProjects();
}

export function getProject(id: string): Project | undefined {
  return getProjects().find((p) => p.id === id);
}

export function createProject(
  repo: {
    name: string;
    full_name: string;
    description: string | null;
    html_url: string;
    language: string | null;
  },
  readmeContent: string | null
): Project {
  const projects = getProjects();
  const project: Project = {
    id: crypto.randomUUID(),
    repoName: repo.name,
    repoFullName: repo.full_name,
    repoDescription: repo.description,
    repoUrl: repo.html_url,
    repoLanguage: repo.language,
    documents: [],
    repoFiles: [],
    readmeContent,
    chatHistory: [],
    analysis: null,
  };
  projects.push(project);
  saveProjects(projects);
  return project;
}

export function addDocument(projectId: string, doc: UploadedDocument) {
  const projects = getProjects();
  const project = projects.find((p) => p.id === projectId);
  if (project) {
    project.documents.push(doc);
    saveProjects(projects);
  }
}

export function removeDocument(projectId: string, docId: string) {
  const projects = getProjects();
  const project = projects.find((p) => p.id === projectId);
  if (project) {
    project.documents = project.documents.filter((d) => d.id !== docId);
    saveProjects(projects);
  }
}

export function addChatMessage(projectId: string, message: ChatMessage) {
  const projects = getProjects();
  const project = projects.find((p) => p.id === projectId);
  if (project) {
    project.chatHistory.push(message);
    saveProjects(projects);
  }
}

export function updateAnalysis(projectId: string, analysis: MarketingAnalysis) {
  const projects = getProjects();
  const project = projects.find((p) => p.id === projectId);
  if (project) {
    project.analysis = analysis;
    saveProjects(projects);
  }
}

export function addRepoFile(projectId: string, file: RepoFile) {
  const projects = getProjects();
  const project = projects.find((p) => p.id === projectId);
  if (project) {
    // Avoid duplicates by path
    if (!project.repoFiles.find((f) => f.path === file.path)) {
      project.repoFiles.push(file);
      saveProjects(projects);
    }
  }
}

export function removeRepoFile(projectId: string, fileId: string) {
  const projects = getProjects();
  const project = projects.find((p) => p.id === projectId);
  if (project) {
    project.repoFiles = project.repoFiles.filter((f) => f.id !== fileId);
    saveProjects(projects);
  }
}

export function deleteProject(projectId: string) {
  const projects = getProjects().filter((p) => p.id !== projectId);
  saveProjects(projects);
}
