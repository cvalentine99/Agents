import { motion } from "framer-motion";
import { 
  FileText, 
  Code, 
  Eye, 
  CheckSquare,
  ChevronRight,
  Settings,
  Play,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ModelType } from "./ModelWheel";

export type StageStatus = "pending" | "running" | "complete" | "failed" | "skipped";

interface Stage {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  model: ModelType;
  status: StageStatus;
  output?: string;
  duration?: number;
}

interface AssemblyLineProps {
  stages: Stage[];
  onModelChange: (stageId: string, model: ModelType) => void;
  onRunPipeline: () => void;
  isRunning: boolean;
}

const defaultStages: Stage[] = [
  {
    id: "spec",
    name: "Spec Agent",
    description: "Clarifies requirements & writes completion promise",
    icon: <FileText className="w-5 h-5" />,
    model: "claude",
    status: "pending",
  },
  {
    id: "implement",
    name: "Implementer",
    description: "Makes the patch based on spec",
    icon: <Code className="w-5 h-5" />,
    model: "codex",
    status: "pending",
  },
  {
    id: "review",
    name: "Reviewer",
    description: "Checks for bugs, security, style",
    icon: <Eye className="w-5 h-5" />,
    model: "gemini",
    status: "pending",
  },
  {
    id: "verify",
    name: "Verifier",
    description: "Runs tests/build & summarizes results",
    icon: <CheckSquare className="w-5 h-5" />,
    model: "manus",
    status: "pending",
  },
];

export function AssemblyLine({ 
  stages = defaultStages, 
  onModelChange, 
  onRunPipeline,
  isRunning 
}: AssemblyLineProps) {
  const getStatusColor = (status: StageStatus) => {
    switch (status) {
      case "pending": return "var(--text-muted)";
      case "running": return "var(--cyber-cyan)";
      case "complete": return "var(--status-success)";
      case "failed": return "var(--status-error)";
      case "skipped": return "var(--text-muted)";
    }
  };

  const getModelColor = (model: ModelType) => {
    switch (model) {
      case "codex": return "var(--cyber-cyan)";
      case "claude": return "var(--cyber-magenta)";
      case "gemini": return "var(--cyber-purple)";
      case "manus": return "var(--cyber-yellow)";
    }
  };

  return (
    <div className="cyber-card p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-cyber text-xl font-bold neon-text-purple">
          MULTI-AGENT ASSEMBLY LINE
        </h2>
        <Button
          className="cyber-btn"
          onClick={onRunPipeline}
          disabled={isRunning}
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Run Pipeline
            </>
          )}
        </Button>
      </div>

      {/* Pipeline Visualization */}
      <div className="relative">
        {/* Connection Line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[var(--bg-surface)] -translate-y-1/2 z-0" />
        
        {/* Stages */}
        <div className="relative z-10 grid grid-cols-4 gap-4">
          {stages.map((stage, index) => (
            <div key={stage.id} className="flex flex-col items-center">
              {/* Stage Card */}
              <motion.div
                className={`w-full cyber-glass p-4 rounded relative ${
                  stage.status === "running" ? "cyber-border" : ""
                }`}
                style={{
                  borderColor: stage.status === "running" ? getStatusColor(stage.status) : undefined,
                }}
                animate={{
                  boxShadow: stage.status === "running" 
                    ? `0 0 20px ${getStatusColor(stage.status)}`
                    : "none",
                }}
              >
                {/* Status Indicator */}
                <motion.div
                  className="absolute -top-2 -right-2 w-4 h-4 rounded-full"
                  style={{ backgroundColor: getStatusColor(stage.status) }}
                  animate={{
                    scale: stage.status === "running" ? [1, 1.2, 1] : 1,
                  }}
                  transition={{ duration: 0.5, repeat: stage.status === "running" ? Infinity : 0 }}
                />

                {/* Icon */}
                <div 
                  className="mb-3"
                  style={{ color: getStatusColor(stage.status) }}
                >
                  {stage.status === "running" ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    stage.icon
                  )}
                </div>

                {/* Name */}
                <h3 className="font-cyber text-sm font-bold mb-1 text-[var(--text-primary)]">
                  {stage.name}
                </h3>

                {/* Description */}
                <p className="text-[10px] text-[var(--text-muted)] mb-3 line-clamp-2">
                  {stage.description}
                </p>

                {/* Model Selector */}
                <div className="flex items-center gap-2">
                  <Settings className="w-3 h-3 text-[var(--text-muted)]" />
                  <Select
                    value={stage.model}
                    onValueChange={(value) => onModelChange(stage.id, value as ModelType)}
                    disabled={isRunning}
                  >
                    <SelectTrigger 
                      className="h-7 text-xs bg-[var(--bg-void)] border-[var(--color-border)]"
                      style={{ color: getModelColor(stage.model) }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="codex">Codex</SelectItem>
                      <SelectItem value="claude">Claude</SelectItem>
                      <SelectItem value="gemini">Gemini</SelectItem>
                      <SelectItem value="manus">Manus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Duration */}
                {stage.duration && (
                  <div className="mt-2 text-[10px] text-[var(--text-muted)]">
                    Duration: {stage.duration}s
                  </div>
                )}
              </motion.div>

              {/* Arrow to next stage */}
              {index < stages.length - 1 && (
                <div className="absolute top-1/2 -translate-y-1/2 z-20" style={{ left: `${(index + 1) * 25 - 2}%` }}>
                  <ChevronRight 
                    className="w-6 h-6"
                    style={{ 
                      color: stages[index].status === "complete" 
                        ? "var(--status-success)" 
                        : "var(--text-muted)" 
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Output Preview */}
      {stages.some(s => s.output) && (
        <div className="cyber-glass p-4 rounded">
          <span className="text-xs font-cyber uppercase tracking-wider text-[var(--text-muted)] block mb-2">
            Latest Output
          </span>
          <div className="bg-[var(--bg-void)] p-3 rounded max-h-32 overflow-auto">
            <pre className="text-xs font-mono text-[var(--text-secondary)]">
              {stages.find(s => s.output)?.output}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export { defaultStages };
