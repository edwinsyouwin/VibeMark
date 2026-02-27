"use client";

import { useState, useRef } from "react";
import { Upload, FileText, X, Plus } from "lucide-react";
import { UploadedDocument } from "@/lib/types";
import { addDocument, removeDocument } from "@/lib/store";

interface DocumentUploadProps {
  projectId: string;
  documents: UploadedDocument[];
  onUpdate: () => void;
}

export default function DocumentUpload({
  projectId,
  documents,
  onUpdate,
}: DocumentUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const text = await file.text();
    const ext = file.name.split(".").pop()?.toLowerCase();
    let type: UploadedDocument["type"] = "text";
    if (ext === "md" || ext === "markdown") type = "markdown";

    const doc: UploadedDocument = {
      id: crypto.randomUUID(),
      name: file.name,
      content: text.slice(0, 50000), // cap at 50k chars
      type,
    };

    addDocument(projectId, doc);
    onUpdate();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(handleFile);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(handleFile);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemove = (docId: string) => {
    removeDocument(projectId, docId);
    onUpdate();
  };

  return (
    <div>
      <h3 className="text-sm font-medium text-text-muted mb-3">
        Additional Documents
      </h3>

      {/* Upload area */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-surface-lighter hover:border-surface-lighter/80"
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-6 h-6 text-text-muted mx-auto mb-2" />
        <p className="text-sm text-text-muted">
          Drop files here or click to upload
        </p>
        <p className="text-xs text-text-muted mt-1">
          .txt, .md, .json — product briefs, pitch decks, notes
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".txt,.md,.markdown,.json,.csv"
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {/* Document list */}
      {documents.length > 0 && (
        <div className="mt-3 space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 bg-surface-light rounded-lg px-3 py-2"
            >
              <FileText className="w-4 h-4 text-primary-light shrink-0" />
              <span className="text-sm truncate flex-1">{doc.name}</span>
              <span className="text-xs text-text-muted">
                {(doc.content.length / 1000).toFixed(1)}k chars
              </span>
              <button
                onClick={() => handleRemove(doc.id)}
                className="text-text-muted hover:text-red-400 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {documents.length > 0 && (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary-light hover:text-primary transition-colors cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          Add more
        </button>
      )}
    </div>
  );
}
