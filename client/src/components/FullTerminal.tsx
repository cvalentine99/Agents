/**
 * Full Terminal Component with Real PTY
 * Uses xterm.js for proper terminal emulation with PTY backend
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { 
  Play, 
  Square, 
  Trash2, 
  Download, 
  Maximize2, 
  Minimize2,
  X,
  Wifi,
  WifiOff,
  TerminalIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FullTerminalProps {
  sessionId: string;
  userId: string;
  workingDirectory?: string;
  onOutput?: (data: string) => void;
  onExit?: (exitCode: number) => void;
  onClose?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  className?: string;
}

export function FullTerminal({
  sessionId,
  userId,
  workingDirectory = '/home/ubuntu',
  onOutput,
  onExit,
  onClose,
  isExpanded = true,
  onToggleExpand: _onToggleExpand,
  className = '',
}: FullTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [outputBuffer, setOutputBuffer] = useState<string[]>([]);

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current) return;
    
    // Clean up existing terminal
    if (terminalInstance.current) {
      terminalInstance.current.dispose();
    }

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
      lineHeight: 1.2,
      letterSpacing: 0,
      theme: {
        background: '#0a0a1a',
        foreground: '#e0e0e0',
        cursor: '#00ffff',
        cursorAccent: '#0a0a1a',
        selectionBackground: 'rgba(0, 255, 255, 0.3)',
        selectionForeground: '#ffffff',
        black: '#1a1a2e',
        red: '#ff6b6b',
        green: '#4ade80',
        yellow: '#fbbf24',
        blue: '#60a5fa',
        magenta: '#c084fc',
        cyan: '#22d3ee',
        white: '#e0e0e0',
        brightBlack: '#4a4a6a',
        brightRed: '#ff8a8a',
        brightGreen: '#6ee7b7',
        brightYellow: '#fcd34d',
        brightBlue: '#93c5fd',
        brightMagenta: '#d8b4fe',
        brightCyan: '#67e8f9',
        brightWhite: '#ffffff',
      },
      allowProposedApi: true,
      scrollback: 10000,
    });

    const fit = new FitAddon();
    const webLinks = new WebLinksAddon();

    terminal.loadAddon(fit);
    terminal.loadAddon(webLinks);
    terminal.open(terminalRef.current);
    
    // Delay fit to ensure container is sized
    setTimeout(() => fit.fit(), 100);

    terminalInstance.current = terminal;
    fitAddon.current = fit;

    // Handle window resize
    const handleResize = () => {
      setTimeout(() => {
        fit.fit();
        if (wsRef.current?.readyState === WebSocket.OPEN && terminalInstance.current) {
          wsRef.current.send(JSON.stringify({
            type: 'resize',
            cols: terminalInstance.current.cols,
            rows: terminalInstance.current.rows,
          }));
        }
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    
    // Also fit when expanded state changes
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      terminal.dispose();
      terminalInstance.current = null;
    };
  }, [isExpanded, isFullscreen]);

  // Connect to PTY WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws/pty`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      
      // Create PTY session
      ws.send(JSON.stringify({
        type: 'create',
        sessionId,
        userId,
        cwd: workingDirectory,
      }));

      terminalInstance.current?.writeln('\x1b[36m● Connected to real terminal\x1b[0m');
      terminalInstance.current?.writeln(`\x1b[90mWorking directory: ${workingDirectory}\x1b[0m`);
      terminalInstance.current?.writeln('\x1b[90mType commands to execute them directly.\x1b[0m');
      terminalInstance.current?.writeln('');
      
      // Focus the terminal for keyboard input
      terminalInstance.current?.focus();
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'output':
          terminalInstance.current?.write(message.data);
          onOutput?.(message.data);
          setOutputBuffer(prev => [...prev.slice(-1000), message.data]);
          break;
          
        case 'exit':
          terminalInstance.current?.writeln(`\x1b[33m● Process exited with code ${message.exitCode}\x1b[0m`);
          onExit?.(message.exitCode);
          break;
          
        case 'created':
          // Send initial resize
          if (terminalInstance.current) {
            ws.send(JSON.stringify({
              type: 'resize',
              cols: terminalInstance.current.cols,
              rows: terminalInstance.current.rows,
            }));
          }
          break;
          
        case 'error':
          terminalInstance.current?.writeln(`\x1b[31m● Error: ${message.error}\x1b[0m`);
          break;
          
        case 'ready':
          // Server is ready
          break;
      }
    };

    ws.onerror = () => {
      setConnected(false);
      terminalInstance.current?.writeln('\x1b[31m● Connection error\x1b[0m');
    };

    ws.onclose = () => {
      setConnected(false);
      terminalInstance.current?.writeln('\x1b[33m● Disconnected\x1b[0m');
    };

    // Handle terminal input - send to PTY
    // Set up input handler immediately since terminal is already initialized
    const inputHandler = terminalInstance.current?.onData((data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }));
      }
    });
    
    // Store reference for cleanup
    wsRef.current = ws;

    return () => {
      inputHandler?.dispose();
    };
  }, [sessionId, userId, workingDirectory, onOutput, onExit]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'kill' }));
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  // Clear terminal
  const clear = useCallback(() => {
    terminalInstance.current?.clear();
    setOutputBuffer([]);
  }, []);

  // Download logs
  const downloadLogs = useCallback(() => {
    const content = outputBuffer.join('');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `terminal-${sessionId}-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  }, [outputBuffer, sessionId]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const containerClass = isFullscreen 
    ? 'fixed inset-0 z-50 bg-[#0a0a1a]' 
    : `relative ${className}`;

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-black/60 border-b border-purple-500/30">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-purple-400" />
          <span className="font-mono text-sm text-purple-200">CLI Output</span>
          {connected ? (
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
        </div>
        
        <div className="flex items-center gap-1">
          {!connected ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={connect}
              className="h-7 px-2 text-green-400 hover:bg-green-500/20"
              title="Connect"
            >
              <Play className="w-3 h-3" />
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={disconnect}
              className="h-7 px-2 text-red-400 hover:bg-red-500/20"
              title="Disconnect"
            >
              <Square className="w-3 h-3" />
            </Button>
          )}
          
          <div className="w-px h-4 bg-purple-500/30 mx-1" />
          
          <Button
            size="sm"
            variant="ghost"
            onClick={clear}
            className="h-7 px-2 text-purple-300 hover:bg-purple-500/20"
            title="Clear Terminal"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={downloadLogs}
            className="h-7 px-2 text-purple-300 hover:bg-purple-500/20"
            title="Download Logs"
          >
            <Download className="w-3 h-3" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleFullscreen}
            className="h-7 px-2 text-purple-300 hover:bg-purple-500/20"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </Button>
          
          {onClose && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="h-7 px-2 text-purple-300 hover:bg-red-500/20"
              title="Close Terminal"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Terminal */}
      <div 
        ref={terminalRef} 
        className="w-full bg-[#0a0a1a]"
        style={{ 
          height: isFullscreen ? 'calc(100vh - 44px)' : '400px',
          minHeight: '200px'
        }}
      />
    </div>
  );
}

export default FullTerminal;
