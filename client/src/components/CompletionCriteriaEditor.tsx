import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  Target,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

export interface CompletionCriterion {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
}

interface CompletionCriteriaEditorProps {
  criteria: CompletionCriterion[];
  onChange: (criteria: CompletionCriterion[]) => void;
  disabled?: boolean;
  sessionId?: string;
}

export function CompletionCriteriaEditor({
  criteria,
  onChange,
  disabled = false,
  sessionId
}: CompletionCriteriaEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [newCriterion, setNewCriterion] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");

  // Calculate completion progress
  const completedCount = criteria.filter(c => c.completed).length;
  const totalCount = criteria.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Add a new criterion
  const addCriterion = () => {
    if (!newCriterion.trim()) return;
    
    const newItem: CompletionCriterion = {
      id: `criterion-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      text: newCriterion.trim(),
      completed: false,
      createdAt: Date.now(),
    };
    
    onChange([...criteria, newItem]);
    setNewCriterion("");
  };

  // Add multiple criteria from bulk text
  const addBulkCriteria = () => {
    const lines = bulkText
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith("#"));
    
    const newItems: CompletionCriterion[] = lines.map(text => ({
      id: `criterion-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      text: text.replace(/^[-*•]\s*/, "").replace(/^\[\s*[xX]?\s*\]\s*/, ""),
      completed: text.match(/^\[\s*[xX]\s*\]/) !== null,
      createdAt: Date.now(),
    }));
    
    onChange([...criteria, ...newItems]);
    setBulkText("");
    setBulkMode(false);
  };

  // Toggle criterion completion
  const toggleCriterion = (id: string) => {
    if (disabled) return;
    
    onChange(
      criteria.map(c =>
        c.id === id
          ? {
              ...c,
              completed: !c.completed,
              completedAt: !c.completed ? Date.now() : undefined,
            }
          : c
      )
    );
  };

  // Delete a criterion
  const deleteCriterion = (id: string) => {
    onChange(criteria.filter(c => c.id !== id));
  };

  // Start editing a criterion
  const startEditing = (criterion: CompletionCriterion) => {
    setEditingId(criterion.id);
    setEditText(criterion.text);
  };

  // Save edited criterion
  const saveEdit = () => {
    if (!editingId || !editText.trim()) return;
    
    onChange(
      criteria.map(c =>
        c.id === editingId ? { ...c, text: editText.trim() } : c
      )
    );
    setEditingId(null);
    setEditText("");
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  // Generate COMPLETION_PROMISE.md content
  const generateMarkdown = () => {
    const lines = [
      "# COMPLETION PROMISE",
      "",
      `Session: ${sessionId || "Unnamed Session"}`,
      `Generated: ${new Date().toISOString()}`,
      "",
      "## Acceptance Criteria",
      "",
      ...criteria.map(c => `- [${c.completed ? "x" : " "}] ${c.text}`),
      "",
      "---",
      `Progress: ${completedCount}/${totalCount} (${Math.round(progress)}%)`,
    ];
    return lines.join("\n");
  };

  // Copy markdown to clipboard
  const copyMarkdown = () => {
    navigator.clipboard.writeText(generateMarkdown());
  };

  return (
    <div className="bg-black/30 border border-purple-500/30 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-purple-500/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Target className="w-5 h-5 text-purple-400" />
          <span className="font-orbitron text-purple-200">COMPLETION CRITERIA</span>
          <span className="text-xs text-purple-400/60 font-mono">
            {completedCount}/{totalCount}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-24">
            <Progress value={progress} className="h-2" />
          </div>
          <span className="text-sm text-purple-300 font-mono">{Math.round(progress)}%</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-purple-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-purple-400" />
          )}
        </div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-purple-500/20"
          >
            <div className="p-4 space-y-4">
              {/* Criteria List */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {criteria.length === 0 ? (
                  <div className="text-center py-6 text-purple-400/50">
                    <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No completion criteria defined</p>
                    <p className="text-xs mt-1">Add criteria to track your progress</p>
                  </div>
                ) : (
                  criteria.map((criterion, index) => (
                    <motion.div
                      key={criterion.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center gap-3 p-2 rounded-lg border transition-all ${
                        criterion.completed
                          ? "bg-green-500/10 border-green-500/30"
                          : "bg-purple-500/5 border-purple-500/20 hover:border-purple-500/40"
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleCriterion(criterion.id)}
                        disabled={disabled}
                        className={`flex-shrink-0 transition-colors ${
                          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                        }`}
                      >
                        {criterion.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        ) : (
                          <Circle className="w-5 h-5 text-purple-400 hover:text-purple-300" />
                        )}
                      </button>

                      {/* Text */}
                      {editingId === criterion.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <Input
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="flex-1 bg-black/40 border-purple-500/30 text-purple-100"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit();
                              if (e.key === "Escape") cancelEdit();
                            }}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={saveEdit}
                            className="h-7 px-2 text-green-400 hover:bg-green-500/20"
                          >
                            <Save className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEdit}
                            className="h-7 px-2 text-red-400 hover:bg-red-500/20"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span
                            className={`flex-1 text-sm ${
                              criterion.completed
                                ? "text-green-300 line-through opacity-70"
                                : "text-purple-200"
                            }`}
                          >
                            {criterion.text}
                          </span>

                          {/* Actions */}
                          {!disabled && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => startEditing(criterion)}
                                className="h-6 px-1.5 text-purple-400 hover:bg-purple-500/20"
                              >
                                <Edit3 className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteCriterion(criterion.id)}
                                className="h-6 px-1.5 text-red-400 hover:bg-red-500/20"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </motion.div>
                  ))
                )}
              </div>

              {/* Add New Criterion */}
              {!disabled && (
                <div className="space-y-3 pt-3 border-t border-purple-500/20">
                  {bulkMode ? (
                    <div className="space-y-2">
                      <Textarea
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                        placeholder="Paste multiple criteria (one per line)&#10;- [ ] First criterion&#10;- [ ] Second criterion&#10;- [x] Already completed"
                        className="bg-black/40 border-purple-500/30 text-purple-100 placeholder:text-purple-400/40 min-h-[100px] font-mono text-sm"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={addBulkCriteria}
                          disabled={!bulkText.trim()}
                          className="bg-purple-600 hover:bg-purple-500 text-white"
                        >
                          <Sparkles className="w-3 h-3 mr-1" />
                          Add All
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setBulkMode(false);
                            setBulkText("");
                          }}
                          className="text-purple-400 hover:bg-purple-500/20"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        value={newCriterion}
                        onChange={(e) => setNewCriterion(e.target.value)}
                        placeholder="Add a completion criterion..."
                        className="flex-1 bg-black/40 border-purple-500/30 text-purple-100 placeholder:text-purple-400/40"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addCriterion();
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={addCriterion}
                        disabled={!newCriterion.trim()}
                        className="bg-purple-600 hover:bg-purple-500 text-white"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setBulkMode(true)}
                        className="text-purple-400 hover:bg-purple-500/20"
                        title="Bulk Add"
                      >
                        <Sparkles className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              {criteria.length > 0 && (
                <div className="flex items-center justify-between pt-3 border-t border-purple-500/20">
                  <div className="text-xs text-purple-400/60">
                    {completedCount === totalCount && totalCount > 0 ? (
                      <span className="text-green-400">✓ All criteria met!</span>
                    ) : (
                      <span>{totalCount - completedCount} remaining</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={copyMarkdown}
                    className="text-purple-400 hover:bg-purple-500/20 text-xs"
                  >
                    Copy as Markdown
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CompletionCriteriaEditor;
