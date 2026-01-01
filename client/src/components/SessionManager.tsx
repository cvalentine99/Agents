import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Settings, 
  Play, 
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Check,
  Square,
  Shield,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface CompletionCriterion {
  id: string;
  text: string;
  checked: boolean;
}

interface SessionConfig {
  ralphMode: boolean;
  maxIterations: number;
  noProgressThreshold: number;
  autoAskHuman: boolean;
  safetyMode: "standard" | "strict" | "permissive";
}

interface SessionManagerProps {
  sessionId: string;
  config: SessionConfig;
  criteria: CompletionCriterion[];
  onConfigChange: (config: SessionConfig) => void;
  onCriteriaChange: (criteria: CompletionCriterion[]) => void;
  onStartSession: () => void;
  onPauseSession: () => void;
  onResetSession: () => void;
  isRunning: boolean;
}

export function SessionManager({
  sessionId,
  config,
  criteria,
  onConfigChange,
  onCriteriaChange,
  onStartSession,
  onPauseSession,
  onResetSession,
  isRunning,
}: SessionManagerProps) {
  const [newCriterion, setNewCriterion] = useState("");

  const addCriterion = () => {
    if (!newCriterion.trim()) return;
    
    onCriteriaChange([
      ...criteria,
      {
        id: `criterion-${Date.now()}`,
        text: newCriterion.trim(),
        checked: false,
      },
    ]);
    setNewCriterion("");
  };

  const toggleCriterion = (id: string) => {
    onCriteriaChange(
      criteria.map((c) =>
        c.id === id ? { ...c, checked: !c.checked } : c
      )
    );
  };

  const removeCriterion = (id: string) => {
    onCriteriaChange(criteria.filter((c) => c.id !== id));
  };

  const completionProgress = criteria.length > 0
    ? Math.round((criteria.filter((c) => c.checked).length / criteria.length) * 100)
    : 0;

  const promiseSatisfied = criteria.length > 0 && criteria.every((c) => c.checked);

  return (
    <div className="cyber-card p-6 space-y-6" data-tour="session-manager">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-cyber text-xl font-bold neon-text-purple">
            SESSION MANAGER
          </h2>
          <span className="text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-surface)] px-2 py-1 rounded">
            {sessionId}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isRunning ? (
            <Button
              variant="outline"
              size="sm"
              className="border-[var(--cyber-yellow)] text-[var(--cyber-yellow)]"
              onClick={onPauseSession}
            >
              <Pause className="w-4 h-4 mr-1" />
              Pause
            </Button>
          ) : (
            <Button
              className="cyber-btn"
              size="sm"
              onClick={onStartSession}
              disabled={criteria.length === 0}
            >
              <Play className="w-4 h-4 mr-1" />
              Start
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetSession}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* RALPH Mode Toggle */}
      <div className="cyber-glass p-4 rounded">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded ${config.ralphMode ? "bg-[var(--cyber-purple)]/20" : "bg-[var(--bg-surface)]"}`}>
              {config.ralphMode ? (
                <Shield className="w-5 h-5 text-[var(--cyber-purple)]" />
              ) : (
                <Zap className="w-5 h-5 text-[var(--text-muted)]" />
              )}
            </div>
            <div>
              <Label className="font-cyber text-sm font-bold">
                {config.ralphMode ? "RALPH MODE" : "MANUAL MODE"}
              </Label>
              <p className="text-xs text-[var(--text-muted)]">
                {config.ralphMode 
                  ? "Autonomous loop with promise gate enforcement" 
                  : "One-shot execution without loop control"}
              </p>
            </div>
          </div>
          <Switch
            checked={config.ralphMode}
            onCheckedChange={(checked) => onConfigChange({ ...config, ralphMode: checked })}
            disabled={isRunning}
          />
        </div>

        {/* RALPH Mode Settings */}
        <AnimatePresence>
          {config.ralphMode && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-[var(--color-border)]">
                {/* Max Iterations */}
                <div className="space-y-2">
                  <Label className="text-xs font-cyber uppercase tracking-wider">
                    Max Iterations: {config.maxIterations}
                  </Label>
                  <Slider
                    value={[config.maxIterations]}
                    onValueChange={([value]) => onConfigChange({ ...config, maxIterations: value })}
                    min={5}
                    max={100}
                    step={5}
                    disabled={isRunning}
                  />
                </div>

                {/* No Progress Threshold */}
                <div className="space-y-2">
                  <Label className="text-xs font-cyber uppercase tracking-wider">
                    No Progress Threshold: {config.noProgressThreshold}
                  </Label>
                  <Slider
                    value={[config.noProgressThreshold]}
                    onValueChange={([value]) => onConfigChange({ ...config, noProgressThreshold: value })}
                    min={1}
                    max={10}
                    step={1}
                    disabled={isRunning}
                  />
                </div>

                {/* Auto Ask Human */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-cyber uppercase tracking-wider">
                    Auto Ask Human
                  </Label>
                  <Switch
                    checked={config.autoAskHuman}
                    onCheckedChange={(checked) => onConfigChange({ ...config, autoAskHuman: checked })}
                    disabled={isRunning}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Completion Promise Editor */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-cyber text-sm font-bold text-[var(--cyber-cyan)]">
            COMPLETION PROMISE
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono">
              {completionProgress}% Complete
            </span>
            {promiseSatisfied && (
              <span className="text-xs font-mono text-[var(--status-success)] flex items-center gap-1">
                <Check className="w-3 h-3" />
                SATISFIED
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-[var(--bg-void)] rounded overflow-hidden">
          <motion.div
            className="h-full"
            style={{
              background: promiseSatisfied 
                ? "var(--status-success)"
                : "linear-gradient(90deg, var(--cyber-purple) 0%, var(--cyber-cyan) 100%)",
            }}
            animate={{ width: `${completionProgress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Criteria List */}
        <div className="space-y-2">
          {criteria.map((criterion) => (
            <motion.div
              key={criterion.id}
              className={`flex items-center gap-3 p-3 rounded transition-colors ${
                criterion.checked 
                  ? "bg-[var(--status-success)]/10" 
                  : "cyber-glass"
              }`}
              layout
            >
              <button
                className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                  criterion.checked
                    ? "bg-[var(--status-success)] border-[var(--status-success)]"
                    : "border-[var(--color-border)] hover:border-[var(--cyber-purple)]"
                }`}
                onClick={() => toggleCriterion(criterion.id)}
                disabled={isRunning}
              >
                {criterion.checked && <Check className="w-3 h-3 text-white" />}
              </button>
              <span 
                className={`flex-1 text-sm ${
                  criterion.checked 
                    ? "text-[var(--text-muted)] line-through" 
                    : "text-[var(--text-primary)]"
                }`}
              >
                {criterion.text}
              </span>
              <button
                className="p-1 hover:bg-[var(--status-error)]/10 rounded transition-colors"
                onClick={() => removeCriterion(criterion.id)}
                disabled={isRunning}
              >
                <Trash2 className="w-4 h-4 text-[var(--text-muted)] hover:text-[var(--status-error)]" />
              </button>
            </motion.div>
          ))}
        </div>

        {/* Add Criterion */}
        <div className="flex gap-2">
          <Input
            placeholder="Add success criterion..."
            value={newCriterion}
            onChange={(e) => setNewCriterion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCriterion()}
            className="flex-1 bg-[var(--bg-surface)] border-[var(--color-border)]"
            disabled={isRunning}
          />
          <Button
            variant="outline"
            onClick={addCriterion}
            disabled={!newCriterion.trim() || isRunning}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stop Hook Visualization */}
      {config.ralphMode && (
        <div className="cyber-glass p-4 rounded">
          <h3 className="font-cyber text-sm font-bold text-[var(--cyber-magenta)] mb-3">
            STOP HOOK ENFORCEMENT
          </h3>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[var(--cyber-cyan)]" />
              <span className="text-[var(--text-muted)]">Agent tries to exit</span>
            </div>
            <span className="text-[var(--text-muted)]">→</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[var(--cyber-purple)]" />
              <span className="text-[var(--text-muted)]">Stop hook intercepts</span>
            </div>
            <span className="text-[var(--text-muted)]">→</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${promiseSatisfied ? "bg-[var(--status-success)]" : "bg-[var(--status-error)]"}`} />
              <span className="text-[var(--text-muted)]">
                {promiseSatisfied ? "Exit allowed" : "Continue loop"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Default session config
export const defaultSessionConfig: SessionConfig = {
  ralphMode: true,
  maxIterations: 50,
  noProgressThreshold: 3,
  autoAskHuman: true,
  safetyMode: "standard",
};

export type { SessionConfig, CompletionCriterion };
