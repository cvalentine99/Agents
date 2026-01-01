import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Upload,
  FileJson,
  Check,
  X,
  AlertTriangle,
  Copy,
  Share2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Session export schema
export interface SessionExport {
  version: string;
  exportedAt: string;
  session: {
    name: string;
    model: string;
    profile: string;
    workingDirectory: string;
    maxIterations: number;
    noProgressThreshold: number;
    circuitBreakerEnabled: boolean;
    dangerouslySkipPermissions: boolean;
  };
  completionCriteria: Array<{
    id: string;
    text: string;
    completed: boolean;
  }>;
  prompt?: {
    goal: string;
    context: string;
    doneWhen: string;
    doNot: string;
    expandedPrompt?: string;
  };
  assemblyLine?: {
    stages: Array<{
      id: string;
      name: string;
      model: string;
    }>;
  };
  promptPack?: {
    id: string;
    name: string;
    stack: string;
  };
}

interface SessionExportImportProps {
  currentSession: Partial<SessionExport["session"]>;
  completionCriteria: Array<{ id: string; text: string; completed: boolean }>;
  prompt?: SessionExport["prompt"];
  assemblyLine?: SessionExport["assemblyLine"];
  promptPack?: SessionExport["promptPack"];
  onImport: (data: SessionExport) => void;
}

export function SessionExportImport({
  currentSession,
  completionCriteria,
  prompt,
  assemblyLine,
  promptPack,
  onImport,
}: SessionExportImportProps) {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [exportCopied, setExportCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate export JSON
  const generateExport = (): SessionExport => {
    return {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      session: {
        name: currentSession.name || "Unnamed Session",
        model: currentSession.model || "claude",
        profile: currentSession.profile || "patch_goblin",
        workingDirectory: currentSession.workingDirectory || "/home/ubuntu",
        maxIterations: currentSession.maxIterations || 50,
        noProgressThreshold: currentSession.noProgressThreshold || 3,
        circuitBreakerEnabled: currentSession.circuitBreakerEnabled ?? true,
        dangerouslySkipPermissions: currentSession.dangerouslySkipPermissions ?? true,
      },
      completionCriteria: completionCriteria.map(c => ({
        id: c.id,
        text: c.text,
        completed: c.completed,
      })),
      prompt,
      assemblyLine,
      promptPack,
    };
  };

  // Export as JSON file
  const handleExport = () => {
    const exportData = generateExport();
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ralph-session-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy export to clipboard
  const handleCopyExport = async () => {
    const exportData = generateExport();
    const json = JSON.stringify(exportData, null, 2);
    await navigator.clipboard.writeText(json);
    setExportCopied(true);
    setTimeout(() => setExportCopied(false), 2000);
  };

  // Validate import data
  const validateImport = (data: unknown): data is SessionExport => {
    if (!data || typeof data !== "object") return false;
    const d = data as Record<string, unknown>;
    
    if (!d.version || typeof d.version !== "string") return false;
    if (!d.session || typeof d.session !== "object") return false;
    if (!Array.isArray(d.completionCriteria)) return false;
    
    return true;
  };

  // Handle import from text
  const handleImportText = () => {
    setImportError(null);
    setImportSuccess(false);

    try {
      const data = JSON.parse(importText);
      
      if (!validateImport(data)) {
        setImportError("Invalid session format. Please check the JSON structure.");
        return;
      }

      onImport(data);
      setImportSuccess(true);
      setImportText("");
      
      setTimeout(() => {
        setImportDialogOpen(false);
        setImportSuccess(false);
      }, 1500);
    } catch (e) {
      setImportError("Invalid JSON. Please check the format and try again.");
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setImportText(text);
    };
    reader.readAsText(file);
  };

  const exportJson = JSON.stringify(generateExport(), null, 2);

  return (
    <div className="flex items-center gap-2">
      {/* Export Button */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-[#0a0a0f] border-purple-500/30 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-orbitron text-purple-200 flex items-center gap-2">
              <FileJson className="w-5 h-5 text-purple-400" />
              Export Session Configuration
            </DialogTitle>
            <DialogDescription className="text-purple-400/60">
              Download or copy your session configuration to share with others or use in another project.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Preview */}
            <div className="relative">
              <Textarea
                value={exportJson}
                readOnly
                className="bg-black/40 border-purple-500/30 text-purple-100 font-mono text-xs h-64 resize-none"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyExport}
                className="absolute top-2 right-2 text-purple-400 hover:bg-purple-500/20"
              >
                {exportCopied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="text-xs text-purple-400/60">
                {completionCriteria.length} criteria • {currentSession.model || "claude"} model
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleCopyExport}
                  className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {exportCopied ? "Copied!" : "Copy"}
                </Button>
                <Button
                  onClick={handleExport}
                  className="bg-purple-600 hover:bg-purple-500 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download JSON
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Button */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-[#0a0a0f] border-purple-500/30 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-orbitron text-purple-200 flex items-center gap-2">
              <Upload className="w-5 h-5 text-purple-400" />
              Import Session Configuration
            </DialogTitle>
            <DialogDescription className="text-purple-400/60">
              Upload a JSON file or paste configuration to import session settings.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* File Upload */}
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
              >
                <FileJson className="w-4 h-4 mr-2" />
                Choose File
              </Button>
              <span className="text-sm text-purple-400/60">or paste JSON below</span>
            </div>

            {/* Text Input */}
            <Textarea
              value={importText}
              onChange={(e) => {
                setImportText(e.target.value);
                setImportError(null);
                setImportSuccess(false);
              }}
              placeholder='{"version": "1.0.0", "session": {...}, "completionCriteria": [...]}'
              className="bg-black/40 border-purple-500/30 text-purple-100 font-mono text-xs h-48 resize-none placeholder:text-purple-400/30"
            />

            {/* Status Messages */}
            <AnimatePresence>
              {importError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
                >
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-red-300">{importError}</span>
                </motion.div>
              )}
              {importSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg"
                >
                  <Check className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-300">Session imported successfully!</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setImportDialogOpen(false);
                  setImportText("");
                  setImportError(null);
                }}
                className="text-purple-400 hover:bg-purple-500/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleImportText}
                disabled={!importText.trim()}
                className="bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import Configuration
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Button (optional) */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopyExport}
        className="text-purple-400 hover:bg-purple-500/10"
        title="Copy configuration to clipboard"
      >
        <Share2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

export default SessionExportImport;
