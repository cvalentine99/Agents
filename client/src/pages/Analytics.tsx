import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  TrendingUp,
  Clock,
  CheckCircle2,
  Activity,
  BarChart3,
  PieChart,
  Calendar,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

// Cyberpunk color palette
const COLORS = {
  primary: "#a855f7",
  secondary: "#06b6d4",
  success: "#22c55e",
  warning: "#f59e0b",
  error: "#ef4444",
  muted: "#6b7280",
};

const PIE_COLORS = ["#22c55e", "#f59e0b", "#a855f7", "#ef4444"];

export default function Analytics() {
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "all">(
    "30d"
  );
  const [modelFilter, setModelFilter] = useState<string>("all");

  // Fetch sessions data
  const { data: sessions, isLoading } = trpc.sessions.list.useQuery();

  // Process data for charts
  const analytics = useMemo(() => {
    if (!sessions) return null;

    // Filter by date range
    const now = new Date();
    const filteredSessions = sessions
      .filter(s => {
        if (dateRange === "all") return true;
        const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        return new Date(s.createdAt) >= cutoff;
      })
      .filter(s => {
        if (modelFilter === "all") return true;
        return s.selectedModel === modelFilter;
      });

    // Summary stats
    const totalSessions = filteredSessions.length;
    const completedSessions = filteredSessions.filter(
      s => s.status === "complete"
    ).length;
    const failedSessions = filteredSessions.filter(
      s => s.status === "failed"
    ).length;
    const successRate =
      totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;
    const avgIterations =
      totalSessions > 0
        ? filteredSessions.reduce(
            (sum, s) => sum + (s.currentIteration || 0),
            0
          ) / totalSessions
        : 0;

    // Calculate average duration (mock for now)
    const avgDuration =
      totalSessions > 0
        ? filteredSessions.reduce((sum, s) => {
            const start = new Date(s.createdAt).getTime();
            const end = s.updatedAt
              ? new Date(s.updatedAt).getTime()
              : Date.now();
            return sum + (end - start);
          }, 0) /
          totalSessions /
          1000 /
          60
        : 0; // in minutes

    // Iterations over time (group by day)
    const iterationsByDay = filteredSessions.reduce(
      (acc, s) => {
        const day = new Date(s.createdAt).toLocaleDateString();
        if (!acc[day]) acc[day] = { date: day, iterations: 0, sessions: 0 };
        acc[day].iterations += s.currentIteration || 0;
        acc[day].sessions += 1;
        return acc;
      },
      {} as Record<
        string,
        { date: string; iterations: number; sessions: number }
      >
    );

    const iterationTrends = Object.values(iterationsByDay).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Success rate by model
    const modelStats = filteredSessions.reduce(
      (acc, s) => {
        const model = s.selectedModel || "unknown";
        if (!acc[model])
          acc[model] = { model, total: 0, completed: 0, failed: 0 };
        acc[model].total += 1;
        if (s.status === "complete") acc[model].completed += 1;
        if (s.status === "failed") acc[model].failed += 1;
        return acc;
      },
      {} as Record<
        string,
        { model: string; total: number; completed: number; failed: number }
      >
    );

    const modelSuccessRates = Object.values(modelStats).map(m => ({
      model: m.model.charAt(0).toUpperCase() + m.model.slice(1),
      successRate: m.total > 0 ? (m.completed / m.total) * 100 : 0,
      total: m.total,
    }));

    // Status distribution
    const statusCounts = filteredSessions.reduce(
      (acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const statusDistribution = Object.entries(statusCounts).map(
      ([status, count]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: count,
      })
    );

    // Time to completion distribution (buckets)
    const durationBuckets = [
      { range: "< 1 min", count: 0 },
      { range: "1-5 min", count: 0 },
      { range: "5-15 min", count: 0 },
      { range: "15-30 min", count: 0 },
      { range: "> 30 min", count: 0 },
    ];

    filteredSessions.forEach(s => {
      const start = new Date(s.createdAt).getTime();
      const end = s.updatedAt ? new Date(s.updatedAt).getTime() : Date.now();
      const minutes = (end - start) / 1000 / 60;

      if (minutes < 1) durationBuckets[0].count++;
      else if (minutes < 5) durationBuckets[1].count++;
      else if (minutes < 15) durationBuckets[2].count++;
      else if (minutes < 30) durationBuckets[3].count++;
      else durationBuckets[4].count++;
    });

    return {
      totalSessions,
      completedSessions,
      failedSessions,
      successRate,
      avgIterations,
      avgDuration,
      iterationTrends,
      modelSuccessRates,
      statusDistribution,
      durationBuckets,
    };
  }, [sessions, dateRange, modelFilter]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 text-purple-500 animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-purple-500/20 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-purple-400 hover:text-purple-300"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white font-orbitron">
                  Session Analytics
                </h1>
                <p className="text-sm text-muted-foreground">
                  Performance metrics and insights
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                <Select
                  value={dateRange}
                  onValueChange={(v: typeof dateRange) => setDateRange(v)}
                >
                  <SelectTrigger className="w-32 bg-black/50 border-purple-500/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-purple-400" />
                <Select value={modelFilter} onValueChange={setModelFilter}>
                  <SelectTrigger className="w-32 bg-black/50 border-purple-500/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Models</SelectItem>
                    <SelectItem value="claude">Claude</SelectItem>
                    <SelectItem value="codex">Codex</SelectItem>
                    <SelectItem value="gemini">Gemini</SelectItem>
                    <SelectItem value="manus">Manus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-black/50 border-purple-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Sessions
                  </p>
                  <p className="text-3xl font-bold text-white font-orbitron">
                    {analytics?.totalSessions || 0}
                  </p>
                </div>
                <BarChart3 className="w-10 h-10 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-green-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-3xl font-bold text-green-400 font-orbitron">
                    {analytics?.successRate.toFixed(1) || 0}%
                  </p>
                </div>
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-cyan-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Avg Iterations
                  </p>
                  <p className="text-3xl font-bold text-cyan-400 font-orbitron">
                    {analytics?.avgIterations.toFixed(1) || 0}
                  </p>
                </div>
                <TrendingUp className="w-10 h-10 text-cyan-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-yellow-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Duration</p>
                  <p className="text-3xl font-bold text-yellow-400 font-orbitron">
                    {analytics?.avgDuration.toFixed(1) || 0}m
                  </p>
                </div>
                <Clock className="w-10 h-10 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Iteration Trends */}
          <Card className="bg-black/50 border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-white font-orbitron flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-400" />
                Iteration Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics?.iterationTrends || []}>
                    <defs>
                      <linearGradient
                        id="iterationGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={COLORS.primary}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={COLORS.primary}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="date" stroke="#666" fontSize={12} />
                    <YAxis stroke="#666" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1a1a2e",
                        border: "1px solid #a855f7",
                        borderRadius: "8px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="iterations"
                      stroke={COLORS.primary}
                      fill="url(#iterationGradient)"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="sessions"
                      stroke={COLORS.secondary}
                      strokeWidth={2}
                      dot={{ fill: COLORS.secondary }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-muted-foreground">Iterations</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-cyan-500" />
                  <span className="text-muted-foreground">Sessions</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Success Rate by Model */}
          <Card className="bg-black/50 border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-white font-orbitron flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-400" />
                Success Rate by Model
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.modelSuccessRates || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="model" stroke="#666" fontSize={12} />
                    <YAxis stroke="#666" fontSize={12} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1a1a2e",
                        border: "1px solid #a855f7",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [
                        `${value.toFixed(1)}%`,
                        "Success Rate",
                      ]}
                    />
                    <Bar
                      dataKey="successRate"
                      fill={COLORS.success}
                      radius={[4, 4, 0, 0]}
                    >
                      {(analytics?.modelSuccessRates || []).map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            index % 2 === 0 ? COLORS.primary : COLORS.secondary
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Distribution */}
          <Card className="bg-black/50 border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-white font-orbitron flex items-center gap-2">
                <PieChart className="w-5 h-5 text-purple-400" />
                Session Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={analytics?.statusDistribution || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {(analytics?.statusDistribution || []).map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1a1a2e",
                        border: "1px solid #a855f7",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Time to Completion */}
          <Card className="bg-black/50 border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-white font-orbitron flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-400" />
                Time to Completion Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.durationBuckets || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="range" stroke="#666" fontSize={12} />
                    <YAxis stroke="#666" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1a1a2e",
                        border: "1px solid #a855f7",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill={COLORS.secondary}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* No Data State */}
        {analytics?.totalSessions === 0 && (
          <div className="text-center py-12">
            <Activity className="w-16 h-16 text-purple-500/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No Session Data
            </h3>
            <p className="text-muted-foreground mb-4">
              Start some RALPH loops to see analytics here
            </p>
            <Link href="/dashboard">
              <Button className="bg-purple-600 hover:bg-purple-700">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
