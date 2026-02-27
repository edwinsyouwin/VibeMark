"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Folder,
  FileCode,
  FileText,
  ChevronRight,
  ChevronDown,
  Loader2,
  Check,
  Plus,
  X,
  Search,
  FolderTree,
  RefreshCw,
} from "lucide-react";
import { RepoFile, TreeEntry } from "@/lib/types";
import { addRepoFile, removeRepoFile } from "@/lib/store";

interface FileBrowserProps {
  projectId: string;
  repoFullName: string;
  repoFiles: RepoFile[];
  onUpdate: () => void;
}

interface TreeNode {
  name: string;
  path: string;
  type: "blob" | "tree";
  size?: number;
  children: TreeNode[];
}

function buildTree(entries: TreeEntry[]): TreeNode[] {
  const root: TreeNode[] = [];
  const map = new Map<string, TreeNode>();

  // Sort: directories first, then alphabetically
  const sorted = [...entries].sort((a, b) => {
    if (a.type !== b.type) return a.type === "tree" ? -1 : 1;
    return a.path.localeCompare(b.path);
  });

  for (const entry of sorted) {
    const parts = entry.path.split("/");
    const node: TreeNode = {
      name: parts[parts.length - 1],
      path: entry.path,
      type: entry.type,
      size: entry.size,
      children: [],
    };
    map.set(entry.path, node);

    if (parts.length === 1) {
      root.push(node);
    } else {
      const parentPath = parts.slice(0, -1).join("/");
      const parent = map.get(parentPath);
      if (parent) {
        parent.children.push(node);
      } else {
        root.push(node);
      }
    }
  }

  return root;
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  const codeExts = [
    "ts", "tsx", "js", "jsx", "py", "rs", "go", "rb", "java",
    "c", "cpp", "h", "cs", "swift", "kt", "vue", "svelte",
  ];
  if (ext && codeExts.includes(ext)) {
    return <FileCode className="w-4 h-4 text-primary-light" />;
  }
  return <FileText className="w-4 h-4 text-text-muted" />;
}

function formatSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function TreeNodeRow({
  node,
  depth,
  expanded,
  toggleExpand,
  selectedPaths,
  loadingPaths,
  onToggleFile,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  toggleExpand: (path: string) => void;
  selectedPaths: Set<string>;
  loadingPaths: Set<string>;
  onToggleFile: (node: TreeNode) => void;
}) {
  const isExpanded = expanded.has(node.path);
  const isSelected = selectedPaths.has(node.path);
  const isLoading = loadingPaths.has(node.path);
  const isDir = node.type === "tree";

  return (
    <>
      <div
        className={`flex items-center gap-1.5 py-1 px-2 rounded hover:bg-surface-lighter/50 transition-colors text-sm group ${
          isSelected ? "bg-primary/10" : ""
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {isDir ? (
          <button
            onClick={() => toggleExpand(node.path)}
            className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer"
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-text-muted shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-text-muted shrink-0" />
            )}
            <Folder className="w-4 h-4 text-accent shrink-0" />
            <span className="truncate">{node.name}</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="w-3.5" />
            {getFileIcon(node.name)}
            <span className="truncate">{node.name}</span>
            {node.size && (
              <span className="text-xs text-text-muted ml-auto shrink-0">
                {formatSize(node.size)}
              </span>
            )}
          </div>
        )}
        {!isDir && (
          <button
            onClick={() => onToggleFile(node)}
            disabled={isLoading}
            className="shrink-0 p-1 rounded transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
            ) : isSelected ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Plus className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </button>
        )}
      </div>
      {isDir &&
        isExpanded &&
        node.children.map((child) => (
          <TreeNodeRow
            key={child.path}
            node={child}
            depth={depth + 1}
            expanded={expanded}
            toggleExpand={toggleExpand}
            selectedPaths={selectedPaths}
            loadingPaths={loadingPaths}
            onToggleFile={onToggleFile}
          />
        ))}
    </>
  );
}

export default function FileBrowser({
  projectId,
  repoFullName,
  repoFiles,
  onUpdate,
}: FileBrowserProps) {
  const [tree, setTree] = useState<TreeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [treeLoaded, setTreeLoaded] = useState(false);

  const [owner, repo] = repoFullName.split("/");
  const selectedPaths = useMemo(
    () => new Set(repoFiles.map((f) => f.path)),
    [repoFiles]
  );

  const fetchTree = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/github/repos/${owner}/${repo}/tree`);
      if (!res.ok) throw new Error("Failed to load file tree");
      const data = await res.json();
      setTree(data.entries || []);
      setTreeLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tree");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoFullName]);

  const treeNodes = useMemo(() => buildTree(tree), [tree]);

  const filteredNodes = useMemo(() => {
    if (!search.trim()) return treeNodes;
    // When searching, show flat list of matching files
    return tree
      .filter(
        (e) =>
          e.type === "blob" &&
          e.path.toLowerCase().includes(search.toLowerCase())
      )
      .map((e) => ({
        name: e.path,
        path: e.path,
        type: e.type as "blob",
        size: e.size,
        children: [],
      }));
  }, [treeNodes, tree, search]);

  const toggleExpand = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleToggleFile = async (node: TreeNode) => {
    if (selectedPaths.has(node.path)) {
      const file = repoFiles.find((f) => f.path === node.path);
      if (file) {
        removeRepoFile(projectId, file.id);
        onUpdate();
      }
      return;
    }

    setLoadingPaths((prev) => new Set(prev).add(node.path));
    try {
      const res = await fetch(`/api/github/repos/${owner}/${repo}/file`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: node.path }),
      });
      if (!res.ok) throw new Error("Failed to fetch file");
      const data = await res.json();
      const repoFile: RepoFile = {
        id: crypto.randomUUID(),
        path: node.path,
        content: (data.content as string).slice(0, 50000),
        autoFetched: false,
      };
      addRepoFile(projectId, repoFile);
      onUpdate();
    } catch {
      // Silently fail for individual files
    } finally {
      setLoadingPaths((prev) => {
        const next = new Set(prev);
        next.delete(node.path);
        return next;
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Selected files summary */}
      {repoFiles.length > 0 && (
        <div className="p-4 border-b border-surface-light">
          <h3 className="text-sm font-medium text-text-muted mb-2">
            Included Files ({repoFiles.length})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {repoFiles.map((file) => (
              <span
                key={file.id}
                className={`inline-flex items-center gap-1 text-xs rounded-full px-2.5 py-1 ${
                  file.autoFetched
                    ? "bg-accent/10 text-accent"
                    : "bg-primary/10 text-primary-light"
                }`}
              >
                {file.path.split("/").pop()}
                <button
                  onClick={() => {
                    removeRepoFile(projectId, file.id);
                    onUpdate();
                  }}
                  className="hover:text-red-400 transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <p className="text-xs text-text-muted mt-2">
            <span className="text-accent">Auto-fetched</span> files are detected config/docs.
            <span className="text-primary-light ml-1">Selected</span> files were chosen by you.
          </p>
        </div>
      )}

      {/* Search */}
      <div className="p-3 border-b border-surface-light">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-light border border-surface-lighter rounded-lg pl-10 pr-4 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-400 text-sm mb-3">{error}</p>
            <button
              onClick={fetchTree}
              className="inline-flex items-center gap-1.5 text-sm text-primary-light hover:text-primary transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        ) : !treeLoaded ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FolderTree className="w-10 h-10 text-surface-lighter mb-3" />
            <p className="text-text-muted text-sm">Loading repository files...</p>
          </div>
        ) : filteredNodes.length === 0 ? (
          <div className="text-center py-12 text-text-muted text-sm">
            {search ? "No files match your search" : "No files found in repository"}
          </div>
        ) : (
          filteredNodes.map((node) => (
            <TreeNodeRow
              key={node.path}
              node={node}
              depth={0}
              expanded={expanded}
              toggleExpand={toggleExpand}
              selectedPaths={selectedPaths}
              loadingPaths={loadingPaths}
              onToggleFile={handleToggleFile}
            />
          ))
        )}
      </div>
    </div>
  );
}
