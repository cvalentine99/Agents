import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Check, 
  X, 
  RotateCcw, 
  Play,
  ChevronDown,
  ChevronRight,
  FileCode,
  Plus,
  Minus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface DiffHunk {
  id: string;
  header: string;
  lines: DiffLine[];
  approved: boolean | null; // null = pending, true = approved, false = denied
}

interface DiffLine {
  type: "context" | "addition" | "deletion";
  content: string;
  lineNumber: {
    old?: number;
    new?: number;
  };
}

interface DiffFile {
  path: string;
  hunks: DiffHunk[];
  expanded: boolean;
}

interface DiffViewerProps {
  files: DiffFile[];
  onApproveHunk: (fileIndex: number, hunkId: string) => void;
  onDenyHunk: (fileIndex: number, hunkId: string) => void;
  onApplyApproved: () => void;
  onRollback: () => void;
  onToggleFile: (fileIndex: number) => void;
  hasCheckpoint: boolean;
}

export function DiffViewer({
  files,
  onApproveHunk,
  onDenyHunk,
  onApplyApproved,
  onRollback,
  onToggleFile,
  hasCheckpoint,
}: DiffViewerProps) {
  const totalHunks = files.reduce((acc, f) => acc + f.hunks.length, 0);
  const approvedHunks = files.reduce(
    (acc, f) => acc + f.hunks.filter(h => h.approved === true).length, 
    0
  );
  const deniedHunks = files.reduce(
    (acc, f) => acc + f.hunks.filter(h => h.approved === false).length, 
    0
  );
  const pendingHunks = totalHunks - approvedHunks - deniedHunks;

  return (
    <div className="cyber-card p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-cyber text-xl font-bold neon-text-purple">
          DIFF VIEWER
        </h2>
        <div className="flex items-center gap-4">
          {/* Stats */}
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-[var(--status-success)]">
              <Check className="w-3 h-3 inline mr-1" />
              {approvedHunks}
            </span>
            <span className="text-[var(--status-error)]">
              <X className="w-3 h-3 inline mr-1" />
              {deniedHunks}
            </span>
            <span className="text-[var(--text-muted)]">
              {pendingHunks} pending
            </span>
          </div>
        </div>
      </div>

      {/* File List */}
      <div className="space-y-4">
        {files.map((file, fileIndex) => (
          <div key={file.path} className="cyber-glass rounded overflow-hidden">
            {/* File Header */}
            <button
              className="w-full flex items-center gap-3 p-3 hover:bg-[var(--bg-surface)] transition-colors"
              onClick={() => onToggleFile(fileIndex)}
            >
              {file.expanded ? (
                <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
              )}
              <FileCode className="w-4 h-4 text-[var(--cyber-cyan)]" />
              <span className="font-mono text-sm text-[var(--text-primary)] flex-1 text-left truncate">
                {file.path}
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                {file.hunks.length} hunk{file.hunks.length !== 1 ? "s" : ""}
              </span>
            </button>

            {/* Hunks */}
            <AnimatePresence>
              {file.expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  {file.hunks.map((hunk) => (
                    <HunkView
                      key={hunk.id}
                      hunk={hunk}
                      onApprove={() => onApproveHunk(fileIndex, hunk.id)}
                      onDeny={() => onDenyHunk(fileIndex, hunk.id)}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          className="border-[var(--text-muted)] text-[var(--text-muted)] hover:bg-[var(--bg-surface)]"
          onClick={onRollback}
          disabled={!hasCheckpoint}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Rollback to Checkpoint
        </Button>

        <Button
          className="cyber-btn"
          onClick={onApplyApproved}
          disabled={approvedHunks === 0}
        >
          <Play className="w-4 h-4 mr-2" />
          Apply {approvedHunks} Approved Hunk{approvedHunks !== 1 ? "s" : ""}
        </Button>
      </div>
    </div>
  );
}

interface HunkViewProps {
  hunk: DiffHunk;
  onApprove: () => void;
  onDeny: () => void;
}

function HunkView({ hunk, onApprove, onDeny }: HunkViewProps) {
  return (
    <div 
      className={`border-t border-[var(--color-border)] ${
        hunk.approved === true 
          ? "bg-[var(--status-success)]/5" 
          : hunk.approved === false 
            ? "bg-[var(--status-error)]/5" 
            : ""
      }`}
    >
      {/* Hunk Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-void)]">
        <span className="font-mono text-xs text-[var(--cyber-cyan)]">
          {hunk.header}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 px-2 ${
              hunk.approved === true 
                ? "bg-[var(--status-success)]/20 text-[var(--status-success)]" 
                : "hover:bg-[var(--status-success)]/10 hover:text-[var(--status-success)]"
            }`}
            onClick={onApprove}
          >
            <Check className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 px-2 ${
              hunk.approved === false 
                ? "bg-[var(--status-error)]/20 text-[var(--status-error)]" 
                : "hover:bg-[var(--status-error)]/10 hover:text-[var(--status-error)]"
            }`}
            onClick={onDeny}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Diff Lines */}
      <div className="font-mono text-xs overflow-x-auto">
        {hunk.lines.map((line, index) => (
          <div
            key={index}
            className={`flex ${
              line.type === "addition"
                ? "bg-[var(--status-success)]/10"
                : line.type === "deletion"
                  ? "bg-[var(--status-error)]/10"
                  : ""
            }`}
          >
            {/* Line Numbers */}
            <div className="flex-shrink-0 w-20 flex text-[var(--text-muted)] select-none border-r border-[var(--color-border)]">
              <span className="w-10 px-2 text-right">
                {line.lineNumber.old || ""}
              </span>
              <span className="w-10 px-2 text-right">
                {line.lineNumber.new || ""}
              </span>
            </div>

            {/* Line Content */}
            <div className="flex-1 flex items-center">
              <span 
                className={`w-6 text-center flex-shrink-0 ${
                  line.type === "addition"
                    ? "text-[var(--status-success)]"
                    : line.type === "deletion"
                      ? "text-[var(--status-error)]"
                      : "text-[var(--text-muted)]"
                }`}
              >
                {line.type === "addition" ? (
                  <Plus className="w-3 h-3 inline" />
                ) : line.type === "deletion" ? (
                  <Minus className="w-3 h-3 inline" />
                ) : (
                  " "
                )}
              </span>
              <pre className="flex-1 px-2 py-0.5 whitespace-pre">
                {line.content}
              </pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper to parse unified diff format
export function parseDiff(diffText: string): DiffFile[] {
  const files: DiffFile[] = [];
  const lines = diffText.split("\n");
  
  let currentFile: DiffFile | null = null;
  let currentHunk: DiffHunk | null = null;
  let oldLine = 0;
  let newLine = 0;
  let hunkId = 0;

  for (const line of lines) {
    if (line.startsWith("diff --git") || line.startsWith("--- ") && line.includes("/")) {
      continue;
    }
    
    if (line.startsWith("+++ ")) {
      if (currentFile) {
        files.push(currentFile);
      }
      currentFile = {
        path: line.slice(4).replace(/^[ab]\//, ""),
        hunks: [],
        expanded: true,
      };
      continue;
    }

    if (line.startsWith("@@")) {
      if (currentHunk && currentFile) {
        currentFile.hunks.push(currentHunk);
      }
      
      const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
      if (match) {
        oldLine = parseInt(match[1]);
        newLine = parseInt(match[2]);
      }
      
      currentHunk = {
        id: `hunk-${hunkId++}`,
        header: line,
        lines: [],
        approved: null,
      };
      continue;
    }

    if (currentHunk) {
      if (line.startsWith("+")) {
        currentHunk.lines.push({
          type: "addition",
          content: line.slice(1),
          lineNumber: { new: newLine++ },
        });
      } else if (line.startsWith("-")) {
        currentHunk.lines.push({
          type: "deletion",
          content: line.slice(1),
          lineNumber: { old: oldLine++ },
        });
      } else {
        currentHunk.lines.push({
          type: "context",
          content: line.startsWith(" ") ? line.slice(1) : line,
          lineNumber: { old: oldLine++, new: newLine++ },
        });
      }
    }
  }

  if (currentHunk && currentFile) {
    currentFile.hunks.push(currentHunk);
  }
  if (currentFile) {
    files.push(currentFile);
  }

  return files;
}
