/**
 * REAL Terminal Component
 * Connects to PTY WebSocket for actual command execution
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";

interface RealTerminalProps {
  sessionId: string;
  userId: string;
  workingDirectory?: string;
  onOutput?: (data: string) => void;
  onExit?: (exitCode: number) => void;
  className?: string;
}

export function RealTerminal({
  sessionId,
  userId,
  workingDirectory = "/home/ubuntu",
  onOutput,
  onExit,
  className = "",
}: RealTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current || terminalInstance.current) return;

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      theme: {
        background: "#0a0a1a",
        foreground: "#e0e0e0",
        cursor: "#00ffff",
        cursorAccent: "#0a0a1a",
        selectionBackground: "rgba(0, 255, 255, 0.3)",
        black: "#1a1a2e",
        red: "#ff6b6b",
        green: "#4ade80",
        yellow: "#fbbf24",
        blue: "#60a5fa",
        magenta: "#c084fc",
        cyan: "#22d3ee",
        white: "#e0e0e0",
        brightBlack: "#4a4a6a",
        brightRed: "#ff8a8a",
        brightGreen: "#6ee7b7",
        brightYellow: "#fcd34d",
        brightBlue: "#93c5fd",
        brightMagenta: "#d8b4fe",
        brightCyan: "#67e8f9",
        brightWhite: "#ffffff",
      },
      allowProposedApi: true,
    });

    const fit = new FitAddon();
    const webLinks = new WebLinksAddon();

    terminal.loadAddon(fit);
    terminal.loadAddon(webLinks);
    terminal.open(terminalRef.current);
    fit.fit();

    terminalInstance.current = terminal;
    fitAddon.current = fit;

    // Handle window resize
    const handleResize = () => {
      fit.fit();
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "resize",
            cols: terminal.cols,
            rows: terminal.rows,
          })
        );
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      terminal.dispose();
      terminalInstance.current = null;
    };
  }, []);

  // Connect to PTY WebSocket
  useEffect(() => {
    if (!terminalInstance.current) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/ws/pty`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setError(null);

      // Create PTY session
      ws.send(
        JSON.stringify({
          type: "create",
          sessionId,
          userId,
          cwd: workingDirectory,
        })
      );

      terminalInstance.current?.writeln(
        "\x1b[36m● Connected to terminal\x1b[0m"
      );
      terminalInstance.current?.writeln(
        `\x1b[90mWorking directory: ${workingDirectory}\x1b[0m`
      );
      terminalInstance.current?.writeln("");
    };

    ws.onmessage = event => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case "output":
          terminalInstance.current?.write(message.data);
          onOutput?.(message.data);
          break;

        case "exit":
          terminalInstance.current?.writeln(
            `\x1b[33m● Process exited with code ${message.exitCode}\x1b[0m`
          );
          onExit?.(message.exitCode);
          break;

        case "created":
          // Send initial resize
          if (terminalInstance.current) {
            ws.send(
              JSON.stringify({
                type: "resize",
                cols: terminalInstance.current.cols,
                rows: terminalInstance.current.rows,
              })
            );
          }
          break;

        case "error":
          terminalInstance.current?.writeln(
            `\x1b[31m● Error: ${message.error}\x1b[0m`
          );
          setError(message.error);
          break;
      }
    };

    ws.onerror = () => {
      setError("WebSocket connection error");
      setConnected(false);
    };

    ws.onclose = () => {
      setConnected(false);
      terminalInstance.current?.writeln(
        "\x1b[33m● Disconnected from terminal\x1b[0m"
      );
    };

    // Handle terminal input
    const inputHandler = terminalInstance.current.onData((data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "input", data }));
      }
    });

    return () => {
      inputHandler.dispose();
      ws.close();
      wsRef.current = null;
    };
  }, [sessionId, userId, workingDirectory, onOutput, onExit]);

  // Execute command programmatically
  const _executeCommand = useCallback((command: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: "input", data: command + "\n" })
      );
    }
  }, []);

  // Clear terminal
  const clear = useCallback(() => {
    terminalInstance.current?.clear();
  }, []);

  // Kill session
  const kill = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "kill" }));
    }
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Status bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-1 bg-[#0a0a1a]/90 border-b border-purple-500/20">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
          />
          <span className="text-xs text-gray-400">
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clear}
            className="px-2 py-0.5 text-xs text-gray-400 hover:text-white hover:bg-purple-500/20 rounded"
          >
            Clear
          </button>
          <button
            onClick={kill}
            className="px-2 py-0.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded"
          >
            Kill
          </button>
        </div>
      </div>

      {/* Terminal container */}
      <div
        ref={terminalRef}
        className="w-full h-full pt-8"
        style={{ minHeight: "300px" }}
      />

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <p className="text-red-400 mb-2">{error}</p>
            <button
              onClick={() => setError(null)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded text-white text-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RealTerminal;
