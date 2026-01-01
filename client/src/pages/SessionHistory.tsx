import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { 
  History, 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle, 
  Clock,
  Trash2,
  ArrowLeft,
  RefreshCw,
  Activity,
  Zap,
  Filter,
  Download,
  Upload
} from "lucide-react";
import { SessionExportImport, type SessionExport } from "@/components/SessionExportImport";
import { Link, useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { formatDistanceToNow } from "date-fns";

type SessionStatus = "idle" | "running" | "paused" | "complete" | "failed";
type FilterStatus = "all" | SessionStatus;

const statusConfig: Record<SessionStatus, { 
  icon: React.ReactNode; 
  color: string; 
  label: string;
  bgColor: string;
}> = {
  idle: {
    icon: <Clock className="w-4 h-4" />,
    color: "text-gray-400",
    label: "Idle",
    bgColor: "bg-gray-500/20",
  },
  running: {
    icon: <Activity className="w-4 h-4 animate-pulse" />,
    color: "text-green-400",
    label: "Running",
    bgColor: "bg-green-500/20",
  },
  paused: {
    icon: <Pause className="w-4 h-4" />,
    color: "text-yellow-400",
    label: "Paused",
    bgColor: "bg-yellow-500/20",
  },
  complete: {
    icon: <CheckCircle className="w-4 h-4" />,
    color: "text-cyan-400",
    label: "Complete",
    bgColor: "bg-cyan-500/20",
  },
  failed: {
    icon: <XCircle className="w-4 h-4" />,
    color: "text-red-400",
    label: "Failed",
    bgColor: "bg-red-500/20",
  },
};

const modelColors: Record<string, string> = {
  codex: "text-green-400",
  claude: "text-orange-400",
  gemini: "text-blue-400",
  manus: "text-purple-400",
};

export default function SessionHistory() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  
  const utils = trpc.useUtils();
  
  const { data: sessions, isLoading: sessionsLoading, refetch } = trpc.sessions.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  
  const updateSessionMutation = trpc.sessions.update.useMutation({
    onSuccess: () => {
      utils.sessions.list.invalidate();
      toast.success("Session updated");
    },
    onError: (error) => {
      toast.error(`Failed to update session: ${error.message}`);
    },
  });
  
  const deleteSessionMutation = trpc.sessions.delete.useMutation({
    onSuccess: () => {
      utils.sessions.list.invalidate();
      toast.success("Session deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete session: ${error.message}`);
    },
  });
  
  const handleResume = (sessionId: string) => {
    updateSessionMutation.mutate({
      sessionId,
      updates: { status: "running" },
    });
    // Navigate to dashboard with this session active
    setLocation(`/dashboard?session=${sessionId}`);
  };
  
  const handlePause = (sessionId: string) => {
    updateSessionMutation.mutate({
      sessionId,
      updates: { status: "paused" },
    });
  };
  
  const handleDelete = (sessionId: string) => {
    if (confirm("Are you sure you want to delete this session?")) {
      deleteSessionMutation.mutate({ sessionId });
    }
  };
  
  const filteredSessions = sessions?.filter(session => {
    if (filterStatus === "all") return true;
    return session.status === filterStatus;
  }) || [];
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Card className="bg-black/40 border border-purple-500/30 p-8 text-center max-w-md">
          <History className="w-16 h-16 text-purple-500 mx-auto mb-4" />
          <h2 className="text-2xl font-orbitron text-purple-100 mb-2">Authentication Required</h2>
          <p className="text-purple-300/60 mb-6">
            Please sign in to view your session history.
          </p>
          <Button
            asChild
            className="bg-purple-600 hover:bg-purple-500 text-white"
          >
            <a href={getLoginUrl()}>Sign In</a>
          </Button>
        </Card>
      </div>
    );
  }

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
      
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" className="text-purple-400 hover:text-purple-300 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-orbitron font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                Session History
              </h1>
              <p className="text-purple-300/60 mt-2">
                View and manage your RALPH Loop+ sessions
              </p>
            </div>
            <div className="flex items-center gap-3">
              <SessionExportImport
                currentSession={{
                  name: "Current Session",
                  model: "claude",
                  profile: "patch_goblin",
                  workingDirectory: "/home/ubuntu",
                  maxIterations: 50,
                  noProgressThreshold: 3,
                  circuitBreakerEnabled: true,
                  dangerouslySkipPermissions: true,
                }}
                completionCriteria={[]}
                onImport={(data: SessionExport) => {
                  toast.success(`Imported session: ${data.session.name}`);
                  // Navigate to dashboard with imported config
                  setLocation(`/dashboard?import=true`);
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="border-purple-500/30 text-purple-300"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
        
        {/* Filters */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-300">Filter:</span>
          </div>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
            <SelectTrigger className="w-40 bg-purple-900/20 border-purple-500/30 text-purple-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a2e] border-purple-500/30">
              <SelectItem value="all">All Sessions</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="idle">Idle</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-purple-400/60">
            {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        {/* Sessions List */}
        {sessionsLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-purple-500/10 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : filteredSessions.length === 0 ? (
          <Card className="bg-black/40 border border-purple-500/30 p-12 text-center">
            <History className="w-16 h-16 text-purple-500/50 mx-auto mb-4" />
            <h3 className="text-xl font-orbitron text-purple-200 mb-2">No Sessions Found</h3>
            <p className="text-purple-400/60 mb-6">
              {filterStatus === "all" 
                ? "Start your first RALPH Loop+ session from the Dashboard."
                : `No ${filterStatus} sessions found. Try a different filter.`}
            </p>
            <Link href="/dashboard">
              <Button className="bg-purple-600 hover:bg-purple-500 text-white">
                <Zap className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredSessions.map((session) => {
              const status = statusConfig[session.status as SessionStatus] || statusConfig.idle;
              const modelColor = modelColors[session.selectedModel || "claude"] || "text-purple-400";
              
              return (
                <Card 
                  key={session.id} 
                  className="bg-black/40 border border-purple-500/30 hover:border-purple-500/50 transition-colors"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      {/* Left: Session Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-orbitron text-purple-100">
                            {session.name || `Session ${session.sessionId.slice(-8)}`}
                          </h3>
                          <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${status.color} ${status.bgColor}`}>
                            {status.icon}
                            {status.label}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          <div>
                            <p className="text-xs text-purple-400/60 uppercase">Model</p>
                            <p className={`font-mono ${modelColor}`}>
                              {session.selectedModel || "claude"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-purple-400/60 uppercase">Iterations</p>
                            <p className="font-mono text-cyan-400">
                              {session.currentIteration || 0} / {session.maxIterations}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-purple-400/60 uppercase">Progress</p>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-purple-900/30 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all"
                                  style={{ width: `${session.completionProgress || 0}%` }}
                                />
                              </div>
                              <span className="text-xs text-purple-300">
                                {session.completionProgress || 0}%
                              </span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-purple-400/60 uppercase">Created</p>
                            <p className="text-sm text-purple-300">
                              {session.createdAt 
                                ? formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })
                                : "Unknown"}
                            </p>
                          </div>
                        </div>
                        
                        <div className="mt-3 flex items-center gap-4 text-xs text-purple-400/60">
                          <span>ID: {session.sessionId}</span>
                          <span>Profile: {session.selectedProfile || "patch_goblin"}</span>
                          <span>Mode: {session.ralphMode ? "RALPH" : "Manual"}</span>
                        </div>
                      </div>
                      
                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 ml-4">
                        {session.status === "paused" && (
                          <Button
                            size="sm"
                            onClick={() => handleResume(session.sessionId)}
                            className="bg-green-600 hover:bg-green-500 text-white"
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Resume
                          </Button>
                        )}
                        {session.status === "running" && (
                          <Button
                            size="sm"
                            onClick={() => handlePause(session.sessionId)}
                            className="bg-yellow-600 hover:bg-yellow-500 text-white"
                          >
                            <Pause className="w-4 h-4 mr-1" />
                            Pause
                          </Button>
                        )}
                        {(session.status === "idle" || session.status === "paused") && (
                          <Link href={`/dashboard?session=${session.sessionId}`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-purple-500/30 text-purple-300"
                            >
                              Open
                            </Button>
                          </Link>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(session.sessionId)}
                          disabled={session.status === "running"}
                          className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
