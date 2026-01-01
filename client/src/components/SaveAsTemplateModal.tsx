import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Save, Plus, Bot, Zap, Target, Shield } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface SessionConfig {
  selectedModel: "codex" | "claude" | "gemini" | "manus";
  selectedProfile: string; // Built-in or custom profile ID
  ralphMode: boolean;
  maxIterations: number;
  noProgressThreshold: number;
  autoAskHuman: boolean;
  safetyMode: "standard" | "strict" | "permissive";
  promptGoal?: string;
  promptContext?: string;
  promptDoneWhen?: string;
  promptDoNot?: string;
  completionCriteria?: string[];
}

interface SaveAsTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionConfig: SessionConfig;
  onSaved?: () => void;
}

const modelNames: Record<string, string> = {
  codex: "Codex",
  claude: "Claude",
  gemini: "Gemini",
  manus: "Manus",
};

const profileNames: Record<string, string> = {
  patch_goblin: "Patch Goblin",
  architect_owl: "Architect Owl",
  test_gremlin: "Test Gremlin",
  refactor_surgeon: "Refactor Surgeon",
};

export function SaveAsTemplateModal({
  open,
  onOpenChange,
  sessionConfig,
  onSaved,
}: SaveAsTemplateModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const createTemplate = trpc.sessionTemplates.create.useMutation({
    onSuccess: () => {
      toast.success("Template saved successfully!");
      onOpenChange(false);
      resetForm();
      onSaved?.();
    },
    onError: (error) => {
      toast.error(`Failed to save template: ${error.message}`);
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setTagInput("");
    setTags([]);
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    createTemplate.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      selectedModel: sessionConfig.selectedModel,
      selectedProfile: sessionConfig.selectedProfile,
      ralphMode: sessionConfig.ralphMode,
      maxIterations: sessionConfig.maxIterations,
      noProgressThreshold: sessionConfig.noProgressThreshold,
      autoAskHuman: sessionConfig.autoAskHuman,
      safetyMode: sessionConfig.safetyMode,
      promptGoal: sessionConfig.promptGoal,
      promptContext: sessionConfig.promptContext,
      promptDoneWhen: sessionConfig.promptDoneWhen,
      promptDoNot: sessionConfig.promptDoNot,
      completionCriteria: sessionConfig.completionCriteria,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-purple-500/30 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-orbitron text-purple-100">
            Save as Template
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Save your current session configuration as a reusable template.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-purple-200">
              Template Name *
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., React Feature Development"
              className="bg-black/50 border-purple-500/30 text-white placeholder:text-gray-500"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-purple-200">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe when to use this template..."
              className="bg-black/50 border-purple-500/30 text-white placeholder:text-gray-500 min-h-[80px]"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="text-purple-200">Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a tag..."
                className="bg-black/50 border-purple-500/30 text-white placeholder:text-gray-500"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTag}
                className="border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="bg-purple-500/10 border-purple-500/30 text-purple-300"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-red-400"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Configuration Preview */}
          <div className="space-y-2">
            <Label className="text-purple-200">Configuration Preview</Label>
            <div className="p-3 bg-black/50 rounded-lg border border-purple-500/20 space-y-2">
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                  <Bot className="h-3 w-3 mr-1" />
                  {modelNames[sessionConfig.selectedModel]}
                </Badge>
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                  {profileNames[sessionConfig.selectedProfile]}
                </Badge>
                <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                  <Zap className="h-3 w-3 mr-1" />
                  {sessionConfig.maxIterations} max
                </Badge>
                <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                  <Shield className="h-3 w-3 mr-1" />
                  {sessionConfig.safetyMode}
                </Badge>
              </div>

              {sessionConfig.promptGoal && (
                <p className="text-xs text-gray-400 line-clamp-2">
                  <span className="text-purple-400">Goal:</span>{" "}
                  {sessionConfig.promptGoal}
                </p>
              )}

              {sessionConfig.completionCriteria &&
                sessionConfig.completionCriteria.length > 0 && (
                  <p className="text-xs text-gray-400">
                    <Target className="h-3 w-3 inline mr-1 text-green-400" />
                    {sessionConfig.completionCriteria.length} completion criteria
                  </p>
                )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={createTemplate.isPending || !name.trim()}
            className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white"
          >
            {createTemplate.isPending ? (
              "Saving..."
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
