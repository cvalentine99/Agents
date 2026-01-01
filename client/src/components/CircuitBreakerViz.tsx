import { motion } from "framer-motion";
import { 
  AlertTriangle, 
  RotateCcw, 
  TrendingDown,
  RefreshCw,
  XCircle,
  CheckCircle,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CircuitBreakerState } from "./FlightComputer";

interface StuckIndicator {
  type: "repeated_error" | "test_only_loop" | "file_churn" | "no_diff";
  count: number;
  description: string;
}

interface CircuitBreakerVizProps {
  state: CircuitBreakerState;
  noProgressCount: number;
  maxNoProgress: number;
  stuckIndicators: StuckIndicator[];
  lastStateChange: Date;
  onReset: () => void;
  onAskHuman: () => void;
}

export function CircuitBreakerViz({
  state,
  noProgressCount,
  maxNoProgress,
  stuckIndicators,
  lastStateChange,
  onReset,
  onAskHuman,
}: CircuitBreakerVizProps) {
  const getStateConfig = (s: CircuitBreakerState) => {
    switch (s) {
      case "CLOSED":
        return {
          color: "var(--breaker-closed)",
          glow: "oklch(0.75 0.22 145)",
          icon: <CheckCircle className="w-6 h-6" />,
          label: "Normal Operation",
          description: "All systems nominal. Loop is executing without issues.",
        };
      case "HALF_OPEN":
        return {
          color: "var(--breaker-half-open)",
          glow: "oklch(0.85 0.20 85)",
          icon: <Clock className="w-6 h-6" />,
          label: "Testing Recovery",
          description: "Attempting to recover. Next iteration will determine state.",
        };
      case "OPEN":
        return {
          color: "var(--breaker-open)",
          glow: "oklch(0.70 0.28 25)",
          icon: <XCircle className="w-6 h-6" />,
          label: "Circuit Tripped",
          description: "Loop halted due to lack of progress. Manual intervention required.",
        };
    }
  };

  const config = getStateConfig(state);
  const timeSinceChange = Math.floor((Date.now() - lastStateChange.getTime()) / 1000);

  return (
    <div className="cyber-card p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-cyber text-xl font-bold neon-text-purple">
          CIRCUIT BREAKER
        </h2>
        <span className="text-xs font-mono text-[var(--text-muted)]">
          Last change: {timeSinceChange}s ago
        </span>
      </div>

      {/* State Diagram */}
      <div className="flex items-center justify-center gap-4 py-4">
        {/* CLOSED State */}
        <StateNode
          label="CLOSED"
          isActive={state === "CLOSED"}
          color="var(--breaker-closed)"
        />
        
        {/* Arrow to OPEN */}
        <div className="flex flex-col items-center">
          <motion.div
            className="w-16 h-0.5"
            style={{ backgroundColor: state === "OPEN" ? "var(--breaker-open)" : "var(--bg-surface)" }}
            animate={{ opacity: state === "OPEN" ? 1 : 0.3 }}
          />
          <span className="text-[8px] text-[var(--text-muted)] mt-1">trip</span>
        </div>
        
        {/* OPEN State */}
        <StateNode
          label="OPEN"
          isActive={state === "OPEN"}
          color="var(--breaker-open)"
        />
        
        {/* Arrow to HALF_OPEN */}
        <div className="flex flex-col items-center">
          <motion.div
            className="w-16 h-0.5"
            style={{ backgroundColor: state === "HALF_OPEN" ? "var(--breaker-half-open)" : "var(--bg-surface)" }}
            animate={{ opacity: state === "HALF_OPEN" ? 1 : 0.3 }}
          />
          <span className="text-[8px] text-[var(--text-muted)] mt-1">test</span>
        </div>
        
        {/* HALF_OPEN State */}
        <StateNode
          label="HALF_OPEN"
          isActive={state === "HALF_OPEN"}
          color="var(--breaker-half-open)"
        />
        
        {/* Arrow back to CLOSED */}
        <div className="flex flex-col items-center">
          <motion.div
            className="w-16 h-0.5"
            style={{ backgroundColor: state === "CLOSED" ? "var(--breaker-closed)" : "var(--bg-surface)" }}
            animate={{ opacity: state === "CLOSED" ? 1 : 0.3 }}
          />
          <span className="text-[8px] text-[var(--text-muted)] mt-1">success</span>
        </div>
      </div>

      {/* Current State Info */}
      <div 
        className="cyber-glass p-4 rounded flex items-start gap-4"
        style={{ borderColor: config.color }}
      >
        <div 
          style={{ color: config.color }}
          className="mt-1"
        >
          {config.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span 
              className="font-cyber text-lg font-bold"
              style={{ 
                color: config.color,
                textShadow: `0 0 10px ${config.glow}`,
              }}
            >
              {state}
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              — {config.label}
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            {config.description}
          </p>
        </div>
      </div>

      {/* No Progress Counter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-cyber uppercase tracking-wider text-[var(--text-muted)]">
            No Progress Counter
          </span>
          <span className="font-mono text-sm">
            <span 
              style={{ 
                color: noProgressCount >= maxNoProgress - 1 
                  ? "var(--status-error)" 
                  : noProgressCount > 0 
                    ? "var(--status-warning)" 
                    : "var(--text-muted)" 
              }}
            >
              {noProgressCount}
            </span>
            <span className="text-[var(--text-muted)]"> / {maxNoProgress}</span>
          </span>
        </div>
        <div className="h-2 bg-[var(--bg-void)] rounded overflow-hidden">
          <motion.div
            className="h-full"
            style={{
              background: noProgressCount >= maxNoProgress - 1 
                ? "var(--status-error)"
                : noProgressCount > 0
                  ? "var(--status-warning)"
                  : "var(--status-success)",
            }}
            animate={{ width: `${(noProgressCount / maxNoProgress) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Stuck Detection Indicators */}
      {stuckIndicators.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-cyber uppercase tracking-wider text-[var(--status-warning)] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Stuck Detection
          </span>
          <div className="grid grid-cols-2 gap-2">
            {stuckIndicators.map((indicator, index) => (
              <StuckIndicatorCard key={index} indicator={indicator} />
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {state !== "CLOSED" && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            className="border-[var(--status-success)] text-[var(--status-success)] hover:bg-[var(--status-success)]/10"
            onClick={onReset}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset Breaker
          </Button>
          <Button
            variant="outline"
            className="border-[var(--cyber-cyan)] text-[var(--cyber-cyan)] hover:bg-[var(--cyber-cyan)]/10"
            onClick={onAskHuman}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Ask Human
          </Button>
        </div>
      )}
    </div>
  );
}

interface StateNodeProps {
  label: string;
  isActive: boolean;
  color: string;
}

function StateNode({ label, isActive, color }: StateNodeProps) {
  return (
    <motion.div
      className={`px-3 py-2 rounded text-center ${isActive ? "cyber-border" : "cyber-glass"}`}
      style={{
        borderColor: isActive ? color : undefined,
        boxShadow: isActive ? `0 0 20px ${color}` : undefined,
      }}
      animate={{
        scale: isActive ? 1.1 : 1,
      }}
    >
      <span 
        className="font-cyber text-xs font-bold"
        style={{ 
          color: isActive ? color : "var(--text-muted)",
          textShadow: isActive ? `0 0 10px ${color}` : undefined,
        }}
      >
        {label}
      </span>
    </motion.div>
  );
}

interface StuckIndicatorCardProps {
  indicator: StuckIndicator;
}

function StuckIndicatorCard({ indicator }: StuckIndicatorCardProps) {
  const getIcon = () => {
    switch (indicator.type) {
      case "repeated_error":
        return <XCircle className="w-4 h-4" />;
      case "test_only_loop":
        return <RefreshCw className="w-4 h-4" />;
      case "file_churn":
        return <TrendingDown className="w-4 h-4" />;
      case "no_diff":
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  return (
    <div className="cyber-glass p-2 rounded flex items-center gap-2">
      <div className="text-[var(--status-warning)]">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-mono text-[var(--text-primary)] truncate">
          {indicator.description}
        </div>
        <div className="text-[10px] text-[var(--text-muted)]">
          Count: {indicator.count}
        </div>
      </div>
    </div>
  );
}
