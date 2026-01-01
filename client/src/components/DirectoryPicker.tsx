import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Folder, 
  FolderOpen, 
  Clock, 
  X, 
  Plus, 
  Check,
  ChevronRight,
  Home,
  Trash2,
  ArrowUp,
  Package,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface RecentProject {
  path: string;
  name: string;
  lastUsed: number;
}

interface DirectoryPickerProps {
  value: string;
  onChange: (path: string) => void;
  disabled?: boolean;
}

const STORAGE_KEY = "coding-wheel-recent-projects";

export function DirectoryPicker({ value, onChange, disabled }: DirectoryPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [manualPath, setManualPath] = useState(value);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [showManualInput, setShowManualInput] = useState(false);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [browsePath, setBrowsePath] = useState('/home/ubuntu');
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  // Real file browser API
  const { data: dirData, isLoading: dirLoading, refetch: refetchDir } = trpc.fileBrowser.listDirectory.useQuery(
    { path: browsePath, directoriesOnly: true },
    { enabled: isOpen && showFileBrowser }
  );

  const { data: projectInfo } = trpc.fileBrowser.isProjectDirectory.useQuery(
    { path: selectedPath || browsePath },
    { enabled: isOpen && showFileBrowser && !!(selectedPath || browsePath) }
  );

  // Load recent projects from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setRecentProjects(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load recent projects:", e);
    }
  }, []);

  // Save recent projects to localStorage
  const saveRecentProjects = (projects: RecentProject[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
      setRecentProjects(projects);
    } catch (e) {
      console.error("Failed to save recent projects:", e);
    }
  };

  const addToRecent = (path: string) => {
    const name = path.split("/").pop() || path;
    const existing = recentProjects.filter(p => p.path !== path);
    const updated = [
      { path, name, lastUsed: Date.now() },
      ...existing.slice(0, 9), // Keep max 10 recent projects
    ];
    saveRecentProjects(updated);
  };

  const removeFromRecent = (path: string) => {
    const updated = recentProjects.filter(p => p.path !== path);
    saveRecentProjects(updated);
  };

  const handleSelectPath = (path: string) => {
    onChange(path);
    addToRecent(path);
    setIsOpen(false);
    setShowManualInput(false);
  };

  const handleManualSubmit = () => {
    if (manualPath.trim()) {
      handleSelectPath(manualPath.trim());
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="relative">
      {/* Current Selection Display */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
          disabled
            ? "bg-purple-900/10 border-purple-500/20 cursor-not-allowed opacity-50"
            : "bg-purple-900/20 border-purple-500/30 hover:border-purple-500/50 cursor-pointer"
        }`}
      >
        <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
          {value ? (
            <FolderOpen className="w-5 h-5 text-purple-400" />
          ) : (
            <Folder className="w-5 h-5 text-purple-400/50" />
          )}
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm text-purple-300/60">Working Directory</p>
          <p className="font-mono text-purple-100 truncate">
            {value || "Select a project folder..."}
          </p>
        </div>
        <ChevronRight className={`w-5 h-5 text-purple-400 transition-transform ${isOpen ? "rotate-90" : ""}`} />
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 top-full left-0 right-0 mt-2 bg-[#1a1a2e] border border-purple-500/30 rounded-lg shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-3 border-b border-purple-500/20 flex items-center justify-between">
              <h3 className="font-orbitron text-sm text-purple-200">Select Project</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-purple-500/20 rounded"
              >
                <X className="w-4 h-4 text-purple-400" />
              </button>
            </div>

            {/* Manual Input Toggle */}
            <div className="p-3 border-b border-purple-500/20">
              {showManualInput ? (
                <div className="flex gap-2">
                  <Input
                    value={manualPath}
                    onChange={(e) => setManualPath(e.target.value)}
                    placeholder="/path/to/your/project"
                    className="flex-1 bg-purple-900/20 border-purple-500/30 text-purple-100 font-mono text-sm"
                    onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                  />
                  <Button
                    size="sm"
                    onClick={handleManualSubmit}
                    className="bg-purple-600 hover:bg-purple-500"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowManualInput(false)}
                    className="border-purple-500/30"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowManualInput(true)}
                  className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Enter Path Manually
                </Button>
              )}
            </div>

            {/* Quick Paths & File Browser Toggle */}
            <div className="p-2 border-b border-purple-500/20">
              <p className="text-xs text-purple-400/60 px-2 mb-2">Quick Paths</p>
              <button
                onClick={() => handleSelectPath("/home/ubuntu")}
                className="w-full flex items-center gap-2 p-2 rounded hover:bg-purple-500/10 text-left"
              >
                <Home className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-purple-200">Home Directory</span>
                <span className="text-xs text-purple-400/50 font-mono ml-auto">/home/ubuntu</span>
              </button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFileBrowser(!showFileBrowser)}
                className="w-full mt-2 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"
              >
                <Folder className="w-4 h-4 mr-2" />
                {showFileBrowser ? 'Hide' : 'Browse'} File System
              </Button>
            </div>

            {/* Real File Browser */}
            {showFileBrowser && (
              <div className="p-2 border-b border-purple-500/20">
                {/* Breadcrumb */}
                <div className="flex items-center gap-1 text-xs mb-2 overflow-x-auto">
                  <button
                    onClick={() => { setBrowsePath('/home/ubuntu'); setSelectedPath(null); }}
                    className="text-cyan-400 hover:text-cyan-300"
                  >
                    <Home className="w-3 h-3" />
                  </button>
                  {dirData?.breadcrumbs.map((crumb, idx) => (
                    <span key={crumb.path} className="flex items-center">
                      <ChevronRight className="w-3 h-3 text-slate-500" />
                      <button
                        onClick={() => { setBrowsePath(crumb.path); setSelectedPath(null); }}
                        className={idx === (dirData?.breadcrumbs.length || 0) - 1 ? 'text-purple-300' : 'text-slate-400 hover:text-slate-200'}
                      >
                        {crumb.name}
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={() => refetchDir()}
                    className="ml-auto text-slate-400 hover:text-slate-200"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>

                {/* Directory Listing */}
                <ScrollArea className="h-48 border border-slate-700 rounded">
                  {dirLoading ? (
                    <div className="flex items-center justify-center h-full text-slate-500 text-sm">Loading...</div>
                  ) : (
                    <div className="p-1 space-y-0.5">
                      {dirData?.parentPath && (
                        <button
                          className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-slate-800 text-slate-400 text-sm"
                          onClick={() => { setBrowsePath(dirData.parentPath!); setSelectedPath(null); }}
                        >
                          <ArrowUp className="w-3 h-3" />
                          <span>..</span>
                        </button>
                      )}
                      {dirData?.entries.map((entry) => (
                        <button
                          key={entry.path}
                          className={`w-full flex items-center gap-2 p-1.5 rounded text-sm transition-colors ${
                            selectedPath === entry.path
                              ? 'bg-purple-500/20 border border-purple-500/50 text-purple-200'
                              : 'hover:bg-slate-800 text-slate-300'
                          }`}
                          onClick={() => setSelectedPath(entry.path === selectedPath ? null : entry.path)}
                          onDoubleClick={() => { setBrowsePath(entry.path); setSelectedPath(null); }}
                        >
                          <Folder className={`w-3 h-3 ${selectedPath === entry.path ? 'text-purple-400' : 'text-cyan-500'}`} />
                          <span className="flex-1 text-left truncate">{entry.name}</span>
                          {selectedPath === entry.path && <Check className="w-3 h-3 text-green-400" />}
                        </button>
                      ))}
                      {dirData?.entries.length === 0 && (
                        <div className="text-center text-slate-500 py-4 text-sm">No subdirectories</div>
                      )}
                    </div>
                  )}
                </ScrollArea>

                {/* Project Detection */}
                {projectInfo?.isProject && (
                  <div className="flex items-center gap-1 mt-2 p-1.5 bg-green-500/10 border border-green-500/30 rounded text-green-300 text-xs">
                    <Package className="w-3 h-3" />
                    <span>{projectInfo.projectType} project ({projectInfo.indicators.join(', ')})</span>
                  </div>
                )}

                {/* Select Button */}
                <Button
                  size="sm"
                  onClick={() => handleSelectPath(selectedPath || browsePath)}
                  className="w-full mt-2 bg-gradient-to-r from-purple-600 to-cyan-600"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Select: {(selectedPath || browsePath).split('/').pop()}
                </Button>
              </div>
            )}

            {/* Recent Projects */}
            <div className="max-h-64 overflow-y-auto">
              {recentProjects.length > 0 ? (
                <>
                  <p className="text-xs text-purple-400/60 px-4 py-2 sticky top-0 bg-[#1a1a2e]">
                    <Clock className="w-3 h-3 inline mr-1" />
                    Recent Projects
                  </p>
                  {recentProjects.map((project) => (
                    <div
                      key={project.path}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-purple-500/10 group"
                    >
                      <button
                        onClick={() => handleSelectPath(project.path)}
                        className="flex-1 flex items-center gap-2 text-left"
                      >
                        <FolderOpen className="w-4 h-4 text-purple-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-purple-200 truncate">{project.name}</p>
                          <p className="text-xs text-purple-400/50 font-mono truncate">{project.path}</p>
                        </div>
                        <span className="text-xs text-purple-400/40">
                          {formatTimeAgo(project.lastUsed)}
                        </span>
                      </button>
                      <button
                        onClick={() => removeFromRecent(project.path)}
                        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded transition-opacity"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                  ))}
                </>
              ) : (
                <div className="p-6 text-center">
                  <Folder className="w-10 h-10 text-purple-500/30 mx-auto mb-2" />
                  <p className="text-sm text-purple-400/60">No recent projects</p>
                  <p className="text-xs text-purple-400/40 mt-1">
                    Enter a path manually to get started
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DirectoryPicker;
