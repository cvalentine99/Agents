import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Search,
  FileText,
  Shield,
  Zap,
  Layers,
  CheckCircle,
  Server,
  Star,
  Download,
  Eye,
  Code,
  Bug,
  Lock,
  Globe,
  Database,
  Box,
  GitPullRequest,
  Scissors,
  Bird,
  Bot,
  Sparkles,
  FileCode,
} from "lucide-react";

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  Shield,
  Zap,
  Layers,
  CheckCircle,
  Server,
  Star,
  Code,
  Bug,
  Lock,
  Globe,
  Database,
  Box,
  GitPullRequest,
  Scissors,
  Bird,
  Bot,
  Sparkles,
  FileCode,
  Eye,
};

// Color mapping for profile cards
const colorClasses: Record<string, string> = {
  green: "from-green-500/20 to-green-600/10 border-green-500/30",
  blue: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
  orange: "from-orange-500/20 to-orange-600/10 border-orange-500/30",
  purple: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
  cyan: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30",
  pink: "from-pink-500/20 to-pink-600/10 border-pink-500/30",
  yellow: "from-yellow-500/20 to-yellow-600/10 border-yellow-500/30",
};

const iconColorClasses: Record<string, string> = {
  green: "text-green-400",
  blue: "text-blue-400",
  orange: "text-orange-400",
  purple: "text-purple-400",
  cyan: "text-cyan-400",
  pink: "text-pink-400",
  yellow: "text-yellow-400",
};

interface ProfileTemplateGalleryProps {
  onImport?: (profileId: number) => void;
}

export function ProfileTemplateGallery({
  onImport,
}: ProfileTemplateGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  const { data: templatesData, isLoading } =
    trpc.agentProfiles.listTemplates.useQuery({
      category: selectedCategory as
        | "security"
        | "documentation"
        | "architecture"
        | "performance"
        | "testing"
        | "devops"
        | "specialized"
        | "all",
      search: searchQuery || undefined,
    });

  const { data: templateDetail } = trpc.agentProfiles.getTemplate.useQuery(
    { id: selectedTemplate || "" },
    { enabled: !!selectedTemplate }
  );

  const importMutation = trpc.agentProfiles.importTemplate.useMutation({
    onSuccess: data => {
      toast.success(`Profile "${data.profile.name}" created from template!`);
      setShowImportDialog(false);
      setSelectedTemplate(null);
      setCustomName("");
      if (onImport) {
        onImport(data.profile.id);
      }
    },
    onError: error => {
      toast.error(`Failed to import template: ${error.message}`);
    },
  });

  const handleImport = () => {
    if (!selectedTemplate) return;
    importMutation.mutate({
      templateId: selectedTemplate,
      customName: customName.trim() || undefined,
    });
  };

  const categories = [
    { id: "all", label: "All Templates", icon: Star },
    { id: "documentation", label: "Documentation", icon: FileText },
    { id: "security", label: "Security", icon: Shield },
    { id: "performance", label: "Performance", icon: Zap },
    { id: "architecture", label: "Architecture", icon: Layers },
    { id: "testing", label: "Testing", icon: CheckCircle },
    { id: "devops", label: "DevOps", icon: Server },
    { id: "specialized", label: "Specialized", icon: Code },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">Template Gallery</h3>
          <p className="text-sm text-gray-400">
            Browse {templatesData?.totalCount || 0} pre-made agent profiles
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-900/50 border-gray-700"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="flex flex-wrap gap-1 h-auto bg-gray-900/50 p-1">
          {categories.map(cat => {
            const Icon = cat.icon;
            return (
              <TabsTrigger
                key={cat.id}
                value={cat.id}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs data-[state=active]:bg-purple-600"
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{cat.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div
                  key={i}
                  className="h-48 rounded-lg bg-gray-800/50 animate-pulse"
                />
              ))}
            </div>
          ) : templatesData?.templates.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No templates found matching your criteria</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templatesData?.templates.map(template => {
                const Icon = iconMap[template.icon] || Bot;
                return (
                  <div
                    key={template.id}
                    className={`relative group rounded-lg border bg-gradient-to-br p-4 transition-all hover:scale-[1.02] hover:shadow-lg ${
                      colorClasses[template.color] || colorClasses.purple
                    }`}
                  >
                    {/* Icon and Title */}
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className={`p-2 rounded-lg bg-gray-900/50 ${iconColorClasses[template.color] || "text-purple-400"}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white truncate">
                          {template.name}
                        </h4>
                        <p className="text-xs text-gray-400 line-clamp-2 mt-1">
                          {template.description}
                        </p>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {template.tags.slice(0, 3).map(tag => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 bg-gray-900/50"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {template.tags.length > 3 && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 bg-gray-900/50"
                        >
                          +{template.tags.length - 3}
                        </Badge>
                      )}
                    </div>

                    {/* Config badges */}
                    <div className="flex gap-2 text-[10px] text-gray-400 mb-3">
                      <span className="px-1.5 py-0.5 rounded bg-gray-900/50">
                        {template.outputStyle}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-gray-900/50">
                        {template.codeGeneration === "none"
                          ? "no code"
                          : template.codeGeneration}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-gray-900/50">
                        {template.testingApproach.replace("_", " ")}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs h-8"
                        onClick={() => {
                          setSelectedTemplate(template.id);
                          setShowPreviewDialog(true);
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 text-xs h-8 bg-purple-600 hover:bg-purple-700"
                        onClick={() => {
                          setSelectedTemplate(template.id);
                          setCustomName("");
                          setShowImportDialog(true);
                        }}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Use
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-gray-900 border-gray-700">
          {templateDetail && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  {(() => {
                    const Icon = iconMap[templateDetail.icon] || Bot;
                    return (
                      <div
                        className={`p-2 rounded-lg bg-gray-800 ${iconColorClasses[templateDetail.color] || "text-purple-400"}`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                    );
                  })()}
                  <div>
                    <DialogTitle className="text-xl">
                      {templateDetail.name}
                    </DialogTitle>
                    <DialogDescription>
                      {templateDetail.description}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Configuration */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-gray-800/50">
                    <p className="text-xs text-gray-400 mb-1">Output Style</p>
                    <p className="font-medium text-white capitalize">
                      {templateDetail.outputStyle}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-800/50">
                    <p className="text-xs text-gray-400 mb-1">
                      Code Generation
                    </p>
                    <p className="font-medium text-white capitalize">
                      {templateDetail.codeGeneration === "none"
                        ? "No Code"
                        : templateDetail.codeGeneration}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-800/50">
                    <p className="text-xs text-gray-400 mb-1">Testing</p>
                    <p className="font-medium text-white capitalize">
                      {templateDetail.testingApproach.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <p className="text-sm text-gray-400 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {templateDetail.tags.map(tag => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="bg-gray-800"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Use Cases */}
                <div>
                  <p className="text-sm text-gray-400 mb-2">Use Cases</p>
                  <ul className="space-y-1">
                    {templateDetail.useCases.map((useCase, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 text-sm text-gray-300"
                      >
                        <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                        {useCase}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* System Prompt */}
                <div>
                  <p className="text-sm text-gray-400 mb-2">System Prompt</p>
                  <pre className="p-3 rounded-lg bg-gray-800/50 text-xs text-gray-300 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
                    {templateDetail.systemPrompt}
                  </pre>
                </div>
              </div>

              <DialogFooter className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowPreviewDialog(false)}
                >
                  Close
                </Button>
                <Button
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={() => {
                    setShowPreviewDialog(false);
                    setCustomName("");
                    setShowImportDialog(true);
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Use This Template
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle>Import Template</DialogTitle>
            <DialogDescription>
              Create a custom profile from this template. You can customize it
              after importing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Profile Name (optional)
              </label>
              <Input
                placeholder={templateDetail?.name || "Use template name"}
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                className="bg-gray-800 border-gray-700"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to use the template name
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowImportDialog(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              onClick={handleImport}
              disabled={importMutation.isPending}
            >
              {importMutation.isPending ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Import Template
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
