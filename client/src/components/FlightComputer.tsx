import { motion } from "framer-motion";
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Gauge, 
  RotateCcw,
  Play,
  Pause,
  Square
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FullTerminal } from "@/components/FullTerminal";
import { DirectoryPicker } from "@/components/DirectoryPicker";
import { CompletionCriteriaEditor, CompletionCriterion } from "@/components/CompletionCriteriaEditor";

export type CircuitBreakerState = "CLOSED" | "HALF_OPEN" | "OPEN";
export type LoopStatus = "IDLE" | "RUNNING" | "PAUSED" | "COMPLETE" | "FAILED";

interface TelemetryData {
  filesModified: number;
  testsRun: number;
  testsPassed: number;
  errorsDetected: number;
  diffLines: number;
  loopDuration: number;
}

interface FlightComputerProps {
  completionProgress: number;
  circuitBreakerState: CircuitBreakerState;
  currentIteration: number;
  maxIterations: number;
  loopStatus: LoopStatus;
  noProgressCount: number;
  telemetry: TelemetryData;
  sessionId?: string;
  workingDirectory?: string;
  completionCriteria?: CompletionCriterion[];
  onWorkingDirectoryChange?: (path: string) => void;
  onCompletionCriteriaChange?: (criteria: CompletionCriterion[]) => void;
  onStart?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onResetBreaker?: () => void;
}

export function FlightComputer({
  completionProgress,
  circuitBreakerState,
  currentIteration,
  maxIterations,
  loopStatus,
  noProgressCount,
  telemetry,
  sessionId,
  workingDirectory = "",
  completionCriteria = [],
  onWorkingDirectoryChange,
  onCompletionCriteriaChange,
  onStart,
  onPause,
  onStop,
  onResetBreaker,
}: FlightComputerProps) {
  const _getBreakerColor = (state: CircuitBreakerState) => {
    switch (state) {
      case "CLOSED": return "var(--breaker-closed)";
      case "HALF_OPEN": return "var(--breaker-half-open)";
      case "OPEN": return "var(--breaker-open)";
    }
  };

  const getBreakerClass = (state: CircuitBreakerState) => {
    switch (state) {
      case "CLOSED": return "breaker-closed";
      case "HALF_OPEN": return "breaker-half-open";
      case "OPEN": return "breaker-open";
    }
  };

  const getStatusColor = (status: LoopStatus) => {
    switch (status) {
      case "IDLE": return "var(--text-muted)";
      case "RUNNING": return "var(--cyber-cyan)";
      case "PAUSED": return "var(--cyber-yellow)";
      case "COMPLETE": return "var(--status-success)";
      case "FAILED": return "var(--status-error)";
    }
  };

  return (
    <div className="cyber-card p-6 space-y-6" data-tour="flight-computer">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-cyber text-xl font-bold neon-text-purple">
          RALPH LOOP+ FLIGHT COMPUTER
        </h2>
        <div className="flex items-center gap-2">
          <motion.div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: getStatusColor(loopStatus) }}
            animate={{ 
              opacity: loopStatus === "RUNNING" ? [1, 0.5, 1] : 1,
              scale: loopStatus === "RUNNING" ? [1, 1.2, 1] : 1,
            }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span 
            className="font-mono text-sm font-bold"
            style={{ color: getStatusColor(loopStatus) }}
          >
            {loopStatus}
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Completion Promise Meter */}
        <div className="col-span-2 cyber-glass p-4 rounded" data-tour="completion-meter">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-cyber uppercase tracking-wider text-[var(--text-muted)]">
              Completion Promise
            </span>
            <span className="font-mono text-lg font-bold neon-text-cyan">
              {completionProgress}%
            </span>
          </div>
          <div className="relative h-4 bg-[var(--bg-void)] rounded overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 rounded"
              style={{
                background: `linear-gradient(90deg, var(--cyber-purple) 0%, var(--cyber-cyan) 100%)`,
                boxShadow: "0 0 20px var(--neon-cyan)",
              }}
              initial={{ width: 0 }}
              animate={{ width: `${completionProgress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
            {/* Scanline effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
          </div>
          <div className="flex justify-between mt-2 text-xs text-[var(--text-muted)]">
            <span>0%</span>
            <span>Promise Gate</span>
            <span>100%</span>
          </div>
        </div>

        {/* Circuit Breaker Status */}
        <div className="cyber-glass p-4 rounded" data-tour="circuit-breaker">
          <span className="text-xs font-cyber uppercase tracking-wider text-[var(--text-muted)] block mb-2">
            Circuit Breaker
          </span>
          <div className="flex items-center gap-3">
            <motion.div
              className={`text-2xl font-cyber font-bold ${getBreakerClass(circuitBreakerState)}`}
              animate={{ 
                opacity: circuitBreakerState === "OPEN" ? [1, 0.5, 1] : 1 
              }}
              transition={{ duration: 0.5, repeat: circuitBreakerState === "OPEN" ? Infinity : 0 }}
            >
              {circuitBreakerState}
            </motion.div>
          </div>
          {circuitBreakerState !== "CLOSED" && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-xs"
              onClick={onResetBreaker}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset
            </Button>
          )}
        </div>

        {/* Iteration Counter */}
        <div className="cyber-glass p-4 rounded">
          <span className="text-xs font-cyber uppercase tracking-wider text-[var(--text-muted)] block mb-2">
            Iteration
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-mono font-bold neon-text-purple">
              {currentIteration}
            </span>
            <span className="text-lg text-[var(--text-muted)]">
              / {maxIterations}
            </span>
          </div>
          <div className="mt-2 h-1 bg-[var(--bg-void)] rounded overflow-hidden">
            <div 
              className="h-full bg-[var(--cyber-purple)]"
              style={{ width: `${(currentIteration / maxIterations) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Telemetry Grid */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        <TelemetryCard
          icon={<Activity className="w-4 h-4" />}
          label="Files Modified"
          value={telemetry.filesModified}
          color="var(--cyber-cyan)"
        />
        <TelemetryCard
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="Tests Passed"
          value={`${telemetry.testsPassed}/${telemetry.testsRun}`}
          color="var(--status-success)"
        />
        <TelemetryCard
          icon={<XCircle className="w-4 h-4" />}
          label="Errors"
          value={telemetry.errorsDetected}
          color={telemetry.errorsDetected > 0 ? "var(--status-error)" : "var(--text-muted)"}
        />
        <TelemetryCard
          icon={<Gauge className="w-4 h-4" />}
          label="Diff Lines"
          value={telemetry.diffLines}
          color="var(--cyber-magenta)"
        />
        <TelemetryCard
          icon={<AlertTriangle className="w-4 h-4" />}
          label="No Progress"
          value={noProgressCount}
          color={noProgressCount > 2 ? "var(--status-warning)" : "var(--text-muted)"}
        />
        <TelemetryCard
          icon={<Activity className="w-4 h-4" />}
          label="Duration"
          value={`${telemetry.loopDuration}s`}
          color="var(--cyber-purple)"
        />
      </div>

      {/* Completion Criteria Editor */}
      <CompletionCriteriaEditor
        criteria={completionCriteria}
        onChange={onCompletionCriteriaChange || (() => {})}
        disabled={loopStatus === "RUNNING"}
        sessionId={sessionId}
      />

      {/* Working Directory */}
      <div className="cyber-glass p-4 rounded">
        <span className="text-xs font-cyber uppercase tracking-wider text-[var(--text-muted)] block mb-3">
          Working Directory
        </span>
        <DirectoryPicker
          value={workingDirectory}
          onChange={onWorkingDirectoryChange || (() => {})}
          disabled={loopStatus === "RUNNING"}
        />
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-center gap-4" data-tour="start-loop">
        {loopStatus === "IDLE" || loopStatus === "PAUSED" ? (
          <Button
            className="cyber-btn"
            onClick={onStart}
          >
            <Play className="w-4 h-4 mr-2" />
            {loopStatus === "PAUSED" ? "Resume" : "Start Loop"}
          </Button>
        ) : loopStatus === "RUNNING" ? (
          <>
            <Button
              variant="outline"
              className="border-[var(--cyber-yellow)] text-[var(--cyber-yellow)] hover:bg-[var(--cyber-yellow)]/10"
              onClick={onPause}
            >
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </Button>
            <Button
              variant="outline"
              className="border-[var(--status-error)] text-[var(--status-error)] hover:bg-[var(--status-error)]/10"
              onClick={onStop}
            >
              <Square className="w-4 h-4 mr-2" />
              Stop
            </Button>
          </>
        ) : null}
      </div>

      {/* Real Terminal with PTY */}
      <div className="cyber-glass rounded overflow-hidden" style={{ minHeight: '400px' }}>
        <FullTerminal
          sessionId={sessionId || `session-${Date.now()}`}
          userId="user"
          workingDirectory={workingDirectory || '/home/ubuntu'}
          isExpanded={true}
        />
      </div>
    </div>
  );
}

interface TelemetryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}

function TelemetryCard({ icon, label, value, color }: TelemetryCardProps) {
  return (
    <div className="cyber-glass p-3 rounded text-center">
      <div className="flex items-center justify-center mb-1" style={{ color }}>
        {icon}
      </div>
      <div className="font-mono text-lg font-bold" style={{ color }}>
        {value}
      </div>
      <div className="text-[10px] font-cyber uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </div>
    </div>
  );
}
