import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  BookOpen,
  Brain,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  FileDown,
  FileText,
  Flame,
  Folder,
  FolderPlus,
  LayoutTemplate,
  Link2,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Send,
  Settings,
  Share2,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  Upload,
  User,
  X,
  Zap,
} from "lucide-react";
import {
  RESEARCH_TEMPLATES,
  RESEARCH_CATEGORIES,
  type ResearchCategory,
  type ResearchTemplate,
  searchTemplates,
  getTemplatesByCategory,
} from "@/data/researchTemplates";
import { Streamdown } from "streamdown";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

type ResearchDepth = "quick" | "standard" | "deep";

// Color palette for categories
const CATEGORY_COLORS = [
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#6366f1",
  "#14b8a6",
  "#84cc16",
  "#f97316",
];

export default function DeepResearch() {
  const [topic, setTopic] = useState("");
  const [depth, setDepth] = useState<ResearchDepth>("standard");
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(
    null
  );
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<
    ResearchCategory | "all" | "favorites" | "custom"
  >("all");
  const [templateSearch, setTemplateSearch] = useState("");

  // Custom template creation state
  const [createTemplateDialogOpen, setCreateTemplateDialogOpen] =
    useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");
  const [newTemplateTags, setNewTemplateTags] = useState("");
  const [newTemplateCategoryId, setNewTemplateCategoryId] = useState<
    number | undefined
  >(undefined);

  // Category management state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [_editingCategory, setEditingCategory] = useState<{
    id: number;
    name: string;
    description: string;
    color: string;
  } | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#8b5cf6");

  // Import/Export state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState("");
  const [importError, setImportError] = useState("");

  const utils = trpc.useUtils();

  // Queries
  const { data: sessions, isLoading: sessionsLoading } =
    trpc.research.list.useQuery();
  const { data: selectedSession, isLoading: _sessionLoading } =
    trpc.research.get.useQuery(
      { id: selectedSessionId! },
      {
        enabled: !!selectedSessionId,
        refetchInterval: query =>
          query.state.data?.status === "researching" ? 2000 : false,
      }
    );
  const { data: followUps } = trpc.research.getFollowUps.useQuery(
    { researchSessionId: selectedSessionId! },
    { enabled: !!selectedSessionId && selectedSession?.status === "complete" }
  );

  // Template queries
  const { data: customTemplates } = trpc.templates.list.useQuery();
  const { data: favorites } = trpc.templates.getFavorites.useQuery();
  const { data: usageStats } = trpc.templates.getUsageStats.useQuery();
  const { data: userCategories } = trpc.templates.listCategories.useQuery();

  // Mutations
  const createMutation = trpc.research.create.useMutation({
    onSuccess: data => {
      setSelectedSessionId(data.id);
      utils.research.list.invalidate();
      executeMutation.mutate({ id: data.id });
    },
  });

  const executeMutation = trpc.research.execute.useMutation({
    onSuccess: () => {
      utils.research.get.invalidate();
      utils.research.list.invalidate();
    },
  });

  const deleteMutation = trpc.research.delete.useMutation({
    onSuccess: () => {
      if (selectedSessionId) {
        setSelectedSessionId(null);
      }
      utils.research.list.invalidate();
    },
  });

  const shareMutation = trpc.research.share.useMutation({
    onSuccess: data => {
      const link = `${window.location.origin}/research/share/${data.shareToken}`;
      setShareLink(link);
      setShareDialogOpen(true);
    },
  });

  const unshareMutation = trpc.research.unshare.useMutation({
    onSuccess: () => {
      toast.success("Sharing disabled");
      utils.research.get.invalidate();
    },
  });

  const askFollowUpMutation = trpc.research.askFollowUp.useMutation({
    onSuccess: () => {
      setFollowUpQuestion("");
      utils.research.getFollowUps.invalidate();
      toast.success("Follow-up question answered!");
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const { data: _exportData, refetch: exportMarkdown } =
    trpc.research.exportMarkdown.useQuery(
      { id: selectedSessionId! },
      { enabled: false }
    );

  const exportPDFMutation = trpc.research.exportPDF.useMutation({
    onSuccess: data => {
      const byteCharacters = atob(data.pdf);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("PDF exported!");
    },
    onError: error => {
      toast.error("Failed to export PDF: " + error.message);
    },
  });

  // Template mutations
  const createTemplateMutation = trpc.templates.create.useMutation({
    onSuccess: () => {
      toast.success("Template created!");
      setCreateTemplateDialogOpen(false);
      setNewTemplateName("");
      setNewTemplateDescription("");
      setNewTemplateTags("");
      setNewTemplateCategoryId(undefined);
      utils.templates.list.invalidate();
    },
    onError: error => {
      toast.error("Failed to create template: " + error.message);
    },
  });

  const deleteTemplateMutation = trpc.templates.delete.useMutation({
    onSuccess: () => {
      toast.success("Template deleted");
      utils.templates.list.invalidate();
    },
  });

  const toggleFavoriteMutation = trpc.templates.toggleFavorite.useMutation({
    onSuccess: data => {
      toast.success(
        data.favorited ? "Added to favorites" : "Removed from favorites"
      );
      utils.templates.getFavorites.invalidate();
    },
  });

  const trackUsageMutation = trpc.templates.trackUsage.useMutation();

  // Category mutations
  const createCategoryMutation = trpc.templates.createCategory.useMutation({
    onSuccess: () => {
      toast.success("Category created!");
      setCategoryDialogOpen(false);
      setNewCategoryName("");
      setNewCategoryDescription("");
      setNewCategoryColor("#8b5cf6");
      utils.templates.listCategories.invalidate();
    },
    onError: error => {
      toast.error("Failed to create category: " + error.message);
    },
  });

  const _updateCategoryMutation = trpc.templates.updateCategory.useMutation({
    onSuccess: () => {
      toast.success("Category updated!");
      setEditingCategory(null);
      utils.templates.listCategories.invalidate();
    },
  });

  const deleteCategoryMutation = trpc.templates.deleteCategory.useMutation({
    onSuccess: () => {
      toast.success("Category deleted");
      utils.templates.listCategories.invalidate();
      utils.templates.list.invalidate();
    },
  });

  // Import/Export mutations
  const { refetch: exportTemplates } = trpc.templates.exportTemplates.useQuery(
    undefined,
    { enabled: false }
  );

  const importTemplatesMutation = trpc.templates.importTemplates.useMutation({
    onSuccess: result => {
      toast.success(
        `Imported ${result.imported} templates (${result.skipped} skipped)`
      );
      if (result.errors.length > 0) {
        result.errors.forEach(err => toast.error(err));
      }
      setImportDialogOpen(false);
      setImportData("");
      setImportError("");
      utils.templates.list.invalidate();
      utils.templates.listCategories.invalidate();
    },
    onError: error => {
      toast.error("Import failed: " + error.message);
    },
  });

  const handleStartResearch = () => {
    if (!topic.trim()) return;
    createMutation.mutate({ topic: topic.trim(), depth });
  };

  const handleExportMarkdown = async () => {
    const result = await exportMarkdown();
    if (result.data) {
      const blob = new Blob([result.data.markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Markdown exported!");
    }
  };

  const handleExportPDF = () => {
    if (!selectedSessionId) return;
    exportPDFMutation.mutate({ id: selectedSessionId });
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast.success("Link copied to clipboard!");
  };

  const handleAskFollowUp = () => {
    if (!followUpQuestion.trim() || !selectedSessionId) return;
    askFollowUpMutation.mutate({
      researchSessionId: selectedSessionId,
      question: followUpQuestion.trim(),
    });
  };

  const handleApplyTemplate = (
    template:
      | ResearchTemplate
      | { id: string; topic: string; depth: ResearchDepth; name: string },
    isCustom: boolean = false
  ) => {
    setTopic(template.topic);
    setDepth(template.depth);
    setTemplateDialogOpen(false);
    toast.success(`Template "${template.name}" applied`);

    trackUsageMutation.mutate({
      templateId: template.id.toString(),
      templateType: isCustom ? "custom" : "builtin",
      customTemplateId: isCustom ? Number(template.id) : undefined,
    });
  };

  const handleSaveAsTemplate = () => {
    if (!topic.trim()) {
      toast.error("Enter a research topic first");
      return;
    }
    setCreateTemplateDialogOpen(true);
  };

  const handleCreateTemplate = () => {
    if (!newTemplateName.trim()) {
      toast.error("Template name is required");
      return;
    }

    createTemplateMutation.mutate({
      name: newTemplateName.trim(),
      description: newTemplateDescription.trim() || undefined,
      topic: topic.trim(),
      depth,
      tags: newTemplateTags
        .split(",")
        .map(t => t.trim())
        .filter(Boolean),
      categoryId: newTemplateCategoryId,
    });
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) {
      toast.error("Category name is required");
      return;
    }

    createCategoryMutation.mutate({
      name: newCategoryName.trim(),
      description: newCategoryDescription.trim() || undefined,
      color: newCategoryColor,
    });
  };

  const handleExportTemplates = async () => {
    const result = await exportTemplates();
    if (result.data) {
      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `research-templates-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Templates exported!");
    }
  };

  const handleImportTemplates = () => {
    setImportError("");
    try {
      const parsed = JSON.parse(importData);
      if (!parsed.templates || !Array.isArray(parsed.templates)) {
        setImportError("Invalid format: missing templates array");
        return;
      }

      importTemplatesMutation.mutate({
        templates: parsed.templates,
        categories: parsed.categories,
        createMissingCategories: true,
      });
    } catch (__e) {
      setImportError("Invalid JSON format");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = event => {
        setImportData(event.target?.result as string);
        setImportError("");
      };
      reader.readAsText(file);
    }
  };

  const isTemplateFavorited = (
    templateId: string,
    type: "builtin" | "custom"
  ) => {
    return (
      favorites?.some(
        f => f.templateId === templateId && f.templateType === type
      ) ?? false
    );
  };

  const getTemplateUsageCount = (templateId: string) => {
    const stat = usageStats?.find(s => s.templateId === templateId);
    return stat?.usageCount ?? 0;
  };

  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId) return "Uncategorized";
    const cat = userCategories?.find(c => c.id === categoryId);
    return cat?.name || "Uncategorized";
  };

  const getCategoryColor = (categoryId: number | null) => {
    if (!categoryId) return "#8b5cf6";
    const cat = userCategories?.find(c => c.id === categoryId);
    return cat?.color || "#8b5cf6";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="border-yellow-500 text-yellow-500"
          >
            <Clock className="w-3 h-3 mr-1" /> Pending
          </Badge>
        );
      case "researching":
        return (
          <Badge variant="outline" className="border-blue-500 text-blue-500">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Researching
          </Badge>
        );
      case "synthesizing":
        return (
          <Badge
            variant="outline"
            className="border-purple-500 text-purple-500"
          >
            <Brain className="w-3 h-3 mr-1" /> Synthesizing
          </Badge>
        );
      case "complete":
        return (
          <Badge variant="outline" className="border-green-500 text-green-500">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="border-red-500 text-red-500">
            <AlertCircle className="w-3 h-3 mr-1" /> Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDepthInfo = (d: ResearchDepth) => {
    switch (d) {
      case "quick":
        return {
          label: "Quick",
          steps: 3,
          description: "Fast overview, 3 research steps",
        };
      case "standard":
        return {
          label: "Standard",
          steps: 5,
          description: "Balanced depth, 5 research steps",
        };
      case "deep":
        return {
          label: "Deep",
          steps: 8,
          description: "Comprehensive analysis, 8 research steps",
        };
    }
  };

  const getFilteredTemplates = () => {
    if (templateSearch) {
      return searchTemplates(templateSearch);
    }

    if (selectedCategory === "favorites") {
      const favoriteBuiltins = RESEARCH_TEMPLATES.filter(t =>
        favorites?.some(
          f => f.templateId === t.id && f.templateType === "builtin"
        )
      );
      return favoriteBuiltins;
    }

    if (selectedCategory === "custom") {
      return [];
    }

    if (selectedCategory === "all") {
      return RESEARCH_TEMPLATES;
    }

    return getTemplatesByCategory(selectedCategory);
  };

  // Filter custom templates by user category
  const getFilteredCustomTemplates = () => {
    if (!customTemplates) return [];
    if (selectedCategory === "custom") return customTemplates;
    return [];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950">
      {/* Header */}
      <div className="border-b border-purple-500/20 bg-slate-950/80 backdrop-blur-sm">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Search className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Deep Research</h1>
                <p className="text-sm text-slate-400">
                  AI-powered comprehensive research on any topic
                </p>
              </div>
            </div>

            {/* Import/Export Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="border-slate-700 text-slate-300"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Manage Templates
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-slate-800 border-slate-700">
                <DropdownMenuItem
                  onClick={() => setCategoryDialogOpen(true)}
                  className="text-slate-200 focus:bg-slate-700"
                >
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Create Category
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem
                  onClick={handleExportTemplates}
                  className="text-slate-200 focus:bg-slate-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Templates
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setImportDialogOpen(true)}
                  className="text-slate-200 focus:bg-slate-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import Templates
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Input & History */}
          <div className="space-y-6">
            {/* New Research Card */}
            <Card className="bg-slate-900/50 border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  New Research
                </CardTitle>
                <CardDescription>
                  Enter a topic or question to research
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="What would you like to research? e.g., 'Latest trends in AI agent architectures'"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  className="min-h-[100px] bg-slate-800/50 border-slate-700 text-white resize-none"
                />

                <div className="space-y-2">
                  <label className="text-sm text-slate-400">
                    Research Depth
                  </label>
                  <Select
                    value={depth}
                    onValueChange={v => setDepth(v as ResearchDepth)}
                  >
                    <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {(["quick", "standard", "deep"] as const).map(d => {
                        const info = getDepthInfo(d);
                        return (
                          <SelectItem key={d} value={d} className="text-white">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{info.label}</span>
                              <span className="text-xs text-slate-400">
                                ({info.steps} steps)
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleStartResearch}
                    disabled={!topic.trim() || createMutation.isPending}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                  >
                    {createMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4 mr-2" />
                    )}
                    Start Research
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSaveAsTemplate}
                    disabled={!topic.trim()}
                    className="border-slate-700 text-slate-300"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  onClick={() => setTemplateDialogOpen(true)}
                  className="w-full text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                >
                  <LayoutTemplate className="w-4 h-4 mr-2" />
                  Browse Templates
                </Button>
              </CardContent>
            </Card>

            {/* Research History */}
            <Card className="bg-slate-900/50 border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-400" />
                  Research History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  {sessionsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                    </div>
                  ) : sessions && sessions.length > 0 ? (
                    <div className="space-y-2">
                      {sessions.map(session => (
                        <div
                          key={session.id}
                          onClick={() => setSelectedSessionId(session.id)}
                          className={`p-3 rounded-lg cursor-pointer transition-all ${
                            selectedSessionId === session.id
                              ? "bg-purple-500/20 border border-purple-500/50"
                              : "bg-slate-800/50 hover:bg-slate-800 border border-transparent"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-white line-clamp-2 flex-1">
                              {session.topic}
                            </p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-slate-500 hover:text-red-400 shrink-0"
                              onClick={e => {
                                e.stopPropagation();
                                deleteMutation.mutate({ id: session.id });
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            {getStatusBadge(session.status)}
                            <span className="text-xs text-slate-500">
                              {formatDistanceToNow(
                                new Date(session.createdAt),
                                { addSuffix: true }
                              )}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400">
                      <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No research history yet</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Research Details */}
          <div className="lg:col-span-2">
            {selectedSession ? (
              <Card className="bg-slate-900/50 border-purple-500/20">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-white text-lg mb-2">
                        {selectedSession.topic}
                      </CardTitle>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(selectedSession.status)}
                        <Badge
                          variant="outline"
                          className="border-slate-600 text-slate-400"
                        >
                          {
                            getDepthInfo(selectedSession.depth as ResearchDepth)
                              .label
                          }{" "}
                          ({selectedSession.totalSteps} steps)
                        </Badge>
                        {selectedSession.sourcesCount > 0 && (
                          <Badge
                            variant="outline"
                            className="border-cyan-500/50 text-cyan-400"
                          >
                            {selectedSession.sourcesCount} sources
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Export Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-700 text-slate-300"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Export
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-slate-800 border-slate-700">
                          <DropdownMenuItem
                            onClick={handleExportMarkdown}
                            className="text-slate-200 focus:bg-slate-700"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Export as Markdown
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={handleExportPDF}
                            disabled={exportPDFMutation.isPending}
                            className="text-slate-200 focus:bg-slate-700"
                          >
                            {exportPDFMutation.isPending ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <FileDown className="w-4 h-4 mr-2" />
                            )}
                            Export as PDF
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Share Button */}
                      {selectedSession.status === "complete" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-slate-700 text-slate-300"
                            >
                              <Share2 className="w-4 h-4 mr-2" />
                              Share
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-slate-800 border-slate-700">
                            {selectedSession.shareToken ? (
                              <>
                                <DropdownMenuItem
                                  onClick={() => {
                                    const link = `${window.location.origin}/research/share/${selectedSession.shareToken}`;
                                    setShareLink(link);
                                    setShareDialogOpen(true);
                                  }}
                                  className="text-slate-200 focus:bg-slate-700"
                                >
                                  <Link2 className="w-4 h-4 mr-2" />
                                  Copy Share Link
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    unshareMutation.mutate({
                                      id: selectedSession.id,
                                    })
                                  }
                                  className="text-red-400 focus:bg-slate-700"
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Disable Sharing
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <DropdownMenuItem
                                onClick={() =>
                                  shareMutation.mutate({
                                    id: selectedSession.id,
                                  })
                                }
                                className="text-slate-200 focus:bg-slate-700"
                              >
                                <Link2 className="w-4 h-4 mr-2" />
                                Create Share Link
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {(selectedSession.status === "researching" ||
                    selectedSession.status === "synthesizing") && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-slate-400">Progress</span>
                        <span className="text-purple-400">
                          {selectedSession.currentStep}/
                          {selectedSession.totalSteps} steps
                        </span>
                      </div>
                      <Progress
                        value={
                          (selectedSession.currentStep /
                            selectedSession.totalSteps) *
                          100
                        }
                        className="h-2 bg-slate-800"
                      />
                    </div>
                  )}
                </CardHeader>

                <CardContent>
                  <Tabs defaultValue="summary" className="w-full">
                    <TabsList className="bg-slate-800/50 border border-slate-700">
                      <TabsTrigger
                        value="summary"
                        className="data-[state=active]:bg-purple-500/20"
                      >
                        Summary
                      </TabsTrigger>
                      <TabsTrigger
                        value="findings"
                        className="data-[state=active]:bg-purple-500/20"
                      >
                        Findings
                      </TabsTrigger>
                      <TabsTrigger
                        value="steps"
                        className="data-[state=active]:bg-purple-500/20"
                      >
                        Steps
                      </TabsTrigger>
                      {selectedSession.status === "complete" && (
                        <TabsTrigger
                          value="followup"
                          className="data-[state=active]:bg-purple-500/20"
                        >
                          Q&A{" "}
                          {followUps &&
                            followUps.length > 0 &&
                            `(${followUps.length})`}
                        </TabsTrigger>
                      )}
                    </TabsList>

                    <TabsContent value="summary" className="mt-4">
                      <div className="prose prose-invert prose-sm max-w-none">
                        {selectedSession.summary ? (
                          <Streamdown>{selectedSession.summary}</Streamdown>
                        ) : (
                          <div className="text-slate-400 text-center py-8">
                            <Brain className="w-8 h-8 mx-auto mb-2 opacity-50 animate-pulse" />
                            <p>Generating summary...</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="findings" className="mt-4">
                      <ScrollArea className="h-[400px]">
                        {selectedSession.findings &&
                        selectedSession.findings.length > 0 ? (
                          <div className="space-y-4">
                            {selectedSession.findings.map(
                              (finding: any, index: number) => (
                                <div
                                  key={index}
                                  className="p-4 bg-slate-800/50 rounded-lg border border-slate-700"
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <h4 className="font-medium text-white">
                                      {finding.title}
                                    </h4>
                                    <Badge
                                      variant="outline"
                                      className={`text-xs ${
                                        finding.confidence === "high"
                                          ? "border-green-500/50 text-green-400"
                                          : finding.confidence === "medium"
                                            ? "border-yellow-500/50 text-yellow-400"
                                            : "border-red-500/50 text-red-400"
                                      }`}
                                    >
                                      {finding.confidence} confidence
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-slate-300">
                                    {finding.content}
                                  </p>
                                  {finding.sources &&
                                    finding.sources.length > 0 && (
                                      <div className="mt-2 flex flex-wrap gap-1">
                                        {finding.sources.map(
                                          (source: string, i: number) => (
                                            <Badge
                                              key={i}
                                              variant="outline"
                                              className="text-xs border-slate-600 text-slate-400"
                                            >
                                              {source}
                                            </Badge>
                                          )
                                        )}
                                      </div>
                                    )}
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <div className="text-slate-400 text-center py-8">
                            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No findings yet</p>
                          </div>
                        )}
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="steps" className="mt-4">
                      <ScrollArea className="h-[400px]">
                        {selectedSession.steps &&
                        selectedSession.steps.length > 0 ? (
                          <div className="space-y-3">
                            {selectedSession.steps.map(
                              (step: any, index: number) => (
                                <div
                                  key={index}
                                  className={`p-3 rounded-lg border ${
                                    step.status === "complete"
                                      ? "bg-green-500/10 border-green-500/30"
                                      : step.status === "running"
                                        ? "bg-blue-500/10 border-blue-500/30"
                                        : "bg-slate-800/50 border-slate-700"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    {step.status === "complete" ? (
                                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                                    ) : step.status === "running" ? (
                                      <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                                    ) : (
                                      <Clock className="w-4 h-4 text-slate-500" />
                                    )}
                                    <span className="text-sm font-medium text-white">
                                      Step {step.stepNumber}: {step.title}
                                    </span>
                                  </div>
                                  {step.description && (
                                    <p className="text-xs text-slate-400 mt-1 ml-6">
                                      {step.description}
                                    </p>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <div className="text-slate-400 text-center py-8">
                            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>Research steps will appear here</p>
                          </div>
                        )}
                      </ScrollArea>
                    </TabsContent>

                    {selectedSession.status === "complete" && (
                      <TabsContent value="followup" className="mt-4">
                        <div className="space-y-4">
                          {/* Follow-up Input */}
                          <div className="flex gap-2">
                            <Input
                              placeholder="Ask a follow-up question..."
                              value={followUpQuestion}
                              onChange={e =>
                                setFollowUpQuestion(e.target.value)
                              }
                              onKeyDown={e =>
                                e.key === "Enter" && handleAskFollowUp()
                              }
                              className="bg-slate-800/50 border-slate-700 text-white"
                            />
                            <Button
                              onClick={handleAskFollowUp}
                              disabled={
                                !followUpQuestion.trim() ||
                                askFollowUpMutation.isPending
                              }
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              {askFollowUpMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                            </Button>
                          </div>

                          {/* Follow-up History */}
                          <ScrollArea className="h-[350px]">
                            {followUps && followUps.length > 0 ? (
                              <div className="space-y-4">
                                {followUps.map((qa: any) => (
                                  <div key={qa.id} className="space-y-2">
                                    <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
                                      <div className="flex items-center gap-2 mb-1">
                                        <MessageSquare className="w-4 h-4 text-purple-400" />
                                        <span className="text-xs text-purple-400">
                                          Question
                                        </span>
                                      </div>
                                      <p className="text-sm text-white">
                                        {qa.question}
                                      </p>
                                    </div>
                                    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 ml-4">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Brain className="w-4 h-4 text-cyan-400" />
                                        <span className="text-xs text-cyan-400">
                                          Answer
                                        </span>
                                      </div>
                                      <div className="prose prose-invert prose-sm max-w-none">
                                        <Streamdown>{qa.answer}</Streamdown>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-slate-400 text-center py-8">
                                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">
                                  No follow-up questions yet
                                </p>
                                <p className="text-xs text-slate-500">
                                  Ask questions to dive deeper into the research
                                </p>
                              </div>
                            )}
                          </ScrollArea>
                        </div>
                      </TabsContent>
                    )}
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-slate-900/50 border-purple-500/20 h-full flex items-center justify-center min-h-[600px]">
                <div className="text-center text-slate-400">
                  <Brain className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <h3 className="text-lg font-medium text-white mb-2">
                    No Research Selected
                  </h3>
                  <p className="text-sm">
                    Start a new research or select one from your history
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="bg-slate-900 border-purple-500/30 max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <LayoutTemplate className="w-5 h-5 text-purple-400" />
              Research Templates
            </DialogTitle>
            <DialogDescription>
              Choose a pre-built template or create your own
            </DialogDescription>
          </DialogHeader>

          {/* Search and Filter */}
          <div className="flex gap-4 py-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search templates..."
                value={templateSearch}
                onChange={e => setTemplateSearch(e.target.value)}
                className="pl-10 bg-slate-800/50 border-slate-700 text-white"
              />
            </div>
            <Select
              value={selectedCategory}
              onValueChange={v => setSelectedCategory(v as any)}
            >
              <SelectTrigger className="w-[200px] bg-slate-800/50 border-slate-700 text-white">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="favorites">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-400" />
                    My Favorites
                  </div>
                </SelectItem>
                <SelectItem value="custom">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-purple-400" />
                    My Templates
                  </div>
                </SelectItem>
                {Object.entries(RESEARCH_CATEGORIES).map(([key, cat]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <cat.icon className="w-4 h-4" />
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* User Categories (when viewing custom templates) */}
          {selectedCategory === "custom" &&
            userCategories &&
            userCategories.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-700">
                <span className="text-xs text-slate-400 self-center">
                  Your categories:
                </span>
                {userCategories.map(cat => (
                  <div key={cat.id} className="flex items-center gap-1">
                    <Badge
                      variant="outline"
                      className="text-xs cursor-pointer hover:bg-slate-700"
                      style={{
                        borderColor: cat.color || "#8b5cf6",
                        color: cat.color || "#8b5cf6",
                      }}
                    >
                      <Folder className="w-3 h-3 mr-1" />
                      {cat.name}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-slate-500 hover:text-red-400"
                      onClick={() => {
                        if (
                          confirm(
                            `Delete category "${cat.name}"? Templates will be moved to Uncategorized.`
                          )
                        ) {
                          deleteCategoryMutation.mutate({ id: cat.id });
                        }
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

          {/* Template Grid */}
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
              {/* Custom Templates Section */}
              {selectedCategory === "custom" &&
                customTemplates &&
                customTemplates.length > 0 && (
                  <>
                    {customTemplates.map(template => (
                      <Card
                        key={`custom-${template.id}`}
                        className="bg-slate-800/50 border-slate-700 hover:border-purple-500/50 cursor-pointer transition-all group relative"
                        onClick={() =>
                          handleApplyTemplate(
                            {
                              id: template.id.toString(),
                              name: template.name,
                              topic: template.topic,
                              depth: template.depth as ResearchDepth,
                            },
                            true
                          )
                        }
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="p-2 rounded-lg"
                                style={{
                                  backgroundColor: `${getCategoryColor(template.categoryId)}20`,
                                }}
                              >
                                <User
                                  className="w-4 h-4"
                                  style={{
                                    color: getCategoryColor(
                                      template.categoryId
                                    ),
                                  }}
                                />
                              </div>
                              <div>
                                <CardTitle className="text-white text-sm group-hover:text-purple-300 transition-colors">
                                  {template.name}
                                </CardTitle>
                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                  <Folder className="w-3 h-3" />
                                  {getCategoryName(template.categoryId)}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-slate-500 hover:text-yellow-400"
                                onClick={e => {
                                  e.stopPropagation();
                                  toggleFavoriteMutation.mutate({
                                    templateId: template.id.toString(),
                                    templateType: "custom",
                                    customTemplateId: template.id,
                                  });
                                }}
                              >
                                <Star
                                  className={`w-4 h-4 ${isTemplateFavorited(template.id.toString(), "custom") ? "fill-yellow-400 text-yellow-400" : ""}`}
                                />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-slate-500 hover:text-red-400"
                                onClick={e => {
                                  e.stopPropagation();
                                  deleteTemplateMutation.mutate({
                                    id: template.id,
                                  });
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-slate-400 mb-3 line-clamp-2">
                            {template.description || template.topic}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <TrendingUp className="w-3 h-3" />
                              Used {template.usageCount} times
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 ${
                                template.depth === "deep"
                                  ? "border-purple-500/50 text-purple-400"
                                  : template.depth === "standard"
                                    ? "border-blue-500/50 text-blue-400"
                                    : "border-yellow-500/50 text-yellow-400"
                              }`}
                            >
                              {template.depth}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}

              {/* Built-in Templates */}
              {selectedCategory !== "custom" &&
                getFilteredTemplates().map(template => {
                  const CategoryIcon =
                    RESEARCH_CATEGORIES[template.category].icon;
                  const TemplateIcon = template.icon;
                  const usageCount = getTemplateUsageCount(template.id);
                  const isFavorite = isTemplateFavorited(
                    template.id,
                    "builtin"
                  );

                  return (
                    <Card
                      key={template.id}
                      className="bg-slate-800/50 border-slate-700 hover:border-purple-500/50 cursor-pointer transition-all group relative"
                      onClick={() => handleApplyTemplate(template)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-purple-500/20">
                              <TemplateIcon className="w-4 h-4 text-purple-400" />
                            </div>
                            <div>
                              <CardTitle className="text-white text-sm group-hover:text-purple-300 transition-colors flex items-center gap-2">
                                {template.name}
                                {usageCount >= 10 && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1 py-0 border-orange-500/50 text-orange-400"
                                  >
                                    <Flame className="w-3 h-3 mr-0.5" />
                                    Popular
                                  </Badge>
                                )}
                              </CardTitle>
                              <div className="flex items-center gap-1 text-xs text-slate-500">
                                <CategoryIcon className="w-3 h-3" />
                                {RESEARCH_CATEGORIES[template.category].name}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-slate-500 hover:text-yellow-400"
                            onClick={e => {
                              e.stopPropagation();
                              toggleFavoriteMutation.mutate({
                                templateId: template.id,
                                templateType: "builtin",
                              });
                            }}
                          >
                            <Star
                              className={`w-4 h-4 ${isFavorite ? "fill-yellow-400 text-yellow-400" : ""}`}
                            />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-slate-400 mb-3 line-clamp-2">
                          {template.description}
                        </p>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {template.tags.slice(0, 3).map(tag => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 border-slate-600 text-slate-400"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <TrendingUp className="w-3 h-3" />
                            {usageCount} uses
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${
                              template.depth === "deep"
                                ? "border-purple-500/50 text-purple-400"
                                : template.depth === "standard"
                                  ? "border-blue-500/50 text-blue-400"
                                  : "border-yellow-500/50 text-yellow-400"
                            }`}
                          >
                            {template.depth}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

              {/* Empty States */}
              {selectedCategory === "custom" &&
                (!customTemplates || customTemplates.length === 0) && (
                  <div className="col-span-2 flex flex-col items-center justify-center py-12 text-slate-400">
                    <User className="w-12 h-12 mb-4 opacity-30" />
                    <p className="text-sm">No custom templates yet</p>
                    <p className="text-xs text-slate-500">
                      Save your research topics as templates for quick access
                    </p>
                  </div>
                )}

              {selectedCategory === "favorites" &&
                (!favorites || favorites.length === 0) && (
                  <div className="col-span-2 flex flex-col items-center justify-center py-12 text-slate-400">
                    <Star className="w-12 h-12 mb-4 opacity-30" />
                    <p className="text-sm">No favorites yet</p>
                    <p className="text-xs text-slate-500">
                      Click the star icon on templates to add them to favorites
                    </p>
                  </div>
                )}

              {selectedCategory !== "custom" &&
                selectedCategory !== "favorites" &&
                getFilteredTemplates().length === 0 && (
                  <div className="col-span-2 flex flex-col items-center justify-center py-12 text-slate-400">
                    <LayoutTemplate className="w-12 h-12 mb-4 opacity-30" />
                    <p className="text-sm">No templates found</p>
                    <p className="text-xs text-slate-500">
                      Try a different search or category
                    </p>
                  </div>
                )}
            </div>
          </ScrollArea>

          <DialogFooter className="border-t border-slate-700 pt-4">
            <Button
              variant="outline"
              onClick={() => setTemplateDialogOpen(false)}
              className="border-slate-700 text-slate-300"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog
        open={createTemplateDialogOpen}
        onOpenChange={setCreateTemplateDialogOpen}
      >
        <DialogContent className="bg-slate-900 border-purple-500/30">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-purple-400" />
              Save as Template
            </DialogTitle>
            <DialogDescription>
              Save this research topic as a reusable template
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Template Name</Label>
              <Input
                placeholder="e.g., AI Agent Architecture Research"
                value={newTemplateName}
                onChange={e => setNewTemplateName(e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Category</Label>
              <Select
                value={newTemplateCategoryId?.toString() || "none"}
                onValueChange={v =>
                  setNewTemplateCategoryId(v === "none" ? undefined : Number(v))
                }
              >
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="none">Uncategorized</SelectItem>
                  {userCategories?.map(cat => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color || "#8b5cf6" }}
                        />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Description (optional)</Label>
              <Textarea
                placeholder="Brief description of what this template researches..."
                value={newTemplateDescription}
                onChange={e => setNewTemplateDescription(e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-white resize-none"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">
                Tags (comma-separated, optional)
              </Label>
              <Input
                placeholder="e.g., AI, agents, architecture"
                value={newTemplateTags}
                onChange={e => setNewTemplateTags(e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-white"
              />
            </div>

            <div className="p-3 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-slate-400 mb-1">Research Topic:</p>
              <p className="text-sm text-white line-clamp-2">{topic}</p>
              <p className="text-xs text-slate-500 mt-2">Depth: {depth}</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateTemplateDialogOpen(false)}
              className="border-slate-700 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTemplate}
              disabled={
                !newTemplateName.trim() || createTemplateMutation.isPending
              }
              className="bg-purple-600 hover:bg-purple-700"
            >
              {createTemplateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="bg-slate-900 border-purple-500/30">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-purple-400" />
              Create Category
            </DialogTitle>
            <DialogDescription>
              Organize your custom templates into categories
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Category Name</Label>
              <Input
                placeholder="e.g., Machine Learning, Market Research"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Description (optional)</Label>
              <Input
                placeholder="Brief description of this category..."
                value={newCategoryDescription}
                onChange={e => setNewCategoryDescription(e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Color</Label>
              <div className="flex gap-2">
                {CATEGORY_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewCategoryColor(color)}
                    className={`w-8 h-8 rounded-full transition-all ${
                      newCategoryColor === color
                        ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900"
                        : ""
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCategoryDialogOpen(false)}
              className="border-slate-700 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCategory}
              disabled={
                !newCategoryName.trim() || createCategoryMutation.isPending
              }
              className="bg-purple-600 hover:bg-purple-700"
            >
              {createCategoryMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FolderPlus className="w-4 h-4 mr-2" />
              )}
              Create Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Templates Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="bg-slate-900 border-purple-500/30">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-purple-400" />
              Import Templates
            </DialogTitle>
            <DialogDescription>
              Import templates from a JSON file exported from another account
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Upload JSON File</Label>
              <Input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="bg-slate-800/50 border-slate-700 text-white file:bg-purple-600 file:text-white file:border-0 file:rounded file:px-3 file:py-1 file:mr-3"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Or paste JSON directly</Label>
              <Textarea
                placeholder='{"version": "1.0", "templates": [...], "categories": [...]}'
                value={importData}
                onChange={e => {
                  setImportData(e.target.value);
                  setImportError("");
                }}
                className="bg-slate-800/50 border-slate-700 text-white font-mono text-xs resize-none"
                rows={6}
              />
            </div>

            {importError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400">{importError}</p>
              </div>
            )}

            {importData && !importError && (
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-sm text-green-400">
                  JSON loaded. Click Import to proceed.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setImportDialogOpen(false);
                setImportData("");
                setImportError("");
              }}
              className="border-slate-700 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportTemplates}
              disabled={!importData.trim() || importTemplatesMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {importTemplatesMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Import Templates
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="bg-slate-900 border-purple-500/30">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Link2 className="w-5 h-5 text-purple-400" />
              Share Research
            </DialogTitle>
            <DialogDescription>
              Anyone with this link can view your research results
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={shareLink}
                readOnly
                className="bg-slate-800/50 border-slate-700 text-white"
              />
              <Button
                onClick={handleCopyShareLink}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              To disable sharing, click the share button again and select
              "Disable sharing"
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
