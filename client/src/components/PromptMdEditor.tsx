/**
 * PROMPT.md Editor Component
 *
 * The core of the Ralph Loop technique - allows users to edit their PROMPT.md
 * and add "signs" when failures occur.
 */

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  FileText,
  Save,
  History,
  Plus,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  ChevronRight,
  Clock,
  Sparkles,
} from "lucide-react";

interface PromptMdEditorProps {
  projectPath: string;
  onPromptChange?: (content: string) => void;
  lastError?: string;
}

export function PromptMdEditor({
  projectPath,
  onPromptChange,
  lastError,
}: PromptMdEditorProps) {
  const [content, setContent] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [newSign, setNewSign] = useState("");
  const [detectedPattern, setDetectedPattern] = useState<string | null>(null);

  // Fetch current PROMPT.md
  const {
    data: prompt,
    isLoading,
    refetch,
  } = trpc.promptMd.get.useQuery({ projectPath }, { enabled: !!projectPath });

  // Fetch history
  const { data: history } = trpc.promptMd.getHistory.useQuery(
    { projectPath },
    { enabled: !!projectPath && showHistory }
  );

  // Get default template
  const { data: _defaultTemplate } =
    trpc.promptMd.getDefaultTemplate.useQuery();

  // Detect failure pattern when lastError changes
  const { data: suggestedPattern } =
    trpc.promptMd.detectFailurePattern.useQuery(
      { errorOutput: lastError || "" },
      { enabled: !!lastError }
    );

  // Get suggested signs for detected pattern
  const { data: suggestedSigns } = trpc.promptMd.getSuggestedSigns.useQuery(
    { failurePattern: detectedPattern || suggestedPattern || "" },
    { enabled: !!(detectedPattern || suggestedPattern) }
  );

  // Mutations
  const saveMutation = trpc.promptMd.save.useMutation({
    onSuccess: () => {
      toast.success("PROMPT.md saved successfully");
      setHasChanges(false);
      refetch();
      onPromptChange?.(content);
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const initializeMutation = trpc.promptMd.initialize.useMutation({
    onSuccess: data => {
      setContent(data.content);
      toast.success("PROMPT.md created with default template");
      refetch();
    },
  });

  const addSignMutation = trpc.promptMd.addSign.useMutation({
    onSuccess: data => {
      setContent(data.content);
      setShowSignDialog(false);
      setNewSign("");
      toast.success("New guidance rule added to PROMPT.md");
      refetch();
      onPromptChange?.(data.content);
    },
  });

  // Initialize content when prompt loads
  useEffect(() => {
    if (prompt) {
      setContent(prompt.content);
    }
  }, [prompt]);

  // Detect pattern when lastError changes
  useEffect(() => {
    if (suggestedPattern && suggestedPattern !== "unknown") {
      setDetectedPattern(suggestedPattern);
      // Auto-open sign dialog when error detected
      if (lastError) {
        setShowSignDialog(true);
      }
    }
  }, [suggestedPattern, lastError]);

  const handleSave = () => {
    saveMutation.mutate({ projectPath, content });
  };

  const handleInitialize = () => {
    initializeMutation.mutate({ projectPath });
  };

  const handleAddSign = (sign: string) => {
    addSignMutation.mutate({
      projectPath,
      signText: sign,
      failurePattern: detectedPattern || undefined,
    });
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasChanges(newContent !== prompt?.content);
  };

  const handleRestoreVersion = (versionContent: string) => {
    setContent(versionContent);
    setHasChanges(true);
    setShowHistory(false);
  };

  if (isLoading) {
    return (
      <Card className="border-cyan-500/30 bg-slate-900/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2 text-cyan-400">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading PROMPT.md...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!prompt && !isLoading) {
    return (
      <Card className="border-cyan-500/30 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-cyan-400">
            <FileText className="h-5 w-5" />
            PROMPT.md Not Found
          </CardTitle>
          <CardDescription>
            Initialize a PROMPT.md file to configure your RALPH Loop behavior
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-400 mb-4">
            The PROMPT.md file is the core of the Ralph Loop technique. It
            contains your goals, context, and "signs" (guidance rules) that tune
            the AI's behavior over time.
          </p>
          <Button
            onClick={handleInitialize}
            className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Initialize PROMPT.md
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-cyan-500/30 bg-slate-900/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-cyan-400" />
              <CardTitle className="text-cyan-400">PROMPT.md</CardTitle>
              {prompt && (
                <Badge variant="outline" className="text-xs">
                  v{prompt.version}
                </Badge>
              )}
              {hasChanges && (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  Unsaved
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(true)}
                className="border-slate-600 hover:bg-slate-800"
              >
                <History className="h-4 w-4 mr-1" />
                History
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSignDialog(true)}
                className="border-purple-500/50 text-purple-400 hover:bg-purple-500/20"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Sign
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || saveMutation.isPending}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
              >
                <Save className="h-4 w-4 mr-1" />
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
          <CardDescription>
            Edit your RALPH Loop configuration. Add "signs" when failures occur
            to tune behavior.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Error Alert */}
          {lastError && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-400">
                    Last Error Detected
                  </p>
                  <p className="text-xs text-red-300/70 mt-1 font-mono line-clamp-3">
                    {lastError}
                  </p>
                  {detectedPattern && detectedPattern !== "unknown" && (
                    <Badge className="mt-2 bg-red-500/20 text-red-300 border-red-500/30">
                      Pattern: {detectedPattern.replace(/_/g, " ")}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Editor */}
          <Textarea
            value={content}
            onChange={e => handleContentChange(e.target.value)}
            className="min-h-[400px] font-mono text-sm bg-slate-950 border-slate-700 focus:border-cyan-500"
            placeholder="# PROMPT.md - Ralph Loop Configuration..."
          />

          {/* Tips */}
          <div className="mt-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-amber-400 mt-0.5" />
              <div className="text-xs text-slate-400">
                <p className="font-medium text-amber-400 mb-1">
                  Ralph Loop Tip
                </p>
                <p>
                  "Each time Ralph does something bad, Ralph gets tuned - like a
                  guitar." Add specific "signs" in the Signs section when you
                  notice repeated failures.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-cyan-400">
              <History className="h-5 w-5" />
              PROMPT.md Version History
            </DialogTitle>
            <DialogDescription>
              View and restore previous versions of your PROMPT.md
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {history?.map(version => (
                <div
                  key={version.id}
                  className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-cyan-500/50 cursor-pointer transition-colors"
                  onClick={() => handleRestoreVersion(version.content)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">Version {version.version}</Badge>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(version.updatedAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono line-clamp-2">
                    {version.content.substring(0, 200)}...
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Add Sign Dialog */}
      <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
        <DialogContent className="max-w-lg bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-400">
              <Sparkles className="h-5 w-5" />
              Add a Sign to PROMPT.md
            </DialogTitle>
            <DialogDescription>
              Signs are guidance rules that tune the AI's behavior. Add them
              when you notice repeated failures.
            </DialogDescription>
          </DialogHeader>

          {/* Suggested Signs */}
          {suggestedSigns && suggestedSigns.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-300">
                Suggested Signs:
              </p>
              {suggestedSigns.map((sign, index) => (
                <div
                  key={index}
                  className="p-2 rounded bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 cursor-pointer transition-colors"
                  onClick={() => handleAddSign(sign)}
                >
                  <div className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-purple-400" />
                    <span className="text-sm text-slate-300">{sign}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Custom Sign Input */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-300">
              Or write your own:
            </p>
            <Input
              value={newSign}
              onChange={e => setNewSign(e.target.value)}
              placeholder="e.g., ALWAYS check file exists before reading"
              className="bg-slate-950 border-slate-700"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSignDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => handleAddSign(newSign)}
              disabled={!newSign.trim() || addSignMutation.isPending}
              className="bg-gradient-to-r from-purple-500 to-pink-500"
            >
              {addSignMutation.isPending ? "Adding..." : "Add Sign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default PromptMdEditor;
