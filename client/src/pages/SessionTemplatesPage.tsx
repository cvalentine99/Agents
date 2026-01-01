import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Search,
  Plus,
  Layers,
  Filter,
  SortAsc,
  SortDesc,
  Bot,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { SessionTemplateCard } from "@/components/SessionTemplateCard";
import { SaveAsTemplateModal } from "@/components/SaveAsTemplateModal";

type SortBy = "name" | "usageCount" | "createdAt" | "lastUsedAt";
type SortOrder = "asc" | "desc";

export default function SessionTemplatesPage() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const utils = trpc.useUtils();

  const { data: templates, isLoading } = trpc.sessionTemplates.list.useQuery();

  const deleteTemplate = trpc.sessionTemplates.delete.useMutation({
    onSuccess: () => {
      toast.success("Template deleted");
      utils.sessionTemplates.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const useTemplate = trpc.sessionTemplates.use.useMutation({
    onSuccess: (template) => {
      toast.success(`Loading "${template.name}"...`);
      // Navigate to dashboard with template data
      navigate(`/dashboard?templateId=${template.id}`);
    },
    onError: (error) => {
      toast.error(`Failed to load template: ${error.message}`);
    },
  });

  // Get all unique tags from templates
  const allTags = Array.from(
    new Set(templates?.flatMap((t) => t.tags) || [])
  ).sort();

  // Filter and sort templates
  const filteredTemplates = templates
    ?.filter((template) => {
      const matchesSearch =
        !searchQuery ||
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTag = !selectedTag || template.tags.includes(selectedTag);

      const matchesModel =
        !selectedModel || template.selectedModel === selectedModel;

      return matchesSearch && matchesTag && matchesModel;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "usageCount":
          comparison = a.usageCount - b.usageCount;
          break;
        case "createdAt":
          comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "lastUsedAt":
          const aTime = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
          const bTime = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
          comparison = aTime - bTime;
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

  const handleUse = (template: any) => {
    useTemplate.mutate({ id: template.id });
  };

  const handleEdit = (template: any) => {
    // For now, just show a toast - could open an edit modal
    toast.info("Edit functionality coming soon!");
  };

  const handleDelete = (id: number) => {
    deleteTemplate.mutate({ id });
  };

  const handleDuplicate = (template: any) => {
    // Open create modal with pre-filled data
    toast.info("Duplicate functionality coming soon!");
  };

  // Default config for creating new template from scratch
  const defaultConfig = {
    selectedModel: "claude" as const,
    selectedProfile: "patch_goblin" as const,
    ralphMode: true,
    maxIterations: 50,
    noProgressThreshold: 3,
    autoAskHuman: true,
    safetyMode: "standard" as const,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/20 to-gray-950">
      {/* Cyberpunk grid background */}
      <div
        className="fixed inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />

      <div className="relative z-10 p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard")}
              className="text-purple-300 hover:text-white hover:bg-purple-500/20"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Dashboard
            </Button>
            <div className="h-8 w-px bg-purple-500/30" />
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Layers className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-orbitron text-white">
                  Session Templates
                </h1>
                <p className="text-sm text-gray-400">
                  {templates?.length || 0} saved configurations
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-orbitron"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-black/40 border border-purple-500/30 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="pl-10 bg-black/50 border-purple-500/30 text-white placeholder:text-gray-500"
              />
            </div>

            {/* Tag filter */}
            <Select
              value={selectedTag || "all"}
              onValueChange={(v) => setSelectedTag(v === "all" ? null : v)}
            >
              <SelectTrigger className="w-[150px] bg-black/50 border-purple-500/30 text-white">
                <Filter className="h-4 w-4 mr-2 text-purple-400" />
                <SelectValue placeholder="All Tags" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-purple-500/30">
                <SelectItem value="all">All Tags</SelectItem>
                {allTags.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Model filter */}
            <Select
              value={selectedModel || "all"}
              onValueChange={(v) => setSelectedModel(v === "all" ? null : v)}
            >
              <SelectTrigger className="w-[150px] bg-black/50 border-purple-500/30 text-white">
                <Bot className="h-4 w-4 mr-2 text-cyan-400" />
                <SelectValue placeholder="All Models" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-purple-500/30">
                <SelectItem value="all">All Models</SelectItem>
                <SelectItem value="codex">Codex</SelectItem>
                <SelectItem value="claude">Claude</SelectItem>
                <SelectItem value="gemini">Gemini</SelectItem>
                <SelectItem value="manus">Manus</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select
              value={sortBy}
              onValueChange={(v) => setSortBy(v as SortBy)}
            >
              <SelectTrigger className="w-[150px] bg-black/50 border-purple-500/30 text-white">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-purple-500/30">
                <SelectItem value="createdAt">Date Created</SelectItem>
                <SelectItem value="lastUsedAt">Last Used</SelectItem>
                <SelectItem value="usageCount">Usage Count</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setSortOrder(sortOrder === "asc" ? "desc" : "asc")
              }
              className="text-purple-300 hover:text-white hover:bg-purple-500/20"
            >
              {sortOrder === "asc" ? (
                <SortAsc className="h-4 w-4" />
              ) : (
                <SortDesc className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Active filters */}
          {(selectedTag || selectedModel || searchQuery) && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-purple-500/20">
              <span className="text-xs text-gray-500">Active filters:</span>
              {searchQuery && (
                <Badge
                  variant="outline"
                  className="bg-purple-500/10 border-purple-500/30 text-purple-300"
                >
                  Search: {searchQuery}
                  <button
                    onClick={() => setSearchQuery("")}
                    className="ml-1 hover:text-red-400"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {selectedTag && (
                <Badge
                  variant="outline"
                  className="bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
                >
                  Tag: {selectedTag}
                  <button
                    onClick={() => setSelectedTag(null)}
                    className="ml-1 hover:text-red-400"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {selectedModel && (
                <Badge
                  variant="outline"
                  className="bg-green-500/10 border-green-500/30 text-green-300"
                >
                  Model: {selectedModel}
                  <button
                    onClick={() => setSelectedModel(null)}
                    className="ml-1 hover:text-red-400"
                  >
                    ×
                  </button>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedTag(null);
                  setSelectedModel(null);
                }}
                className="text-xs text-gray-400 hover:text-white"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>

        {/* Templates Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
          </div>
        ) : filteredTemplates && filteredTemplates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTemplates.map((template) => (
              <SessionTemplateCard
                key={template.id}
                template={template as any}
                onUse={handleUse}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500/20 rounded-full mb-4">
              <Layers className="h-8 w-8 text-purple-400" />
            </div>
            <h3 className="text-xl font-orbitron text-white mb-2">
              {templates?.length === 0
                ? "No Templates Yet"
                : "No Matching Templates"}
            </h3>
            <p className="text-gray-400 mb-6">
              {templates?.length === 0
                ? "Save your first session configuration as a reusable template."
                : "Try adjusting your filters or search query."}
            </p>
            {templates?.length === 0 && (
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Template
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Create Template Modal */}
      <SaveAsTemplateModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        sessionConfig={defaultConfig}
        onSaved={() => utils.sessionTemplates.list.invalidate()}
      />
    </div>
  );
}
