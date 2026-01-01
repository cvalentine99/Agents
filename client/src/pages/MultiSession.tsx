import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  Plus, 
  X, 
  Maximize2, 
  Minimize2,
  Play,
  Pause,
  Square,
  RefreshCw,
  Settings,
  Terminal,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Cpu,
  Layers,
  LayoutGrid,
  Columns,
  Rows
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { useNotifications } from "@/hooks/useNotifications";

interface SessionPane {
  id: string;
  sessionId?: number;
  name: string;
  status: 'idle' | 'running' | 'paused' | 'complete' | 'failed';
  progress: number;
  iterations: number;
  maxIterations: number;
  circuitBreakerState: 'CLOSED' | 'HALF_OPEN' | 'OPEN';
  model: string;
  workingDirectory: string;
  logs: string[];
  isMaximized: boolean;
}

type LayoutMode = 'grid' | 'columns' | 'rows';

export default function MultiSession() {
  const [panes, setPanes] = useState<SessionPane[]>([
    {
      id: 'pane-1',
      name: 'Session 1',
      status: 'idle',
      progress: 0,
      iterations: 0,
      maxIterations: 10,
      circuitBreakerState: 'CLOSED',
      model: 'claude',
      workingDirectory: '~/projects/app1',
      logs: [],
      isMaximized: false,
    },
    {
      id: 'pane-2',
      name: 'Session 2',
      status: 'idle',
      progress: 0,
      iterations: 0,
      maxIterations: 10,
      circuitBreakerState: 'CLOSED',
      model: 'gemini',
      workingDirectory: '~/projects/app2',
      logs: [],
      isMaximized: false,
    },
  ]);
  
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');
  const [maximizedPane, setMaximizedPane] = useState<string | null>(null);
  
  const { notifyLoopComplete, notifyLoopFailed, notifyCircuitBreakerOpen } = useNotifications();

  // Fetch active sessions
  const { data: sessions } = trpc.sessions.list.useQuery();

  const addPane = () => {
    const newId = `pane-${Date.now()}`;
    setPanes(prev => [...prev, {
      id: newId,
      name: `Session ${prev.length + 1}`,
      status: 'idle',
      progress: 0,
      iterations: 0,
      maxIterations: 10,
      circuitBreakerState: 'CLOSED',
      model: 'claude',
      workingDirectory: '~/projects/new',
      logs: [],
      isMaximized: false,
    }]);
  };

  const removePane = (id: string) => {
    setPanes(prev => prev.filter(p => p.id !== id));
    if (maximizedPane === id) {
      setMaximizedPane(null);
    }
  };

  const toggleMaximize = (id: string) => {
    setMaximizedPane(prev => prev === id ? null : id);
  };

  const updatePane = (id: string, updates: Partial<SessionPane>) => {
    setPanes(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const getStatusColor = (status: SessionPane['status']) => {
    switch (status) {
      case 'running': return 'text-green-400 bg-green-400/20';
      case 'paused': return 'text-yellow-400 bg-yellow-400/20';
      case 'complete': return 'text-cyan-400 bg-cyan-400/20';
      case 'failed': return 'text-red-400 bg-red-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getCircuitBreakerColor = (state: SessionPane['circuitBreakerState']) => {
    switch (state) {
      case 'CLOSED': return 'text-green-400';
      case 'HALF_OPEN': return 'text-yellow-400';
      case 'OPEN': return 'text-red-400';
    }
  };

  const getLayoutClass = () => {
    if (maximizedPane) return 'grid-cols-1';
    
    const count = panes.length;
    
    switch (layoutMode) {
      case 'columns':
        return `grid-cols-${Math.min(count, 6)}`;
      case 'rows':
        return 'grid-cols-1';
      case 'grid':
      default:
        // Optimize for ultrawide 5120x1440
        if (count <= 2) return 'grid-cols-2';
        if (count <= 3) return 'grid-cols-3';
        if (count <= 4) return 'grid-cols-2 lg:grid-cols-4';
        if (count <= 6) return 'grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6';
        return 'grid-cols-2 lg:grid-cols-4 2xl:grid-cols-6';
    }
  };

  // Simulate session updates (in production, this would be WebSocket)
  useEffect(() => {
    const interval = setInterval(() => {
      setPanes(prev => prev.map(pane => {
        if (pane.status !== 'running') return pane;
        
        const newIterations = pane.iterations + 1;
        const newProgress = Math.min((newIterations / pane.maxIterations) * 100, 100);
        
        // Simulate completion
        if (newIterations >= pane.maxIterations) {
          notifyLoopComplete(pane.name, newIterations);
          return {
            ...pane,
            status: 'complete' as const,
            iterations: newIterations,
            progress: 100,
            logs: [...pane.logs, `[${new Date().toLocaleTimeString()}] ✅ Loop completed successfully!`],
          };
        }
        
        // Simulate random circuit breaker trip
        if (Math.random() < 0.02) {
          notifyCircuitBreakerOpen(pane.name, 'Stuck detection triggered');
          return {
            ...pane,
            circuitBreakerState: 'OPEN' as const,
            status: 'paused' as const,
            logs: [...pane.logs, `[${new Date().toLocaleTimeString()}] ⚠️ Circuit breaker OPEN - stuck detected`],
          };
        }
        
        return {
          ...pane,
          iterations: newIterations,
          progress: newProgress,
          logs: [...pane.logs.slice(-50), `[${new Date().toLocaleTimeString()}] Iteration ${newIterations}/${pane.maxIterations} - Processing...`],
        };
      }));
    }, 2000);
    
    return () => clearInterval(interval);
  }, [notifyLoopComplete, notifyCircuitBreakerOpen]);

  const visiblePanes = maximizedPane 
    ? panes.filter(p => p.id === maximizedPane)
    : panes;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-purple-100">
      {/* Background grid */}
      <div 
        className="fixed inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />
      
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-purple-500/20 bg-black/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-purple-400 hover:text-purple-300">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white font-orbitron flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-400" />
                  Multi-Session Monitor
                </h1>
                <p className="text-xs text-purple-400/60">
                  Optimized for ultrawide displays (5120×1440)
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Layout Mode Toggle */}
              <div className="flex items-center gap-1 bg-purple-500/10 rounded-lg p-1">
                <button
                  onClick={() => setLayoutMode('grid')}
                  className={`p-2 rounded transition-colors ${
                    layoutMode === 'grid' ? 'bg-purple-600 text-white' : 'text-purple-400 hover:text-purple-300'
                  }`}
                  title="Grid Layout"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setLayoutMode('columns')}
                  className={`p-2 rounded transition-colors ${
                    layoutMode === 'columns' ? 'bg-purple-600 text-white' : 'text-purple-400 hover:text-purple-300'
                  }`}
                  title="Columns Layout"
                >
                  <Columns className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setLayoutMode('rows')}
                  className={`p-2 rounded transition-colors ${
                    layoutMode === 'rows' ? 'bg-purple-600 text-white' : 'text-purple-400 hover:text-purple-300'
                  }`}
                  title="Rows Layout"
                >
                  <Rows className="w-4 h-4" />
                </button>
              </div>
              
              {/* Session Count */}
              <Badge variant="outline" className="border-purple-500/30 text-purple-300">
                {panes.length} Sessions
              </Badge>
              
              {/* Add Session Button */}
              <Button 
                onClick={addPane}
                className="bg-purple-600 hover:bg-purple-500"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Session
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-4">
        <div className={`grid gap-4 ${getLayoutClass()}`}>
          {visiblePanes.map((pane) => (
            <Card 
              key={pane.id}
              className={`bg-black/60 border-purple-500/30 overflow-hidden transition-all ${
                maximizedPane === pane.id ? 'min-h-[calc(100vh-120px)]' : 'min-h-[400px]'
              }`}
            >
              {/* Pane Header */}
              <div className="flex items-center justify-between p-3 border-b border-purple-500/20 bg-purple-500/5">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    pane.status === 'running' ? 'bg-green-400 animate-pulse' :
                    pane.status === 'paused' ? 'bg-yellow-400' :
                    pane.status === 'complete' ? 'bg-cyan-400' :
                    pane.status === 'failed' ? 'bg-red-400' : 'bg-gray-400'
                  }`} />
                  <span className="font-medium text-white text-sm">{pane.name}</span>
                  <Badge className={`text-xs ${getStatusColor(pane.status)}`}>
                    {pane.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleMaximize(pane.id)}
                    className="p-1.5 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 rounded transition-colors"
                    title={maximizedPane === pane.id ? 'Minimize' : 'Maximize'}
                  >
                    {maximizedPane === pane.id ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => removePane(pane.id)}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                    title="Close Session"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Pane Content */}
              <div className="p-4 space-y-4">
                {/* Stats Row */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-purple-500/10 rounded-lg p-3 text-center">
                    <p className="text-xs text-purple-400 mb-1">Model</p>
                    <p className="text-sm font-medium text-white capitalize">{pane.model}</p>
                  </div>
                  <div className="bg-purple-500/10 rounded-lg p-3 text-center">
                    <p className="text-xs text-purple-400 mb-1">Iterations</p>
                    <p className="text-sm font-medium text-white">{pane.iterations}/{pane.maxIterations}</p>
                  </div>
                  <div className="bg-purple-500/10 rounded-lg p-3 text-center">
                    <p className="text-xs text-purple-400 mb-1">Circuit</p>
                    <p className={`text-sm font-medium ${getCircuitBreakerColor(pane.circuitBreakerState)}`}>
                      {pane.circuitBreakerState}
                    </p>
                  </div>
                  <div className="bg-purple-500/10 rounded-lg p-3 text-center">
                    <p className="text-xs text-purple-400 mb-1">Progress</p>
                    <p className="text-sm font-medium text-white">{Math.round(pane.progress)}%</p>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="space-y-1">
                  <Progress 
                    value={pane.progress} 
                    className="h-2 bg-purple-500/20"
                  />
                  <p className="text-xs text-purple-400/60 truncate">
                    {pane.workingDirectory}
                  </p>
                </div>
                
                {/* Control Buttons */}
                <div className="flex gap-2">
                  {pane.status === 'idle' || pane.status === 'paused' ? (
                    <Button
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-500"
                      onClick={() => updatePane(pane.id, { status: 'running' })}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Start
                    </Button>
                  ) : pane.status === 'running' ? (
                    <Button
                      size="sm"
                      className="flex-1 bg-yellow-600 hover:bg-yellow-500"
                      onClick={() => updatePane(pane.id, { status: 'paused' })}
                    >
                      <Pause className="w-4 h-4 mr-1" />
                      Pause
                    </Button>
                  ) : null}
                  
                  {pane.status !== 'idle' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                      onClick={() => updatePane(pane.id, { 
                        status: 'idle', 
                        progress: 0, 
                        iterations: 0,
                        circuitBreakerState: 'CLOSED',
                        logs: []
                      })}
                    >
                      <Square className="w-4 h-4 mr-1" />
                      Reset
                    </Button>
                  )}
                  
                  {pane.circuitBreakerState === 'OPEN' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                      onClick={() => updatePane(pane.id, { circuitBreakerState: 'CLOSED' })}
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Reset CB
                    </Button>
                  )}
                </div>
                
                {/* Mini Terminal */}
                <div className="bg-[#0d0a12] rounded-lg border border-purple-500/20 overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-purple-500/20 bg-purple-500/5">
                    <Terminal className="w-3 h-3 text-purple-400" />
                    <span className="text-xs text-purple-400">Output</span>
                  </div>
                  <div className={`p-2 font-mono text-xs overflow-y-auto ${
                    maximizedPane === pane.id ? 'h-[calc(100vh-450px)]' : 'h-32'
                  }`}>
                    {pane.logs.length === 0 ? (
                      <p className="text-purple-400/40 italic">No output yet...</p>
                    ) : (
                      pane.logs.map((log, i) => (
                        <p key={i} className="text-purple-300/80 leading-relaxed">
                          {log}
                        </p>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
        
        {/* Empty State */}
        {panes.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <Layers className="w-16 h-16 text-purple-500/30 mb-4" />
            <h2 className="text-xl font-orbitron text-purple-300 mb-2">No Sessions</h2>
            <p className="text-purple-400/60 mb-6">
              Add sessions to monitor multiple RALPH loops side-by-side
            </p>
            <Button onClick={addPane} className="bg-purple-600 hover:bg-purple-500">
              <Plus className="w-4 h-4 mr-2" />
              Add First Session
            </Button>
          </div>
        )}
      </main>
      
      {/* Ultrawide Optimization Hint */}
      <div className="fixed bottom-4 right-4 text-xs text-purple-400/40 font-mono">
        Layout: {layoutMode} | Panes: {panes.length} | 5120×1440 optimized
      </div>
    </div>
  );
}
