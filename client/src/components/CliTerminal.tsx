import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { 
  Terminal, 
  Play, 
  Square, 
  Trash2, 
  Download,
  Maximize2,
  Minimize2
} from "lucide-react";

interface CliMessage {
  type: "stdout" | "stderr" | "status" | "error" | "complete";
  data: string;
  timestamp: number;
  iteration?: number;
  exitCode?: number;
}

interface CliTerminalProps {
  sessionId?: number;
  onStart?: () => void;
  onStop?: () => void;
  isRunning?: boolean;
}

export function CliTerminal({ sessionId, onStart, onStop, isRunning = false }: CliTerminalProps) {
  const [messages, setMessages] = useState<CliMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [messages]);

  // Connect to WebSocket when session starts
  useEffect(() => {
    if (!sessionId || !isRunning) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/cli-stream?sessionId=${sessionId}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setMessages(prev => [...prev, {
        type: "status",
        data: "Connected to CLI stream",
        timestamp: Date.now(),
      }]);
    };

    ws.onmessage = (event) => {
      try {
        const message: CliMessage = JSON.parse(event.data);
        setMessages(prev => [...prev, message]);
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setMessages(prev => [...prev, {
        type: "status",
        data: "Disconnected from CLI stream",
        timestamp: Date.now(),
      }]);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setMessages(prev => [...prev, {
        type: "error",
        data: "WebSocket connection error",
        timestamp: Date.now(),
      }]);
    };

    return () => {
      ws.close();
    };
  }, [sessionId, isRunning]);

  const clearTerminal = () => {
    setMessages([]);
  };

  const downloadLogs = () => {
    const logContent = messages
      .map(m => `[${new Date(m.timestamp).toISOString()}] [${m.type.toUpperCase()}] ${m.data}`)
      .join("\n");
    
    const blob = new Blob([logContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cli-session-${sessionId || "unknown"}-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getMessageColor = (type: CliMessage["type"]) => {
    switch (type) {
      case "stdout":
        return "text-green-400";
      case "stderr":
        return "text-red-400";
      case "status":
        return "text-cyan-400";
      case "error":
        return "text-red-500 font-bold";
      case "complete":
        return "text-purple-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className={`flex flex-col ${isFullscreen ? "fixed inset-0 z-50 bg-black" : ""}`}>
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-purple-900/30 border-b border-purple-500/30">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-purple-400" />
          <span className="font-orbitron text-sm text-purple-200">CLI OUTPUT</span>
          {isConnected && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isRunning ? (
            <Button
              size="sm"
              onClick={onStart}
              className="bg-green-600 hover:bg-green-500 text-white h-7 px-3"
            >
              <Play className="w-3 h-3 mr-1" />
              Start
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onStop}
              className="bg-red-600 hover:bg-red-500 text-white h-7 px-3"
            >
              <Square className="w-3 h-3 mr-1" />
              Stop
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={clearTerminal}
            className="text-purple-400 hover:text-purple-300 h-7 px-2"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={downloadLogs}
            className="text-purple-400 hover:text-purple-300 h-7 px-2"
          >
            <Download className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="text-purple-400 hover:text-purple-300 h-7 px-2"
          >
            {isFullscreen ? (
              <Minimize2 className="w-3 h-3" />
            ) : (
              <Maximize2 className="w-3 h-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Terminal Content */}
      <div
        ref={terminalRef}
        className={`flex-1 overflow-auto p-4 bg-black/80 font-mono text-sm ${
          isFullscreen ? "h-[calc(100vh-48px)]" : "h-64"
        }`}
        style={{
          backgroundImage: `
            linear-gradient(rgba(139, 92, 246, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      >
        {messages.length === 0 ? (
          <div className="text-purple-400/50 italic">
            Waiting for CLI output...
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className={`${getMessageColor(msg.type)} whitespace-pre-wrap mb-1`}>
              <span className="text-purple-500/50 text-xs mr-2">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
              {msg.iteration !== undefined && (
                <span className="text-cyan-500/70 text-xs mr-2">
                  [iter:{msg.iteration}]
                </span>
              )}
              {msg.data}
              {msg.exitCode !== undefined && (
                <span className={`ml-2 ${msg.exitCode === 0 ? "text-green-400" : "text-red-400"}`}>
                  (exit: {msg.exitCode})
                </span>
              )}
            </div>
          ))
        )}
        
        {/* Blinking cursor */}
        {isRunning && (
          <span className="inline-block w-2 h-4 bg-green-400 animate-pulse" />
        )}
      </div>
    </div>
  );
}

export default CliTerminal;
