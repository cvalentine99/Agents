import { useState, useMemo } from "react";
import { Link } from "wouter";
import { PromptLibrary } from "@/components/PromptLibrary";
import {
  ArrowLeft,
  Plus,
  Search,
  Tag,
  FileText,
  Trash2,
  Edit,
  Copy,
  Download,
  Upload,
  Sparkles,
  X,
  BookOpen,
  Library,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  goal: string;
  context: string;
  doneWhen: string;
  doNot: string;
  tags: string[];
  agentProfile?: string;
  createdAt: Date;
  isBuiltIn?: boolean;
}

// Built-in starter templates
const BUILT_IN_TEMPLATES: PromptTemplate[] = [
  {
    id: "builtin-react-component",
    name: "React Component Builder",
    description:
      "Create a new React component with TypeScript and Tailwind CSS",
    goal: "Create a reusable React component with proper TypeScript types",
    context:
      "Using React 18+, TypeScript, and Tailwind CSS. Follow component best practices.",
    doneWhen:
      "Component renders correctly, has proper types, includes basic tests",
    doNot:
      "Don't use class components. Don't use inline styles. Don't skip TypeScript types.",
    tags: ["react", "typescript", "tailwind", "component"],
    agentProfile: "patch_goblin",
    createdAt: new Date(),
    isBuiltIn: true,
  },
  {
    id: "builtin-api-endpoint",
    name: "REST API Endpoint",
    description:
      "Build a new REST API endpoint with validation and error handling",
    goal: "Create a fully functional REST API endpoint",
    context:
      "Using Express/tRPC with Zod validation. Include proper error handling and logging.",
    doneWhen:
      "Endpoint works, has input validation, returns proper HTTP status codes, has tests",
    doNot:
      "Don't skip validation. Don't expose sensitive data. Don't forget error handling.",
    tags: ["api", "backend", "rest", "validation"],
    agentProfile: "test_gremlin",
    createdAt: new Date(),
    isBuiltIn: true,
  },
  {
    id: "builtin-bug-fix",
    name: "Bug Fix Investigation",
    description: "Investigate and fix a bug with minimal code changes",
    goal: "Find the root cause and fix the bug with the smallest possible change",
    context:
      "Bug reported by user. Need to reproduce, identify root cause, and fix.",
    doneWhen: "Bug is fixed, regression test added, no new bugs introduced",
    doNot:
      "Don't refactor unrelated code. Don't change APIs. Don't skip testing the fix.",
    tags: ["bugfix", "debugging", "minimal"],
    agentProfile: "patch_goblin",
    createdAt: new Date(),
    isBuiltIn: true,
  },
  {
    id: "builtin-refactor",
    name: "Safe Code Refactoring",
    description: "Refactor code to improve quality while preserving behavior",
    goal: "Improve code quality, readability, and maintainability",
    context:
      "Existing code works but needs improvement. Must not change external behavior.",
    doneWhen: "Code is cleaner, all tests pass, no behavior changes",
    doNot:
      "Don't change functionality. Don't break existing tests. Don't skip incremental commits.",
    tags: ["refactor", "cleanup", "quality"],
    agentProfile: "refactor_surgeon",
    createdAt: new Date(),
    isBuiltIn: true,
  },
  {
    id: "builtin-test-suite",
    name: "Test Suite Creation",
    description: "Create comprehensive test suite for existing code",
    goal: "Achieve high test coverage with meaningful tests",
    context:
      "Using Vitest/Jest. Include unit, integration, and edge case tests.",
    doneWhen: "Coverage > 80%, all edge cases covered, tests are maintainable",
    doNot:
      "Don't write trivial tests. Don't mock everything. Don't skip error scenarios.",
    tags: ["testing", "vitest", "coverage", "quality"],
    agentProfile: "test_gremlin",
    createdAt: new Date(),
    isBuiltIn: true,
  },
  {
    id: "builtin-architecture",
    name: "Architecture Design",
    description: "Design system architecture with tradeoff analysis",
    goal: "Create a well-designed architecture that meets requirements",
    context:
      "New feature or system needs architectural planning before implementation.",
    doneWhen:
      "Architecture documented, tradeoffs explained, implementation plan ready",
    doNot:
      "Don't skip scalability considerations. Don't ignore security. Don't over-engineer.",
    tags: ["architecture", "design", "planning"],
    agentProfile: "architect_owl",
    createdAt: new Date(),
    isBuiltIn: true,
  },
];

export default function PromptTemplates() {
  const [activeTab, setActiveTab] = useState<"templates" | "library">(
    "templates"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(
    null
  );

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    goal: "",
    context: "",
    doneWhen: "",
    doNot: "",
    tags: "",
    agentProfile: "",
  });

  // Fetch saved prompts from database
  const { data: savedPrompts, refetch } = trpc.prompts.list.useQuery();
  const savePromptMutation = trpc.prompts.save.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Template saved successfully!");
      resetForm();
      setIsCreateOpen(false);
      setEditingTemplate(null);
    },
    onError: error => {
      toast.error(`Failed to save template: ${error.message}`);
    },
  });
  const deletePromptMutation = trpc.prompts.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Template deleted");
    },
  });

  // Combine built-in and saved templates
  const allTemplates = useMemo(() => {
    const saved = (savedPrompts || []).map(p => ({
      id: String(p.id),
      name: p.name,
      description: p.goal?.substring(0, 100) || "",
      goal: p.goal || "",
      context: p.context || "",
      doneWhen: p.doneWhen || "",
      doNot: p.doNot || "",
      tags:
        p.expandedPrompt
          ?.split(",")
          .map(t => t.trim())
          .filter(Boolean) || [],
      agentProfile: "",
      createdAt: new Date(p.createdAt),
      isBuiltIn: false,
    }));
    return [...BUILT_IN_TEMPLATES, ...saved];
  }, [savedPrompts]);

  // Get all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    allTemplates.forEach(t => t.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }, [allTemplates]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return allTemplates.filter(template => {
      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        template.goal.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some(tag =>
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        );

      // Tag filter
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.every(tag => template.tags.includes(tag));

      return matchesSearch && matchesTags;
    });
  }, [allTemplates, searchQuery, selectedTags]);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      goal: "",
      context: "",
      doneWhen: "",
      doNot: "",
      tags: "",
      agentProfile: "",
    });
  };

  const handleSave = () => {
    if (!formData.name || !formData.goal) {
      toast.error("Name and Goal are required");
      return;
    }

    savePromptMutation.mutate({
      name: formData.name,
      goal: formData.goal,
      context: formData.context,
      doneWhen: formData.doneWhen,
      doNot: formData.doNot,
      expandedPrompt: formData.tags, // Store tags in expandedPrompt field
    });
  };

  const handleEdit = (template: PromptTemplate) => {
    if (template.isBuiltIn) {
      toast.error("Cannot edit built-in templates. Create a copy instead.");
      return;
    }
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      goal: template.goal,
      context: template.context,
      doneWhen: template.doneWhen,
      doNot: template.doNot,
      tags: template.tags.join(", "),
      agentProfile: template.agentProfile || "",
    });
    setIsCreateOpen(true);
  };

  const handleDelete = (template: PromptTemplate) => {
    if (template.isBuiltIn) {
      toast.error("Cannot delete built-in templates");
      return;
    }
    deletePromptMutation.mutate({ id: parseInt(template.id) });
  };

  const handleCopy = (template: PromptTemplate) => {
    setFormData({
      name: `${template.name} (Copy)`,
      description: template.description,
      goal: template.goal,
      context: template.context,
      doneWhen: template.doneWhen,
      doNot: template.doNot,
      tags: template.tags.join(", "),
      agentProfile: template.agentProfile || "",
    });
    setIsCreateOpen(true);
    toast.success("Template copied to editor");
  };

  const handleLoadToDashboard = (template: PromptTemplate) => {
    // Store in localStorage for Dashboard to pick up
    localStorage.setItem(
      "loadedPromptTemplate",
      JSON.stringify({
        goal: template.goal,
        context: template.context,
        doneWhen: template.doneWhen,
        doNot: template.doNot,
        agentProfile: template.agentProfile,
      })
    );
    toast.success("Template loaded! Go to Dashboard to use it.");
  };

  const handleExport = () => {
    const customTemplates = allTemplates.filter(t => !t.isBuiltIn);
    const blob = new Blob([JSON.stringify(customTemplates, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prompt-templates.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Templates exported!");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const templates = JSON.parse(event.target?.result as string);
        for (const template of templates) {
          await savePromptMutation.mutateAsync({
            name: template.name,
            goal: template.goal,
            context: template.context,
            doneWhen: template.doneWhen,
            doNot: template.doNot,
            expandedPrompt: template.tags?.join(", ") || "",
          });
        }
        toast.success(`Imported ${templates.length} templates!`);
      } catch (_err) {
        toast.error("Failed to import templates");
      }
    };
    reader.readAsText(file);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-purple-500/20 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-purple-400 hover:text-purple-300"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white font-orbitron">
                  Prompt Templates
                </h1>
                <p className="text-sm text-muted-foreground">
                  Reusable prompt configurations for common tasks
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="border-purple-500/30"
                  asChild
                >
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Import
                  </span>
                </Button>
              </label>
              <Button
                variant="outline"
                size="sm"
                className="border-purple-500/30"
                onClick={handleExport}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    New Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl bg-black/95 border-purple-500/30">
                  <DialogHeader>
                    <DialogTitle className="text-white font-orbitron">
                      {editingTemplate
                        ? "Edit Template"
                        : "Create New Template"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                    <div className="grid gap-2">
                      <Label>Template Name *</Label>
                      <Input
                        value={formData.name}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        placeholder="e.g., React Component Builder"
                        className="bg-black/50 border-purple-500/30"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Goal *</Label>
                      <Textarea
                        value={formData.goal}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            goal: e.target.value,
                          }))
                        }
                        placeholder="What should be accomplished?"
                        className="bg-black/50 border-purple-500/30"
                        rows={2}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Context</Label>
                      <Textarea
                        value={formData.context}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            context: e.target.value,
                          }))
                        }
                        placeholder="Background information, tech stack, constraints..."
                        className="bg-black/50 border-purple-500/30"
                        rows={2}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Done When</Label>
                      <Textarea
                        value={formData.doneWhen}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            doneWhen: e.target.value,
                          }))
                        }
                        placeholder="Completion criteria..."
                        className="bg-black/50 border-purple-500/30"
                        rows={2}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Do Not</Label>
                      <Textarea
                        value={formData.doNot}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            doNot: e.target.value,
                          }))
                        }
                        placeholder="Things to avoid..."
                        className="bg-black/50 border-purple-500/30"
                        rows={2}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Tags (comma-separated)</Label>
                      <Input
                        value={formData.tags}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            tags: e.target.value,
                          }))
                        }
                        placeholder="react, typescript, component"
                        className="bg-black/50 border-purple-500/30"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCreateOpen(false);
                        resetForm();
                        setEditingTemplate(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={handleSave}
                      disabled={savePromptMutation.isPending}
                    >
                      {savePromptMutation.isPending
                        ? "Saving..."
                        : "Save Template"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("templates")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === "templates"
                ? "bg-purple-600 text-white"
                : "bg-purple-500/10 text-purple-300 hover:bg-purple-500/20"
            }`}
          >
            <FileText className="w-4 h-4" />
            My Templates
          </button>
          <button
            onClick={() => setActiveTab("library")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === "library"
                ? "bg-purple-600 text-white"
                : "bg-purple-500/10 text-purple-300 hover:bg-purple-500/20"
            }`}
          >
            <Library className="w-4 h-4" />
            50 Single-Line Prompts
          </button>
        </div>

        {/* Library Tab */}
        {activeTab === "library" && (
          <PromptLibrary
            onSelectPrompt={prompt => {
              localStorage.setItem(
                "loadedPromptTemplate",
                JSON.stringify({
                  goal: prompt,
                  context: "",
                  doneWhen: "",
                  doNot: "",
                })
              );
              toast.success("Prompt loaded! Go to Dashboard to use it.");
            }}
          />
        )}

        {/* Templates Tab */}
        {activeTab === "templates" && (
          <>
            {/* Search and Filters */}
            <div className="mb-8">
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search templates by name, description, or tags..."
                    className="pl-10 bg-black/50 border-purple-500/30"
                  />
                </div>
              </div>

              {/* Tag filters */}
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Tag className="w-4 h-4" />
                  Filter by tag:
                </span>
                {allTags.map(tag => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className={`cursor-pointer transition-colors ${
                      selectedTags.includes(tag)
                        ? "bg-purple-600 hover:bg-purple-700"
                        : "border-purple-500/30 hover:bg-purple-500/20"
                    }`}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                    {selectedTags.includes(tag) && (
                      <X className="w-3 h-3 ml-1" />
                    )}
                  </Badge>
                ))}
                {selectedTags.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTags([])}
                    className="text-xs text-muted-foreground"
                  >
                    Clear all
                  </Button>
                )}
              </div>
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map(template => (
                <Card
                  key={template.id}
                  className={`bg-black/50 border-purple-500/30 hover:border-purple-500/50 transition-colors ${
                    template.isBuiltIn ? "border-l-4 border-l-cyan-500" : ""
                  }`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {template.isBuiltIn ? (
                          <Sparkles className="w-5 h-5 text-cyan-400" />
                        ) : (
                          <FileText className="w-5 h-5 text-purple-400" />
                        )}
                        <CardTitle className="text-lg text-white">
                          {template.name}
                        </CardTitle>
                      </div>
                      {template.isBuiltIn && (
                        <Badge
                          variant="outline"
                          className="text-xs border-cyan-500/50 text-cyan-400"
                        >
                          Built-in
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-muted-foreground line-clamp-2">
                      {template.description || template.goal}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {template.tags.slice(0, 4).map(tag => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-xs border-purple-500/30"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {template.tags.length > 4 && (
                        <Badge
                          variant="outline"
                          className="text-xs border-purple-500/30"
                        >
                          +{template.tags.length - 4}
                        </Badge>
                      )}
                    </div>

                    {/* Agent Profile */}
                    {template.agentProfile && (
                      <div className="text-xs text-muted-foreground mb-4">
                        Agent:{" "}
                        <span className="text-purple-400">
                          {template.agentProfile.replace("_", " ")}
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                        onClick={() => handleLoadToDashboard(template)}
                      >
                        <BookOpen className="w-4 h-4 mr-1" />
                        Use
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-purple-500/30"
                        onClick={() => handleCopy(template)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      {!template.isBuiltIn && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-purple-500/30"
                            onClick={() => handleEdit(template)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500/30 text-red-400 hover:bg-red-500/20"
                            onClick={() => handleDelete(template)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Empty State */}
            {filteredTemplates.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-purple-500/50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  No Templates Found
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || selectedTags.length > 0
                    ? "Try adjusting your search or filters"
                    : "Create your first template to get started"}
                </p>
                <Button
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={() => setIsCreateOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Template
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
