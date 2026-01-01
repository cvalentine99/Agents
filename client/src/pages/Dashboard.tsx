import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu, 
  X, 
  Home,
  Settings,
  Gauge,
  Wand2,
  Users,
  GitBranch,
  Shield,
  Activity,
  FileCode,
  Package,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  History,
  BarChart3,
  Layers,
  Save,
  Search,
  Brain
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";

// Import all components
import { ModelWheel, type ModelType } from "@/components/ModelWheel";
import { FlightComputer, type CircuitBreakerState, type LoopStatus } from "@/components/FlightComputer";
import { RalphLoopController } from "@/components/RalphLoopController";
import { PowerPromptor } from "@/components/PowerPromptor";
import { AgentProfiles, type AgentProfile } from "@/components/AgentProfiles";
import { CircuitBreakerViz } from "@/components/CircuitBreakerViz";
import { AssemblyLine, defaultStages } from "@/components/AssemblyLine";
import { DiffViewer, parseDiff } from "@/components/DiffViewer";
import { PromptPacks, type PromptPack } from "@/components/PromptPacks";
import { SessionManager, defaultSessionConfig, type SessionConfig, type CompletionCriterion } from "@/components/SessionManager";
import { LiveMonitor, type LoopMetric, type FileChange } from "@/components/LiveMonitor";
import { SaveAsTemplateModal } from "@/components/SaveAsTemplateModal";
import { TourTrigger } from "@/components/TourTrigger";
import { useOnboarding } from "@/contexts/OnboardingContext";

type NavSection = "wheel" | "flight" | "promptor" | "agents" | "breaker" | "assembly" | "diff" | "packs" | "session" | "monitor";

const navItems: { id: NavSection; label: string; icon: React.ReactNode }[] = [
  { id: "wheel", label: "Model Wheel", icon: <Gauge className="w-5 h-5" /> },
  { id: "flight", label: "Flight Computer", icon: <Activity className="w-5 h-5" /> },
  { id: "promptor", label: "Power Promptor", icon: <Wand2 className="w-5 h-5" /> },
  { id: "agents", label: "Agent Profiles", icon: <Users className="w-5 h-5" /> },
  { id: "session", label: "Session Manager", icon: <Settings className="w-5 h-5" /> },
  { id: "assembly", label: "Assembly Line", icon: <GitBranch className="w-5 h-5" /> },
  { id: "breaker", label: "Circuit Breaker", icon: <Shield className="w-5 h-5" /> },
  { id: "monitor", label: "Live Monitor", icon: <Activity className="w-5 h-5" /> },
  { id: "diff", label: "Diff Viewer", icon: <FileCode className="w-5 h-5" /> },
  { id: "packs", label: "Prompt Packs", icon: <Package className="w-5 h-5" /> },
];

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const { setOnSectionChange } = useOnboarding();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState<NavSection>("wheel");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);

  // Register section change callback for onboarding tour
  useEffect(() => {
    setOnSectionChange((section: NavSection) => {
      setActiveSection(section);
    });
    return () => setOnSectionChange(undefined);
  }, [setOnSectionChange]);

  // State for all components
  const [selectedModel, setSelectedModel] = useState<ModelType>("claude");
  const [selectedProfile, setSelectedProfile] = useState<AgentProfile>("patch_goblin");
  const [sessionConfig, setSessionConfig] = useState<SessionConfig>(defaultSessionConfig);
  const [completionCriteria, setCompletionCriteria] = useState<CompletionCriterion[]>([
    { id: "1", text: "All tests pass", checked: false },
    { id: "2", text: "Build succeeds", checked: false },
    { id: "3", text: "No TypeScript errors", checked: false },
  ]);
  const [isSessionRunning, setIsSessionRunning] = useState(false);
  const [loopStatus, setLoopStatus] = useState<LoopStatus>("IDLE");
  const [circuitBreakerState, setCircuitBreakerState] = useState<CircuitBreakerState>("CLOSED");
  const [currentIteration, setCurrentIteration] = useState(0);
  const [completionProgress, setCompletionProgress] = useState(0);
  const [noProgressCount, setNoProgressCount] = useState(0);
  const [stages, setStages] = useState(defaultStages);
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const [metrics, setMetrics] = useState<LoopMetric[]>([]);
  const [recentFiles, setRecentFiles] = useState<FileChange[]>([]);
  const [totalDuration, setTotalDuration] = useState(0);
  const [workingDirectory, setWorkingDirectory] = useState("");
  const [sessionId, setSessionId] = useState<string>(`session-${Date.now().toString(36)}`);

  // Sample diff for demo
  const [diffFiles, setDiffFiles] = useState(() => parseDiff(`diff --git a/src/App.tsx b/src/App.tsx
--- a/src/App.tsx
+++ b/src/App.tsx
@@ -1,5 +1,7 @@
 import React from 'react';
+import { useState } from 'react';
 
 function App() {
+  const [count, setCount] = useState(0);
   return (
-    <div>Hello World</div>
+    <div>Count: {count}</div>
   );
 }
`));

  // Calculate completion progress
  useEffect(() => {
    if (completionCriteria.length > 0) {
      const checked = completionCriteria.filter(c => c.checked).length;
      setCompletionProgress(Math.round((checked / completionCriteria.length) * 100));
    }
  }, [completionCriteria]);

  // Simulate loop running
  useEffect(() => {
    if (!isSessionRunning) return;

    const interval = setInterval(() => {
      setCurrentIteration(prev => {
        if (prev >= sessionConfig.maxIterations) {
          setIsSessionRunning(false);
          setLoopStatus("COMPLETE");
          return prev;
        }
        return prev + 1;
      });

      setTotalDuration(prev => prev + 1);

      // Add mock metrics
      setMetrics(prev => [
        ...prev,
        {
          iteration: prev.length + 1,
          timestamp: Date.now(),
          diffLines: Math.floor(Math.random() * 50) + 10,
          testsRun: Math.floor(Math.random() * 20) + 5,
          testsPassed: Math.floor(Math.random() * 20) + 5,
          errors: Math.floor(Math.random() * 3),
          duration: Math.floor(Math.random() * 10) + 5,
        },
      ]);

      // Add mock file changes
      if (Math.random() > 0.5) {
        setRecentFiles(prev => [
          {
            path: `src/components/Component${Math.floor(Math.random() * 10)}.tsx`,
            type: ["added", "modified", "deleted"][Math.floor(Math.random() * 3)] as "added" | "modified" | "deleted",
            lines: { added: Math.floor(Math.random() * 20), removed: Math.floor(Math.random() * 10) },
            timestamp: Date.now(),
          },
          ...prev.slice(0, 9),
        ]);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isSessionRunning, sessionConfig.maxIterations]);

  const handleStartSession = () => {
    // Now handled by RalphLoopController
    setIsSessionRunning(true);
    setLoopStatus("RUNNING");
  };

  const handlePauseSession = () => {
    setIsSessionRunning(false);
    setLoopStatus("PAUSED");
  };

  const handleResetSession = () => {
    setIsSessionRunning(false);
    setLoopStatus("IDLE");
    setCurrentIteration(0);
    setCompletionProgress(0);
    setNoProgressCount(0);
    setCircuitBreakerState("CLOSED");
    setMetrics([]);
    setRecentFiles([]);
    setTotalDuration(0);
    setCompletionCriteria(prev => prev.map(c => ({ ...c, checked: false })));
  };

  const handleModelChange = (stageId: string, model: ModelType) => {
    setStages(prev => prev.map(s => s.id === stageId ? { ...s, model } : s));
  };

  const handleRunPipeline = () => {
    setIsPipelineRunning(true);
    // Simulate pipeline running
    setTimeout(() => setIsPipelineRunning(false), 5000);
  };

  const handleApproveHunk = (fileIndex: number, hunkId: string) => {
    setDiffFiles(prev => prev.map((f, i) => 
      i === fileIndex 
        ? { ...f, hunks: f.hunks.map(h => h.id === hunkId ? { ...h, approved: true } : h) }
        : f
    ));
  };

  const handleDenyHunk = (fileIndex: number, hunkId: string) => {
    setDiffFiles(prev => prev.map((f, i) => 
      i === fileIndex 
        ? { ...f, hunks: f.hunks.map(h => h.id === hunkId ? { ...h, approved: false } : h) }
        : f
    ));
  };

  const handleToggleFile = (fileIndex: number) => {
    setDiffFiles(prev => prev.map((f, i) => 
      i === fileIndex ? { ...f, expanded: !f.expanded } : f
    ));
  };

  const handleSelectPack = (pack: PromptPack) => {
    // Add pack acceptance gates as completion criteria
    setCompletionCriteria(
      pack.acceptanceGates.map((gate, i) => ({
        id: `pack-${i}`,
        text: gate,
        checked: false,
      }))
    );
  };

  const renderContent = () => {
    switch (activeSection) {
      case "wheel":
        return (
          <div className="flex flex-col items-center justify-center min-h-[600px]" data-tour="model-wheel">
            <ModelWheel
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
              disabled={isSessionRunning}
            />
          </div>
        );
      
      case "flight":
        return (
          <RalphLoopController
            sessionId={sessionId}
            userId={user?.id?.toString() || "anonymous"}
            selectedModel={selectedModel}
            maxIterations={sessionConfig.maxIterations}
            noProgressThreshold={sessionConfig.noProgressThreshold}
            prompt={{
              goal: "Implement the requested changes",
              context: "Working on a TypeScript/React project",
              doneWhen: completionCriteria.map(c => c.text).join(", "),
              doNot: "Do not break existing functionality",
            }}
            onStateChange={(state) => {
              setLoopStatus(state.status);
              setCurrentIteration(state.currentIteration);
              setCompletionProgress(state.completionProgress);
              setCircuitBreakerState(state.circuitBreaker);
              setNoProgressCount(state.noProgressCount);
            }}
          />
        );
      
      case "promptor":
        return (
          <PowerPromptor
            selectedModel={selectedModel}
            onGeneratePrompt={(_prompt, _promise) => {
              // Prompt generated - handled by PowerPromptor component
            }}
          />
        );
      
      case "agents":
        return (
          <AgentProfiles
            selectedProfile={selectedProfile}
            onSelectProfile={setSelectedProfile}
            disabled={isSessionRunning}
          />
        );
      
      case "breaker":
        return (
          <CircuitBreakerViz
            state={circuitBreakerState}
            noProgressCount={noProgressCount}
            maxNoProgress={sessionConfig.noProgressThreshold}
            stuckIndicators={[]}
            lastStateChange={new Date()}
            onReset={() => setCircuitBreakerState("CLOSED")}
            onAskHuman={() => {
              // TODO: Implement human intervention request
            }}
          />
        );
      
      case "assembly":
        return (
          <AssemblyLine
            stages={stages}
            onModelChange={handleModelChange}
            onRunPipeline={handleRunPipeline}
            isRunning={isPipelineRunning}
          />
        );
      
      case "diff":
        return (
          <DiffViewer
            files={diffFiles}
            onApproveHunk={handleApproveHunk}
            onDenyHunk={handleDenyHunk}
            onApplyApproved={() => {
              // TODO: Implement applying approved hunks
            }}
            onRollback={() => {
              // TODO: Implement rollback functionality
            }}
            onToggleFile={handleToggleFile}
            hasCheckpoint={true}
          />
        );
      
      case "packs":
        return (
          <PromptPacks
            onSelectPack={handleSelectPack}
          />
        );
      
      case "session":
        return (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() => setShowSaveTemplateModal(true)}
                className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-orbitron"
              >
                <Save className="h-4 w-4 mr-2" />
                Save as Template
              </Button>
            </div>
            <SessionManager
              sessionId={`session-${Date.now().toString(36)}`}
              config={sessionConfig}
              criteria={completionCriteria}
              onConfigChange={setSessionConfig}
              onCriteriaChange={setCompletionCriteria}
              onStartSession={handleStartSession}
              onPauseSession={handlePauseSession}
              onResetSession={handleResetSession}
              isRunning={isSessionRunning}
            />
            <SaveAsTemplateModal
              open={showSaveTemplateModal}
              onOpenChange={setShowSaveTemplateModal}
              sessionConfig={{
                selectedModel,
                selectedProfile,
                ralphMode: sessionConfig.ralphMode,
                maxIterations: sessionConfig.maxIterations,
                noProgressThreshold: sessionConfig.noProgressThreshold,
                autoAskHuman: sessionConfig.autoAskHuman,
                safetyMode: sessionConfig.safetyMode,
                completionCriteria: completionCriteria.map(c => c.text),
              }}
            />
          </div>
        );
      
      case "monitor":
        return (
          <LiveMonitor
            metrics={metrics}
            recentFiles={recentFiles}
            currentIteration={currentIteration}
            totalDuration={totalDuration}
            isRunning={isSessionRunning}
          />
        );
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-void)] flex items-center justify-center">
        <div className="text-center">
          <motion.div
            className="w-16 h-16 border-4 border-[var(--cyber-purple)] border-t-transparent rounded-full mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="font-cyber text-[var(--text-muted)]">INITIALIZING...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-void)] flex">
      {/* Sidebar */}
      <motion.aside
        className={`fixed lg:relative z-40 h-screen bg-[var(--bg-deep)] border-r border-[var(--color-border)] flex flex-col ${
          sidebarOpen ? "w-64" : "w-16"
        }`}
        animate={{ width: sidebarOpen ? 256 : 64 }}
        transition={{ duration: 0.2 }}
      >
        {/* Logo */}
        <div className="p-4 border-b border-[var(--color-border)]">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--cyber-purple)] to-[var(--cyber-cyan)] flex items-center justify-center">
                <Gauge className="w-5 h-5 text-white" />
              </div>
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="font-cyber text-sm font-bold neon-text-purple"
                  >
                    AGENTS BY VALENTINE RF
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </Link>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto" data-tour="sidebar-nav">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive
                    ? "bg-[var(--cyber-purple)]/20 text-[var(--cyber-purple)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
                }`}
              >
                <div className={isActive ? "neon-text-purple" : ""}>
                  {item.icon}
                </div>
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="text-sm font-medium truncate"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </nav>

        {/* Quick Links */}
        <div className="px-2 py-3 border-t border-[var(--color-border)]">
          <Link href="/history">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--cyber-purple)]/10 hover:text-[var(--cyber-purple)] transition-colors">
              <History className="w-5 h-5" />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="text-sm"
                  >
                    Session History
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </Link>
          <Link href="/analytics">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--cyber-purple)]/10 hover:text-[var(--cyber-purple)] transition-colors">
              <BarChart3 className="w-5 h-5" />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="text-sm"
                  >
                    Analytics
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </Link>
          <Link href="/templates">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--cyber-purple)]/10 hover:text-[var(--cyber-purple)] transition-colors">
              <Package className="w-5 h-5" />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="text-sm"
                  >
                    Templates
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </Link>
          <Link href="/multi">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--cyber-purple)]/10 hover:text-[var(--cyber-purple)] transition-colors">
              <Layers className="w-5 h-5" />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="text-sm"
                  >
                    Multi-Session
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </Link>
          <Link href="/session-templates">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--cyber-purple)]/10 hover:text-[var(--cyber-purple)] transition-colors">
              <Save className="w-5 h-5" />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="text-sm"
                  >
                    Session Templates
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </Link>
          <Link href="/research">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--cyber-purple)]/10 hover:text-[var(--cyber-purple)] transition-colors">
              <Search className="w-5 h-5" />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="text-sm"
                  >
                    Deep Research
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </Link>
          <Link href="/knowledge">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--cyber-cyan)]/10 hover:text-[var(--cyber-cyan)] transition-colors">
              <Brain className="w-5 h-5" />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="text-sm"
                  >
                    Knowledge Base
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </Link>
          <Link href="/settings">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--cyber-purple)]/10 hover:text-[var(--cyber-purple)] transition-colors">
              <Settings className="w-5 h-5" />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="text-sm"
                  >
                    Settings
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </Link>
        </div>

        {/* User Section */}
        <div className="p-4 border-t border-[var(--color-border)]">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--cyber-purple)]/20 flex items-center justify-center">
                <User className="w-4 h-4 text-[var(--cyber-purple)]" />
              </div>
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex-1 min-w-0"
                  >
                    <p className="text-sm font-medium truncate">{user.name || "User"}</p>
                    <button
                      onClick={() => logout()}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--status-error)] flex items-center gap-1"
                    >
                      <LogOut className="w-3 h-3" />
                      Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <a
              href={getLoginUrl()}
              className="flex items-center gap-3 text-[var(--text-muted)] hover:text-[var(--cyber-purple)]"
            >
              <User className="w-5 h-5" />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="text-sm"
                  >
                    Sign In
                  </motion.span>
                )}
              </AnimatePresence>
            </a>
          )}
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[var(--bg-surface)] border border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--cyber-purple)]/20 transition-colors"
        >
          {sidebarOpen ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 min-h-screen overflow-auto">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-[var(--bg-void)]/80 backdrop-blur-md border-b border-[var(--color-border)] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Mobile menu button */}
              <button
                className="lg:hidden p-2 hover:bg-[var(--bg-surface)] rounded"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              
              <h1 className="font-cyber text-xl font-bold">
                {navItems.find(n => n.id === activeSection)?.label}
              </h1>
            </div>

            {/* Status Indicators */}
            <div className="flex items-center gap-4">
              {/* Loop Status */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-surface)]">
                <motion.div
                  className={`w-2 h-2 rounded-full ${
                    loopStatus === "RUNNING" ? "bg-[var(--status-success)]" :
                    loopStatus === "PAUSED" ? "bg-[var(--cyber-yellow)]" :
                    loopStatus === "COMPLETE" ? "bg-[var(--cyber-cyan)]" :
                    loopStatus === "FAILED" ? "bg-[var(--status-error)]" :
                    "bg-[var(--text-muted)]"
                  }`}
                  animate={{
                    scale: loopStatus === "RUNNING" ? [1, 1.2, 1] : 1,
                  }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span className="text-xs font-mono">{loopStatus}</span>
              </div>

              {/* Model Badge */}
              <div className="px-3 py-1.5 rounded-full bg-[var(--bg-surface)] text-xs font-mono">
                Model: <span className="text-[var(--cyber-purple)]">{selectedModel}</span>
              </div>

              {/* Iteration Counter */}
              <div className="px-3 py-1.5 rounded-full bg-[var(--bg-surface)] text-xs font-mono">
                Iter: <span className="text-[var(--cyber-cyan)]">{currentIteration}</span>/{sessionConfig.maxIterations}
              </div>

              {/* Tour Trigger */}
              <TourTrigger variant="icon" />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 lg:hidden"
          >
            <div 
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              className="absolute left-0 top-0 h-full w-64 bg-[var(--bg-deep)] border-r border-[var(--color-border)]"
            >
              {/* Mobile nav content */}
              <div className="p-4 border-b border-[var(--color-border)]">
                <span className="font-cyber text-sm font-bold neon-text-purple">
                  AGENTS BY VALENTINE RF
                </span>
              </div>
              <nav className="p-2 space-y-1">
                {navItems.map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveSection(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                        isActive
                          ? "bg-[var(--cyber-purple)]/20 text-[var(--cyber-purple)]"
                          : "text-[var(--text-muted)] hover:bg-[var(--bg-surface)]"
                      }`}
                    >
                      {item.icon}
                      <span className="text-sm">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
