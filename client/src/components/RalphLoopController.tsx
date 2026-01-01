/**
 * RALPH Loop Controller - Connects to real RALPH WebSocket for actual execution
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Terminal,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Activity,
  Gauge,
  Clock,
  FileCode,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FullTerminal } from "@/components/FullTerminal";
import { DirectoryPicker } from "@/components/DirectoryPicker";
import { CompletionCriteriaEditor, CompletionCriterion } from "@/components/CompletionCriteriaEditor";
import { trpc } from "@/lib/trpc";
import { PromptMdEditor } from "@/components/PromptMdEditor";
import { AutoSignSuggestions } from "@/components/AutoSignSuggestions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Sparkles } from "lucide-react";

export type CircuitBreakerState = "CLOSED" | "HALF_OPEN" | "OPEN";
export type LoopStatus = "IDLE" | "RUNNING" | "PAUSED" | "COMPLETE" | "FAILED";

interface RalphState {
  status: LoopStatus;
  currentIteration: number;
  completionProgress: number;
  circuitBreaker: CircuitBreakerState;
  noProgressCount: number;
  filesModified: string[];
  testsPassed: number;
  testsFailed: number;
  errors: string[];
  lastOutput: string;
}

interface RalphLoopControllerProps {
  sessionId: string;
  userId: string;
  selectedModel: string;
  maxIterations: number;
  noProgressThreshold: number;
  prompt: {
    goal: string;
    context: string;
    doneWhen: string;
    doNot: string;
  };
  onStateChange?: (state: RalphState) => void;
}

export function RalphLoopController({
  sessionId,
  userId,
  selectedModel,
  maxIterations,
  noProgressThreshold,
  prompt,
  onStateChange,
}: RalphLoopControllerProps) {
  const [workingDirectory, setWorkingDirectory] = useState("/home/ubuntu");
  const [completionCriteria, setCompletionCriteria] = useState<CompletionCriterion[]>([
    { id: "1", text: "All tests pass", completed: false, createdAt: Date.now() },
    { id: "2", text: "Build succeeds", completed: false, createdAt: Date.now() },
    { id: "3", text: "No TypeScript errors", completed: false, createdAt: Date.now() },
  ]);
  
  const [state, setState] = useState<RalphState>({
    status: "IDLE",
    currentIteration: 0,
    completionProgress: 0,
    circuitBreaker: "CLOSED",
    noProgressCount: 0,
    filesModified: [],
    testsPassed: 0,
    testsFailed: 0,
    errors: [],
    lastOutput: "",
  });
  
  const [logs, setLogs] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Connect to RALPH WebSocket
  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/ws/ralph`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      addLog("🔌 Connected to RALPH Engine");
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case "ready":
            addLog("✅ RALPH Engine ready");
            break;
            
          case "log":
            addLog(message.data);
            break;
            
          case "output":
            addLog(`📤 ${message.data}`);
            break;
            
          case "state":
            const newState = message.data as RalphState;
            setState(newState);
            onStateChange?.(newState);
            break;
            
          case "iteration":
            addLog(`🔄 Iteration ${message.data.iteration} complete (${message.data.duration}ms)`);
            break;
            
          case "complete":
            addLog("🎉 RALPH Loop completed successfully!");
            setState(prev => ({ ...prev, status: "COMPLETE" }));
            break;
            
          case "error":
            addLog(`❌ Error: ${message.error}`);
            break;
        }
      } catch (e) {
        console.error("Failed to parse RALPH message:", e);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      addLog("🔌 Disconnected from RALPH Engine");
    };

    ws.onerror = (error) => {
      console.error("RALPH WebSocket error:", error);
      addLog("❌ WebSocket error occurred");
    };

    return ws;
  }, [onStateChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const startLoop = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      const ws = connect();
      ws.onopen = () => {
        setIsConnected(true);
        addLog("🔌 Connected to RALPH Engine");
        sendStartCommand(ws);
      };
    } else {
      sendStartCommand(wsRef.current);
    }
  };

  const sendStartCommand = (ws: WebSocket) => {
    const config = {
      sessionId,
      userId,
      workingDir: workingDirectory,
      model: selectedModel,
      maxIterations,
      noProgressThreshold,
      prompt,
      completionCriteria: completionCriteria.map(c => c.text),
    };

    ws.send(JSON.stringify({ type: "start", config }));
    setState(prev => ({ ...prev, status: "RUNNING" }));
    addLog(`🚀 Starting RALPH Loop in ${workingDirectory}`);
    addLog(`📋 Goal: ${prompt.goal}`);
    addLog(`🤖 Model: ${selectedModel}`);
  };

  const pauseLoop = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "pause" }));
      setState(prev => ({ ...prev, status: "PAUSED" }));
      addLog("⏸️ Pausing RALPH Loop...");
    }
  };

  const resumeLoop = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "resume" }));
      setState(prev => ({ ...prev, status: "RUNNING" }));
      addLog("▶️ Resuming RALPH Loop...");
    }
  };

  const stopLoop = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "stop" }));
      setState(prev => ({ ...prev, status: "IDLE" }));
      addLog("🛑 Stopping RALPH Loop...");
    }
  };

  const resetCircuitBreaker = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "resetCircuitBreaker" }));
      setState(prev => ({ ...prev, circuitBreaker: "CLOSED", noProgressCount: 0 }));
      addLog("🔄 Circuit breaker reset");
    }
  };

  const getBreakerColor = (breaker: CircuitBreakerState) => {
    switch (breaker) {
      case "CLOSED": return "text-green-400";
      case "HALF_OPEN": return "text-yellow-400";
      case "OPEN": return "text-red-400";
    }
  };

  const getStatusColor = (status: LoopStatus) => {
    switch (status) {
      case "IDLE": return "text-gray-400";
      case "RUNNING": return "text-cyan-400";
      case "PAUSED": return "text-yellow-400";
      case "COMPLETE": return "text-green-400";
      case "FAILED": return "text-red-400";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Status */}
      <div className="cyber-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-cyber text-xl font-bold neon-text-purple flex items-center gap-2">
            <Zap className="w-6 h-6" />
            RALPH LOOP+ ENGINE
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'} ${state.status === 'RUNNING' ? 'animate-pulse' : ''}`} />
              <span className={`font-mono text-sm font-bold ${getStatusColor(state.status)}`}>
                {state.status}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <StatCard
            icon={<Activity className="w-4 h-4" />}
            label="Iteration"
            value={`${state.currentIteration}/${maxIterations}`}
            color="text-purple-400"
          />
          <StatCard
            icon={<Gauge className="w-4 h-4" />}
            label="Progress"
            value={`${state.completionProgress}%`}
            color="text-cyan-400"
          />
          <StatCard
            icon={<CheckCircle2 className="w-4 h-4" />}
            label="Tests Passed"
            value={state.testsPassed}
            color="text-green-400"
          />
          <StatCard
            icon={<XCircle className="w-4 h-4" />}
            label="Tests Failed"
            value={state.testsFailed}
            color={state.testsFailed > 0 ? "text-red-400" : "text-gray-400"}
          />
          <StatCard
            icon={<FileCode className="w-4 h-4" />}
            label="Files Modified"
            value={state.filesModified.length}
            color="text-blue-400"
          />
          <StatCard
            icon={<AlertTriangle className="w-4 h-4" />}
            label="Errors"
            value={state.errors.length}
            color={state.errors.length > 0 ? "text-red-400" : "text-gray-400"}
          />
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Completion Progress</span>
            <span className="text-cyan-400 font-mono">{state.completionProgress}%</span>
          </div>
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-cyan-500"
              initial={{ width: 0 }}
              animate={{ width: `${state.completionProgress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Circuit Breaker */}
        <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg mb-6">
          <div className="flex items-center gap-3">
            <span className="text-gray-400">Circuit Breaker:</span>
            <span className={`font-mono font-bold ${getBreakerColor(state.circuitBreaker)}`}>
              {state.circuitBreaker}
            </span>
            {state.noProgressCount > 0 && (
              <span className="text-yellow-400 text-sm">
                (No progress: {state.noProgressCount}/{noProgressThreshold})
              </span>
            )}
          </div>
          {state.circuitBreaker !== "CLOSED" && (
            <Button variant="outline" size="sm" onClick={resetCircuitBreaker}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          )}
        </div>

        {/* Working Directory */}
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-2">Working Directory</label>
          <DirectoryPicker
            value={workingDirectory}
            onChange={setWorkingDirectory}
            disabled={state.status === "RUNNING"}
          />
        </div>

        {/* Completion Criteria */}
        <div className="mb-6">
          <CompletionCriteriaEditor
            criteria={completionCriteria}
            onChange={setCompletionCriteria}
            disabled={state.status === "RUNNING"}
            sessionId={sessionId}
          />
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-center gap-4">
          {state.status === "IDLE" && (
            <Button className="cyber-btn" onClick={startLoop}>
              <Play className="w-4 h-4 mr-2" />
              Start RALPH Loop
            </Button>
          )}
          {state.status === "RUNNING" && (
            <>
              <Button variant="outline" className="border-yellow-500 text-yellow-500" onClick={pauseLoop}>
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
              <Button variant="outline" className="border-red-500 text-red-500" onClick={stopLoop}>
                <Square className="w-4 h-4 mr-2" />
                Stop
              </Button>
            </>
          )}
          {state.status === "PAUSED" && (
            <>
              <Button className="cyber-btn" onClick={resumeLoop}>
                <Play className="w-4 h-4 mr-2" />
                Resume
              </Button>
              <Button variant="outline" className="border-red-500 text-red-500" onClick={stopLoop}>
                <Square className="w-4 h-4 mr-2" />
                Stop
              </Button>
            </>
          )}
          {(state.status === "COMPLETE" || state.status === "FAILED") && (
            <Button className="cyber-btn" onClick={() => setState(prev => ({ ...prev, status: "IDLE", currentIteration: 0 }))}>
              <RotateCcw className="w-4 h-4 mr-2" />
              New Session
            </Button>
          )}
        </div>
      </div>

      {/* RALPH Logs */}
      <div className="cyber-card p-6">
        <h3 className="font-cyber text-lg font-bold mb-4 flex items-center gap-2">
          <Terminal className="w-5 h-5" />
          RALPH Engine Logs
        </h3>
        <div className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm">
          {logs.length === 0 ? (
            <div className="text-gray-500">No logs yet. Start the RALPH Loop to see output.</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="text-gray-300 mb-1">
                {log}
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>

      {/* PROMPT.md & Terminal Tabs */}
      {/* Auto-Sign Suggestions */}
      {sessionId && parseInt(sessionId) > 0 && (
        <AutoSignSuggestions
          sessionId={parseInt(sessionId)}
          projectPath={workingDirectory}
          onSignAdded={() => {
            addLog("✨ New sign added to PROMPT.md");
          }}
        />
      )}

      {/* PROMPT.md & Terminal Tabs */}
      <div className="cyber-card p-6">
        <Tabs defaultValue="prompt" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="prompt" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              PROMPT.md
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI Signs
            </TabsTrigger>
            <TabsTrigger value="terminal" className="flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              Terminal
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="prompt">
            <PromptMdEditor
              projectPath={workingDirectory}
              lastError={state.errors.length > 0 ? state.errors[state.errors.length - 1] : undefined}
              onPromptChange={(content) => {
                addLog("📝 PROMPT.md updated");
              }}
            />
          </TabsContent>

          <TabsContent value="suggestions">
            <div className="space-y-4">
              <div className="text-sm text-slate-400 mb-4">
                <p className="mb-2">When the RALPH Loop encounters repeated failures, the AI will automatically suggest "signs" (guidance rules) to add to your PROMPT.md.</p>
                <p>Signs help tune the AI's behavior - like tuning a guitar. Each failure is an opportunity to add guidance that prevents the same mistake.</p>
              </div>
              {sessionId && parseInt(sessionId) > 0 ? (
                <AutoSignSuggestions
                  sessionId={parseInt(sessionId)}
                  projectPath={workingDirectory}
                  onSignAdded={() => {
                    addLog("✨ New sign added to PROMPT.md");
                  }}
                />
              ) : (
                <div className="text-center py-8 text-slate-500">
                  Start a session to see auto-sign suggestions
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="terminal">
            <div className="rounded-lg overflow-hidden" style={{ height: '400px' }}>
              <FullTerminal
                sessionId={`${sessionId}-terminal`}
                userId={userId}
                workingDirectory={workingDirectory}
                isExpanded={true}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
      <div className={`flex items-center justify-center mb-1 ${color}`}>
        {icon}
      </div>
      <div className={`font-mono text-lg font-bold ${color}`}>
        {value}
      </div>
      <div className="text-xs text-gray-500 uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}
