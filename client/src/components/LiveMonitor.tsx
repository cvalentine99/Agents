import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Activity, 
  FileCode, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  Cpu,
  HardDrive
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

interface LoopMetric {
  iteration: number;
  timestamp: number;
  diffLines: number;
  testsRun: number;
  testsPassed: number;
  errors: number;
  duration: number;
}

interface FileChange {
  path: string;
  type: "added" | "modified" | "deleted";
  lines: { added: number; removed: number };
  timestamp: number;
}

interface LiveMonitorProps {
  metrics: LoopMetric[];
  recentFiles: FileChange[];
  currentIteration: number;
  totalDuration: number;
  isRunning: boolean;
}

export function LiveMonitor({
  metrics,
  recentFiles,
  currentIteration,
  totalDuration,
  isRunning,
}: LiveMonitorProps) {
  const [activeTab, setActiveTab] = useState<"errors" | "tests" | "diffs">("diffs");

  // Calculate trends
  const lastMetric = metrics[metrics.length - 1];
  const prevMetric = metrics[metrics.length - 2];
  
  const errorTrend = lastMetric && prevMetric 
    ? lastMetric.errors - prevMetric.errors 
    : 0;
  const testTrend = lastMetric && prevMetric 
    ? lastMetric.testsPassed - prevMetric.testsPassed 
    : 0;

  // Aggregate stats
  const totalDiffLines = metrics.reduce((acc, m) => acc + m.diffLines, 0);
  const totalTests = metrics.reduce((acc, m) => acc + m.testsRun, 0);
  const totalErrors = metrics.reduce((acc, m) => acc + m.errors, 0);
  const avgDuration = metrics.length > 0 
    ? Math.round(metrics.reduce((acc, m) => acc + m.duration, 0) / metrics.length)
    : 0;

  return (
    <div className="cyber-card p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-cyber text-xl font-bold neon-text-purple">
          LIVE MONITOR
        </h2>
        <div className="flex items-center gap-2">
          <motion.div
            className={`w-2 h-2 rounded-full ${isRunning ? "bg-[var(--status-success)]" : "bg-[var(--text-muted)]"}`}
            animate={{ 
              opacity: isRunning ? [1, 0.5, 1] : 1,
              scale: isRunning ? [1, 1.2, 1] : 1,
            }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="text-xs font-mono text-[var(--text-muted)]">
            {isRunning ? "LIVE" : "IDLE"}
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="Iterations"
          value={currentIteration}
          color="var(--cyber-purple)"
        />
        <StatCard
          icon={<FileCode className="w-5 h-5" />}
          label="Diff Lines"
          value={totalDiffLines}
          color="var(--cyber-cyan)"
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Tests Run"
          value={totalTests}
          trend={testTrend}
          color="var(--status-success)"
        />
        <StatCard
          icon={<XCircle className="w-5 h-5" />}
          label="Errors"
          value={totalErrors}
          trend={errorTrend}
          invertTrend
          color="var(--status-error)"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Diff Lines Over Time */}
        <div className="cyber-glass p-4 rounded">
          <h3 className="text-xs font-cyber uppercase tracking-wider text-[var(--text-muted)] mb-4">
            Diff Lines per Iteration
          </h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics}>
                <defs>
                  <linearGradient id="diffGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--cyber-cyan)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--cyber-cyan)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="iteration" 
                  stroke="var(--text-muted)"
                  fontSize={10}
                  tickLine={false}
                />
                <YAxis 
                  stroke="var(--text-muted)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "4px",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="diffLines"
                  stroke="var(--cyber-cyan)"
                  fill="url(#diffGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Error Trend */}
        <div className="cyber-glass p-4 rounded">
          <h3 className="text-xs font-cyber uppercase tracking-wider text-[var(--text-muted)] mb-4">
            Error Trend
          </h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics}>
                <XAxis 
                  dataKey="iteration" 
                  stroke="var(--text-muted)"
                  fontSize={10}
                  tickLine={false}
                />
                <YAxis 
                  stroke="var(--text-muted)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "4px",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="errors"
                  stroke="var(--status-error)"
                  strokeWidth={2}
                  dot={{ fill: "var(--status-error)", strokeWidth: 0, r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="testsPassed"
                  stroke="var(--status-success)"
                  strokeWidth={2}
                  dot={{ fill: "var(--status-success)", strokeWidth: 0, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Files */}
      <div className="cyber-glass p-4 rounded">
        <h3 className="text-xs font-cyber uppercase tracking-wider text-[var(--text-muted)] mb-4">
          Recent File Changes
        </h3>
        <div className="space-y-2 max-h-40 overflow-auto">
          {recentFiles.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] text-center py-4">
              No file changes yet
            </p>
          ) : (
            recentFiles.map((file, index) => (
              <motion.div
                key={`${file.path}-${file.timestamp}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 text-xs"
              >
                <FileChangeIcon type={file.type} />
                <span className="font-mono text-[var(--text-primary)] flex-1 truncate">
                  {file.path}
                </span>
                <span className="text-[var(--status-success)]">+{file.lines.added}</span>
                <span className="text-[var(--status-error)]">-{file.lines.removed}</span>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Loop Health */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <HealthIndicator
          label="Avg Duration"
          value={`${avgDuration}s`}
          icon={<Clock className="w-4 h-4" />}
          status={avgDuration < 30 ? "good" : avgDuration < 60 ? "warning" : "bad"}
        />
        <HealthIndicator
          label="Total Time"
          value={formatDuration(totalDuration)}
          icon={<Clock className="w-4 h-4" />}
          status="neutral"
        />
        <HealthIndicator
          label="Error Rate"
          value={totalTests > 0 ? `${Math.round((totalErrors / totalTests) * 100)}%` : "0%"}
          icon={<XCircle className="w-4 h-4" />}
          status={totalErrors === 0 ? "good" : totalErrors < 5 ? "warning" : "bad"}
        />
        <HealthIndicator
          label="Progress Rate"
          value={metrics.length > 0 ? `${Math.round(totalDiffLines / metrics.length)} lines/iter` : "0"}
          icon={<TrendingUp className="w-4 h-4" />}
          status={totalDiffLines > 0 ? "good" : "warning"}
        />
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  trend?: number;
  invertTrend?: boolean;
  color: string;
}

function StatCard({ icon, label, value, trend, invertTrend, color }: StatCardProps) {
  const showTrend = trend !== undefined && trend !== 0;
  const isPositive = invertTrend ? (trend ?? 0) < 0 : (trend ?? 0) > 0;

  return (
    <div className="cyber-glass p-4 rounded">
      <div className="flex items-center gap-2 mb-2" style={{ color }}>
        {icon}
        <span className="text-xs font-cyber uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-mono font-bold" style={{ color }}>
          {value}
        </span>
        {showTrend && (
          <span className={`text-xs flex items-center ${isPositive ? "text-[var(--status-success)]" : "text-[var(--status-error)]"}`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}
          </span>
        )}
      </div>
    </div>
  );
}

interface FileChangeIconProps {
  type: "added" | "modified" | "deleted";
}

function FileChangeIcon({ type }: FileChangeIconProps) {
  const config = {
    added: { color: "var(--status-success)", label: "A" },
    modified: { color: "var(--cyber-yellow)", label: "M" },
    deleted: { color: "var(--status-error)", label: "D" },
  };

  return (
    <span 
      className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center"
      style={{ 
        backgroundColor: `${config[type].color}20`,
        color: config[type].color,
      }}
    >
      {config[type].label}
    </span>
  );
}

interface HealthIndicatorProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  status: "good" | "warning" | "bad" | "neutral";
}

function HealthIndicator({ label, value, icon, status }: HealthIndicatorProps) {
  const statusColors = {
    good: "var(--status-success)",
    warning: "var(--status-warning)",
    bad: "var(--status-error)",
    neutral: "var(--text-muted)",
  };

  return (
    <div className="flex items-center gap-3 cyber-glass p-3 rounded">
      <div style={{ color: statusColors[status] }}>{icon}</div>
      <div>
        <div className="text-xs text-[var(--text-muted)]">{label}</div>
        <div className="font-mono text-sm" style={{ color: statusColors[status] }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export type { LoopMetric, FileChange };
