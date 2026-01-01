import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Zap, 
  Bird, 
  Bug, 
  Scissors,
  Check,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Bot,
  Sparkles,
  Code,
  FileCode,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  Library,
} from "lucide-react";
import { ProfileTemplateGallery } from "./ProfileTemplateGallery";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export type AgentProfile = "patch_goblin" | "architect_owl" | "test_gremlin" | "refactor_surgeon" | string;

interface ProfileData {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  traits: string[];
  color: string;
  glowColor: string;
  isBuiltIn: boolean;
  systemPrompt?: string;
  outputStyle?: string;
  codeGeneration?: string;
  testingApproach?: string;
}

// Icon mapping for custom profiles
const iconMap: Record<string, React.ReactNode> = {
  Zap: <Zap className="w-8 h-8" />,
  Bird: <Bird className="w-8 h-8" />,
  Bug: <Bug className="w-8 h-8" />,
  Scissors: <Scissors className="w-8 h-8" />,
  Bot: <Bot className="w-8 h-8" />,
  Sparkles: <Sparkles className="w-8 h-8" />,
  Code: <Code className="w-8 h-8" />,
  FileCode: <FileCode className="w-8 h-8" />,
};

// Color mapping
const colorMap: Record<string, { color: string; glow: string }> = {
  green: { color: "var(--cyber-cyan)", glow: "var(--neon-cyan)" },
  blue: { color: "var(--cyber-purple)", glow: "var(--neon-purple)" },
  orange: { color: "var(--status-success)", glow: "oklch(0.75 0.22 145)" },
  purple: { color: "var(--cyber-magenta)", glow: "var(--neon-pink)" },
  cyan: { color: "#00d4ff", glow: "#00d4ff" },
  pink: { color: "#ff6b9d", glow: "#ff6b9d" },
  yellow: { color: "#ffd700", glow: "#ffd700" },
};

const builtInProfiles: ProfileData[] = [
  {
    id: "patch_goblin",
    name: "Patch Goblin",
    icon: <Zap className="w-8 h-8" />,
    description: "Fast diffs, minimal prose",
    traits: ["Quick patches", "Unified diffs only", "No explanations", "Surgical precision"],
    color: "var(--cyber-cyan)",
    glowColor: "var(--neon-cyan)",
    isBuiltIn: true,
  },
  {
    id: "architect_owl",
    name: "Architect Owl",
    icon: <Bird className="w-8 h-8" />,
    description: "Design & tradeoffs, no code yet",
    traits: ["System design", "Tradeoff analysis", "Architecture docs", "No implementation"],
    color: "var(--cyber-purple)",
    glowColor: "var(--neon-purple)",
    isBuiltIn: true,
  },
  {
    id: "test_gremlin",
    name: "Test Gremlin",
    icon: <Bug className="w-8 h-8" />,
    description: "Tests first, then code",
    traits: ["TDD approach", "Edge cases", "Test coverage", "Regression prevention"],
    color: "var(--status-success)",
    glowColor: "oklch(0.75 0.22 145)",
    isBuiltIn: true,
  },
  {
    id: "refactor_surgeon",
    name: "Refactor Surgeon",
    icon: <Scissors className="w-8 h-8" />,
    description: "Safe refactors, tight scope",
    traits: ["Behavior preservation", "Small steps", "Rollback-friendly", "Clean code"],
    color: "var(--cyber-magenta)",
    glowColor: "var(--neon-pink)",
    isBuiltIn: true,
  },
];

interface AgentProfilesProps {
  selectedProfile: AgentProfile;
  onSelectProfile: (profile: AgentProfile) => void;
  disabled?: boolean;
}

interface CreateProfileForm {
  name: string;
  description: string;
  icon: string;
  color: string;
  systemPrompt: string;
  outputStyle: "concise" | "detailed" | "balanced";
  codeGeneration: "full" | "diffs" | "none";
  testingApproach: "test_first" | "test_after" | "no_tests";
}

const defaultForm: CreateProfileForm = {
  name: "",
  description: "",
  icon: "Bot",
  color: "purple",
  systemPrompt: "",
  outputStyle: "balanced",
  codeGeneration: "diffs",
  testingApproach: "test_after",
};

export function AgentProfiles({ selectedProfile, onSelectProfile, disabled }: AgentProfilesProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [editingProfile, setEditingProfile] = useState<number | null>(null);
  const [duplicateSource, setDuplicateSource] = useState<{ id: string | number; name: string } | null>(null);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [form, setForm] = useState<CreateProfileForm>(defaultForm);
  const [showCustom, setShowCustom] = useState(true);

  // Queries
  const profilesQuery = trpc.agentProfiles.list.useQuery();
  
  // Mutations
  const createMutation = trpc.agentProfiles.create.useMutation({
    onSuccess: () => {
      toast.success("Profile created successfully");
      setShowCreateModal(false);
      setForm(defaultForm);
      profilesQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create profile: ${error.message}`);
    },
  });

  const updateMutation = trpc.agentProfiles.update.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully");
      setEditingProfile(null);
      setShowCreateModal(false);
      setForm(defaultForm);
      profilesQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });

  const deleteMutation = trpc.agentProfiles.delete.useMutation({
    onSuccess: () => {
      toast.success("Profile deleted");
      setShowDeleteConfirm(null);
      profilesQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete profile: ${error.message}`);
    },
  });

  const duplicateMutation = trpc.agentProfiles.duplicate.useMutation({
    onSuccess: () => {
      toast.success("Profile duplicated");
      setDuplicateSource(null);
      profilesQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to duplicate profile: ${error.message}`);
    },
  });

  // Combine built-in and custom profiles
  const customProfiles: ProfileData[] = (profilesQuery.data?.custom || []).map((p) => {
    const colors = colorMap[p.color] || colorMap.purple;
    return {
      id: `custom_${p.id}`,
      name: p.name,
      icon: iconMap[p.icon] || <Bot className="w-8 h-8" />,
      description: p.description,
      traits: [
        `Output: ${p.outputStyle}`,
        `Code: ${p.codeGeneration}`,
        `Tests: ${p.testingApproach}`,
      ],
      color: colors.color,
      glowColor: colors.glow,
      isBuiltIn: false,
      systemPrompt: p.systemPrompt,
      outputStyle: p.outputStyle,
      codeGeneration: p.codeGeneration,
      testingApproach: p.testingApproach,
    };
  });

  const allProfiles = [...builtInProfiles, ...customProfiles];

  const handleCreate = () => {
    if (editingProfile) {
      updateMutation.mutate({
        id: editingProfile,
        ...form,
      });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleEdit = (profile: ProfileData) => {
    const customId = parseInt(profile.id.replace("custom_", ""));
    const customProfile = profilesQuery.data?.custom.find((p) => p.id === customId);
    if (customProfile) {
      setEditingProfile(customId);
      setForm({
        name: customProfile.name,
        description: customProfile.description,
        icon: customProfile.icon,
        color: customProfile.color,
        systemPrompt: customProfile.systemPrompt,
        outputStyle: customProfile.outputStyle as "concise" | "detailed" | "balanced",
        codeGeneration: customProfile.codeGeneration as "full" | "diffs" | "none",
        testingApproach: customProfile.testingApproach as "test_first" | "test_after" | "no_tests",
      });
      setShowCreateModal(true);
    }
  };

  const handleDuplicate = (profile: ProfileData) => {
    const sourceId = profile.isBuiltIn ? profile.id : parseInt(profile.id.replace("custom_", ""));
    setDuplicateSource({ id: sourceId, name: profile.name });
  };

  const confirmDuplicate = (newName: string) => {
    if (duplicateSource) {
      duplicateMutation.mutate({
        sourceId: duplicateSource.id,
        newName,
      });
    }
  };

  return (
    <div className="cyber-card p-6" data-tour="agent-profiles">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-cyber text-xl font-bold neon-text-purple">
          AGENT PROFILES
        </h2>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowTemplateGallery(true)}
            size="sm"
            variant="outline"
            className="border-purple-500/50 hover:bg-purple-500/20"
          >
            <Library className="w-4 h-4 mr-1" />
            Templates
          </Button>
          <Button
            onClick={() => {
              setEditingProfile(null);
              setForm(defaultForm);
              setShowCreateModal(true);
            }}
            size="sm"
            className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500"
          >
            <Plus className="w-4 h-4 mr-1" />
            Create Profile
          </Button>
        </div>
      </div>
      
      {/* Built-in Profiles */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Built-in Profiles</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {builtInProfiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              isSelected={selectedProfile === profile.id}
              onSelect={() => !disabled && onSelectProfile(profile.id)}
              onDuplicate={() => handleDuplicate(profile)}
              disabled={disabled}
            />
          ))}
        </div>
      </div>

      {/* Custom Profiles */}
      {customProfiles.length > 0 && (
        <div>
          <button
            onClick={() => setShowCustom(!showCustom)}
            className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] mb-3 hover:text-[var(--text-primary)] transition-colors"
          >
            {showCustom ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Custom Profiles ({customProfiles.length})
          </button>
          
          <AnimatePresence>
            {showCustom && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {customProfiles.map((profile) => (
                    <ProfileCard
                      key={profile.id}
                      profile={profile}
                      isSelected={selectedProfile === profile.id}
                      onSelect={() => !disabled && onSelectProfile(profile.id)}
                      onEdit={() => handleEdit(profile)}
                      onDelete={() => setShowDeleteConfirm(parseInt(profile.id.replace("custom_", "")))}
                      onDuplicate={() => handleDuplicate(profile)}
                      disabled={disabled}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingProfile ? "Edit Agent Profile" : "Create Agent Profile"}
            </DialogTitle>
            <DialogDescription>
              Define a custom agent persona with specific behaviors and output styles.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="My Custom Agent"
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Icon</Label>
                  <Select value={form.icon} onValueChange={(v) => setForm({ ...form, icon: v })}>
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(iconMap).map((icon) => (
                        <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Color</Label>
                  <Select value={form.color} onValueChange={(v) => setForm({ ...form, color: v })}>
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(colorMap).map((color) => (
                        <SelectItem key={color} value={color}>
                          <span className="capitalize">{color}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description of this agent's purpose"
                className="bg-slate-800 border-slate-700"
              />
            </div>

            <div>
              <Label>System Prompt</Label>
              <Textarea
                value={form.systemPrompt}
                onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                placeholder="Define the agent's personality, expertise, and behavior guidelines..."
                className="bg-slate-800 border-slate-700 min-h-[120px]"
              />
              <p className="text-xs text-slate-500 mt-1">
                This prompt will be injected into every conversation with this agent.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Output Style</Label>
                <Select value={form.outputStyle} onValueChange={(v: "concise" | "detailed" | "balanced") => setForm({ ...form, outputStyle: v })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concise">Concise</SelectItem>
                    <SelectItem value="balanced">Balanced</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Code Generation</Label>
                <Select value={form.codeGeneration} onValueChange={(v: "full" | "diffs" | "none") => setForm({ ...form, codeGeneration: v })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Files</SelectItem>
                    <SelectItem value="diffs">Diffs Only</SelectItem>
                    <SelectItem value="none">No Code</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Testing Approach</Label>
                <Select value={form.testingApproach} onValueChange={(v: "test_first" | "test_after" | "no_tests") => setForm({ ...form, testingApproach: v })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="test_first">Test First (TDD)</SelectItem>
                    <SelectItem value="test_after">Test After</SelectItem>
                    <SelectItem value="no_tests">No Tests</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!form.name || !form.description || !form.systemPrompt || createMutation.isPending || updateMutation.isPending}
              className="bg-gradient-to-r from-cyan-600 to-purple-600"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editingProfile ? "Update Profile" : "Create Profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteConfirm !== null} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Profile?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The profile will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => showDeleteConfirm && deleteMutation.mutate({ id: showDeleteConfirm })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Modal */}
      <DuplicateModal
        open={duplicateSource !== null}
        onClose={() => setDuplicateSource(null)}
        sourceName={duplicateSource?.name || ""}
        onConfirm={confirmDuplicate}
        isPending={duplicateMutation.isPending}
      />

      {/* Template Gallery Dialog */}
      <Dialog open={showTemplateGallery} onOpenChange={setShowTemplateGallery}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-xl text-white flex items-center gap-2">
              <Library className="w-5 h-5 text-purple-400" />
              Agent Profile Templates
            </DialogTitle>
            <DialogDescription>
              Browse pre-made agent profiles and import them to customize for your needs.
            </DialogDescription>
          </DialogHeader>
          <ProfileTemplateGallery
            onImport={() => {
              setShowTemplateGallery(false);
              profilesQuery.refetch();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Profile Card Component
function ProfileCard({
  profile,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
  disabled,
}: {
  profile: ProfileData;
  isSelected: boolean;
  onSelect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.div
      className={`relative p-4 rounded text-left transition-all ${
        isSelected ? "cyber-border" : "cyber-glass hover:border-[var(--cyber-purple)]/50"
      }`}
      style={{
        background: isSelected 
          ? `linear-gradient(135deg, ${profile.color}20 0%, transparent 100%)`
          : undefined,
      }}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
    >
      {/* Action buttons for custom profiles */}
      {!profile.isBuiltIn && (onEdit || onDelete) && (
        <div className="absolute top-2 right-2 flex gap-1">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1 rounded hover:bg-red-900/50 text-slate-400 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <motion.div
          className="absolute top-2 right-2"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          <Check 
            className="w-5 h-5" 
            style={{ color: profile.color }}
          />
        </motion.div>
      )}

      <button
        onClick={onSelect}
        disabled={disabled}
        className="w-full text-left"
      >
        {/* Icon */}
        <div 
          className="mb-3"
          style={{ 
            color: profile.color,
            filter: isSelected ? `drop-shadow(0 0 10px ${profile.glowColor})` : undefined,
          }}
        >
          {profile.icon}
        </div>
        
        {/* Name with badge */}
        <div className="flex items-center gap-2 mb-1">
          <h3 
            className="font-cyber text-sm font-bold"
            style={{ 
              color: isSelected ? profile.color : "var(--text-primary)",
              textShadow: isSelected ? `0 0 10px ${profile.glowColor}` : undefined,
            }}
          >
            {profile.name}
          </h3>
          {!profile.isBuiltIn && (
            <Badge variant="outline" className="text-[8px] px-1 py-0 border-cyan-500/50 text-cyan-400">
              Custom
            </Badge>
          )}
        </div>
        
        {/* Description */}
        <p className="text-xs text-[var(--text-muted)] mb-3">
          {profile.description}
        </p>
        
        {/* Traits */}
        <div className="space-y-1">
          {profile.traits.slice(0, 4).map((trait, index) => (
            <div 
              key={index}
              className="flex items-center gap-2 text-[10px]"
            >
              <div 
                className="w-1 h-1 rounded-full"
                style={{ backgroundColor: profile.color }}
              />
              <span className="text-[var(--text-secondary)]">{trait}</span>
            </div>
          ))}
        </div>
      </button>

      {/* Duplicate button */}
      {onDuplicate && (
        <button
          onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
          className="absolute bottom-2 right-2 p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-cyan-400 transition-colors"
          title="Duplicate profile"
        >
          <Copy className="w-3 h-3" />
        </button>
      )}
    </motion.div>
  );
}

// Duplicate Modal
function DuplicateModal({
  open,
  onClose,
  sourceName,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  sourceName: string;
  onConfirm: (newName: string) => void;
  isPending: boolean;
}) {
  const [newName, setNewName] = useState("");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Duplicate Profile</DialogTitle>
          <DialogDescription>
            Create a copy of "{sourceName}" with a new name.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label>New Profile Name</Label>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={`${sourceName} (Copy)`}
            className="bg-slate-800 border-slate-700"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => onConfirm(newName || `${sourceName} (Copy)`)}
            disabled={isPending}
            className="bg-gradient-to-r from-cyan-600 to-purple-600"
          >
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Duplicate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Export profile data for use in other components
export function getProfileData(profileId: AgentProfile): ProfileData | undefined {
  return builtInProfiles.find(p => p.id === profileId);
}

export function getProfilePromptModifier(profileId: AgentProfile): string {
  switch (profileId) {
    case "patch_goblin":
      return `Mode: PATCH GOBLIN
- Output unified diff patches only
- No explanations or prose
- Surgical, minimal changes
- Speed over documentation`;
    
    case "architect_owl":
      return `Mode: ARCHITECT OWL
- Design and architecture focus
- Analyze tradeoffs thoroughly
- Document decisions
- NO code implementation yet`;
    
    case "test_gremlin":
      return `Mode: TEST GREMLIN
- Write tests FIRST
- Cover edge cases
- Ensure high coverage
- Then implement to pass tests`;
    
    case "refactor_surgeon":
      return `Mode: REFACTOR SURGEON
- Preserve existing behavior
- Small, incremental steps
- Each step must be rollback-friendly
- Focus on code quality`;
    
    default:
      // For custom profiles, return empty - the system prompt is handled separately
      return "";
  }
}
