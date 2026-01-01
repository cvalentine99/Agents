import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Play,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Clock,
  Zap,
  Bot,
  Target,
} from "lucide-react";

interface SessionTemplate {
  id: number;
  name: string;
  description: string | null;
  tags: string[];
  selectedModel: "codex" | "claude" | "gemini" | "manus";
  selectedProfile: "patch_goblin" | "architect_owl" | "test_gremlin" | "refactor_surgeon";
  ralphMode: boolean;
  maxIterations: number;
  promptGoal: string | null;
  completionCriteria: string[];
  usageCount: number;
  lastUsedAt: Date | null;
  createdAt: Date;
}

interface SessionTemplateCardProps {
  template: SessionTemplate;
  onUse: (template: SessionTemplate) => void;
  onEdit: (template: SessionTemplate) => void;
  onDelete: (id: number) => void;
  onDuplicate: (template: SessionTemplate) => void;
}

const modelColors: Record<string, string> = {
  codex: "bg-green-500/20 text-green-400 border-green-500/30",
  claude: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  gemini: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  manus: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const profileIcons: Record<string, string> = {
  patch_goblin: "🧙",
  architect_owl: "🦉",
  test_gremlin: "👹",
  refactor_surgeon: "🔬",
};

const profileNames: Record<string, string> = {
  patch_goblin: "Patch Goblin",
  architect_owl: "Architect Owl",
  test_gremlin: "Test Gremlin",
  refactor_surgeon: "Refactor Surgeon",
};

export function SessionTemplateCard({
  template,
  onUse,
  onEdit,
  onDelete,
  onDuplicate,
}: SessionTemplateCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const formatDate = (date: Date | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <>
      <Card className="bg-black/40 border-purple-500/30 hover:border-purple-500/50 transition-all duration-300 group">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-orbitron text-purple-100 truncate">
                {template.name}
              </CardTitle>
              {template.description && (
                <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                  {template.description}
                </p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-gray-900 border-purple-500/30"
              >
                <DropdownMenuItem
                  onClick={() => onEdit(template)}
                  className="text-gray-300 hover:text-white focus:text-white"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDuplicate(template)}
                  className="text-gray-300 hover:text-white focus:text-white"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-red-400 hover:text-red-300 focus:text-red-300"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Tags */}
          {template.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {template.tags.slice(0, 3).map((tag, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="text-xs bg-purple-500/10 border-purple-500/30 text-purple-300"
                >
                  {tag}
                </Badge>
              ))}
              {template.tags.length > 3 && (
                <Badge
                  variant="outline"
                  className="text-xs bg-gray-500/10 border-gray-500/30 text-gray-400"
                >
                  +{template.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Configuration badges */}
          <div className="flex flex-wrap gap-2">
            <Badge className={`${modelColors[template.selectedModel]} border`}>
              <Bot className="h-3 w-3 mr-1" />
              {template.selectedModel.charAt(0).toUpperCase() +
                template.selectedModel.slice(1)}
            </Badge>
            <Badge
              variant="outline"
              className="bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
            >
              {profileIcons[template.selectedProfile]}{" "}
              {profileNames[template.selectedProfile]}
            </Badge>
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-yellow-500" />
                {template.maxIterations} max
              </span>
              <span className="flex items-center gap-1">
                <Target className="h-3 w-3 text-green-500" />
                {template.completionCriteria.length} criteria
              </span>
            </div>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Used {template.usageCount}x
            </span>
          </div>

          {/* Goal preview */}
          {template.promptGoal && (
            <div className="p-2 bg-gray-900/50 rounded border border-gray-700/50">
              <p className="text-xs text-gray-400 line-clamp-2">
                <span className="text-purple-400 font-medium">Goal:</span>{" "}
                {template.promptGoal}
              </p>
            </div>
          )}

          {/* Use button */}
          <Button
            onClick={() => onUse(template)}
            className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-orbitron"
          >
            <Play className="h-4 w-4 mr-2" />
            Use Template
          </Button>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-gray-900 border-red-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400 font-orbitron">
              Delete Template
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete "{template.name}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(template.id);
                setShowDeleteDialog(false);
              }}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
