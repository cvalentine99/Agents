import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Terminal, 
  ChevronUp, 
  Maximize2, 
  Minimize2,
  X,
  Download,
  Trash2,
  Play,
  Square,
  Wifi,
  WifiOff
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TerminalLine {
  id: string;
  type: "stdout" | "stderr" | "system" | "input" | "status" | "error";
  content: string;
  timestamp: number;
}

interface IntegratedTerminalProps {
  sessionId?: number;
  sessionStringId?: string;
  userId?: number;
  isRunning: boolean;
  workingDirectory?: string;
  model?: "codex" | "claude" | "gemini" | "manus";
  prompt?: string;
  maxIterations?: number;
  onStart?: () => void;
  onStop?: () => void;
  onStatusChange?: (status: "connected" | "disconnected" | "running" | "stopped") => void;
}

export function IntegratedTerminal({ 
  sessionId, 
  sessionStringId,
  userId,
  isRunning,
  workingDirectory,
  model = "claude",
  prompt,
  maxIterations = 50,
  onStart,
  onStop,
  onStatusChange
}: IntegratedTerminalProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessRunning, setIsProcessRunning] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const addLine = useCallback((type: TerminalLine["type"], content: string) => {
    setLines(prev => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type,
        content,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/ws/cli`;
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        addLine("system", "🔌 Connected to CLI stream server");
        onStatusChange?.("connected");
        
        // Start ping interval for keep-alive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case "connected":
              addLine("system", `✅ ${data.data}`);
              break;
            case "stdout":
              addLine("stdout", data.data);
              break;
            case "stderr":
              addLine("stderr", data.data);
              break;
            case "status":
              addLine("status", `📋 ${data.data}`);
              if (data.data.includes("Starting")) {
                setIsProcessRunning(true);
                onStatusChange?.("running");
              }
              break;
            case "error":
              addLine("error", `❌ ${data.data}`);
              break;
            case "complete":
              addLine("system", `✅ ${data.data}`);
              setIsProcessRunning(false);
              onStatusChange?.("stopped");
              break;
            case "pong":
              // Keep-alive response, no action needed
              break;
          }
        } catch {
          addLine("stdout", event.data);
        }
      };

      ws.onerror = () => {
        addLine("error", "⚠️ WebSocket connection error");
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsProcessRunning(false);
        addLine("system", "🔌 Disconnected from CLI stream server");
        onStatusChange?.("disconnected");
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
        
        // Attempt reconnection after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isRunning) {
            addLine("system", "🔄 Attempting to reconnect...");
            connectWebSocket();
          }
        }, 3000);
      };

    } catch (e) {
      addLine("error", `Failed to connect: ${e}`);
    }
  }, [addLine, isRunning, onStatusChange]);

  // Start CLI process
  const startProcess = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      addLine("error", "Not connected to server. Connecting...");
      connectWebSocket();
      return;
    }

    if (!sessionId || !userId) {
      addLine("error", "Session ID and User ID are required to start a process");
      return;
    }

    if (!prompt) {
      addLine("error", "No prompt provided. Please enter a prompt first.");
      return;
    }

    wsRef.current.send(JSON.stringify({
      type: "start",
      sessionId,
      userId,
      prompt,
      workingDirectory: workingDirectory || "/home/ubuntu",
      model,
      maxIterations,
      dangerouslySkipPermissions: true,
    }));

    addLine("system", `🚀 Starting ${model} CLI with prompt: "${prompt.slice(0, 50)}${prompt.length > 50 ? "..." : ""}"`);
    onStart?.();
  }, [sessionId, userId, prompt, workingDirectory, model, maxIterations, addLine, connectWebSocket, onStart]);

  // Stop CLI process
  const stopProcess = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      addLine("error", "Not connected to server");
      return;
    }

    wsRef.current.send(JSON.stringify({
      type: "stop",
      sessionId,
    }));

    addLine("system", "🛑 Stopping process...");
    onStop?.();
  }, [sessionId, addLine, onStop]);

  // Connect when component mounts or when running state changes
  useEffect(() => {
    if (isRunning && !wsRef.current) {
      connectWebSocket();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isRunning, connectWebSocket]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines, autoScroll]);

  // Handle keyboard shortcut (Ctrl+`)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "`") {
        e.preventDefault();
        setIsExpanded(prev => !prev);
      }
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  const clearTerminal = () => {
    setLines([]);
    addLine("system", "Terminal cleared");
  };

  const downloadLogs = () => {
    const content = lines
      .map(l => `[${new Date(l.timestamp).toISOString()}] [${l.type}] ${l.content}`)
      .join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `session-${sessionStringId || sessionId || "unknown"}-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleScroll = () => {
    if (terminalRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setAutoScroll(isAtBottom);
    }
  };

  const getLineColor = (type: TerminalLine["type"]) => {
    switch (type) {
      case "stdout": return "text-green-400";
      case "stderr": return "text-red-400";
      case "system": return "text-cyan-400";
      case "status": return "text-purple-400";
      case "error": return "text-red-500";
      case "input": return "text-yellow-400";
      default: return "text-purple-200";
    }
  };

  const terminalContent = (
    <div className="flex flex-col h-full">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-black/40 border-b border-purple-500/20">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-purple-400" />
          <span className="font-mono text-sm text-purple-200">CLI Output</span>
          {isConnected ? (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <Wifi className="w-3 h-3" />
              Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-red-400">
              <WifiOff className="w-3 h-3" />
              Disconnected
            </span>
          )}
          {isProcessRunning && (
            <span className="flex items-center gap-1 text-xs text-green-400 ml-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              RUNNING
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Control buttons */}
          {!isProcessRunning && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (!isConnected) {
                  connectWebSocket();
                } else {
                  startProcess();
                }
              }}
              className="h-7 px-2 text-green-400 hover:bg-green-500/20"
              title={isConnected ? "Start Process" : "Connect"}
            >
              <Play className="w-3 h-3" />
            </Button>
          )}
          {isProcessRunning && (
            <Button
              size="sm"
              variant="ghost"
              onClick={stopProcess}
              className="h-7 px-2 text-red-400 hover:bg-red-500/20"
              title="Stop Process"
            >
              <Square className="w-3 h-3" />
            </Button>
          )}
          <div className="w-px h-4 bg-purple-500/30 mx-1" />
          <Button
            size="sm"
            variant="ghost"
            onClick={clearTerminal}
            className="h-7 px-2 text-purple-400 hover:bg-purple-500/20"
            title="Clear Terminal"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={downloadLogs}
            className="h-7 px-2 text-purple-400 hover:bg-purple-500/20"
            title="Download Logs"
          >
            <Download className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-7 px-2 text-purple-400 hover:bg-purple-500/20"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3 h-3" />
            ) : (
              <Maximize2 className="w-3 h-3" />
            )}
          </Button>
          {!isFullscreen && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(false)}
              className="h-7 px-2 text-purple-400 hover:bg-purple-500/20"
              title="Close Terminal"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Terminal Content */}
      <div
        ref={terminalRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 font-mono text-sm bg-black/60"
        style={{ minHeight: isFullscreen ? "calc(100vh - 48px)" : "200px" }}
      >
        {lines.length === 0 ? (
          <div className="text-purple-400/50 text-center py-8">
            <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No output yet</p>
            <p className="text-xs mt-1">
              {isConnected 
                ? "Click the play button to start a CLI process" 
                : "Click the play button to connect and start"}
            </p>
          </div>
        ) : (
          lines.map((line) => (
            <div key={line.id} className="flex gap-2 hover:bg-purple-500/5 py-0.5">
              <span className="text-purple-500/40 text-xs w-20 flex-shrink-0">
                {new Date(line.timestamp).toLocaleTimeString()}
              </span>
              <span className={`${getLineColor(line.type)} whitespace-pre-wrap break-all`}>
                {line.content}
              </span>
            </div>
          ))
        )}
        {!autoScroll && (
          <button
            onClick={() => {
              setAutoScroll(true);
              if (terminalRef.current) {
                terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
              }
            }}
            className="sticky bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-purple-600 text-white text-xs rounded-full shadow-lg"
          >
            ↓ Scroll to bottom
          </button>
        )}
      </div>
    </div>
  );

  // Fullscreen mode
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0a0a0f]">
        {terminalContent}
      </div>
    );
  }

  return (
    <div className="mt-4">
      {/* Collapsed Toggle */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full flex items-center justify-center gap-2 py-2 bg-black/40 border border-purple-500/30 rounded-lg hover:border-purple-500/50 transition-colors"
        >
          <Terminal className="w-4 h-4 text-purple-400" />
          <span className="text-sm text-purple-300">Show Terminal</span>
          <ChevronUp className="w-4 h-4 text-purple-400" />
          <span className="text-xs text-purple-400/50 ml-2">(Ctrl+`)</span>
          {isConnected && (
            <Wifi className="w-3 h-3 text-green-400 ml-2" />
          )}
        </button>
      )}

      {/* Expanded Terminal */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border border-purple-500/30 rounded-lg overflow-hidden"
          >
            {terminalContent}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default IntegratedTerminal;
