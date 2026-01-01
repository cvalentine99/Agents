import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  Gauge,
  Zap,
  Shield,
  GitBranch,
  Wand2,
  Activity,
  ChevronRight,
  Play,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

const features = [
  {
    icon: <Gauge className="w-8 h-8" />,
    title: "Circular Model Wheel",
    description:
      "Spin to select from Codex, Claude, Gemini, or Manus with smooth animations",
    color: "var(--cyber-cyan)",
  },
  {
    icon: <Activity className="w-8 h-8" />,
    title: "RALPH Loop+ Flight Computer",
    description:
      "Real-time telemetry dashboard with completion promise tracking",
    color: "var(--cyber-purple)",
  },
  {
    icon: <Wand2 className="w-8 h-8" />,
    title: "Power Promptor",
    description:
      "Dyslexia-friendly 4-field form with voice input and auto-expansion",
    color: "var(--cyber-magenta)",
  },
  {
    icon: <Shield className="w-8 h-8" />,
    title: "Circuit Breaker",
    description:
      "Visual state machine with stuck detection and one-click reset",
    color: "var(--status-success)",
  },
  {
    icon: <GitBranch className="w-8 h-8" />,
    title: "Assembly Line",
    description: "Multi-agent pipeline: Spec → Implement → Review → Verify",
    color: "var(--cyber-yellow)",
  },
  {
    icon: <Zap className="w-8 h-8" />,
    title: "Diff-First UX",
    description: "Hunk-level approval, patch preview, and safe rollback",
    color: "var(--status-error)",
  },
];

export default function Home() {
  const { user, loading: _loading } = useAuth();

  return (
    <div className="min-h-screen bg-[var(--bg-void)] overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(var(--cyber-purple) 1px, transparent 1px),
              linear-gradient(90deg, var(--cyber-purple) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
          }}
        />
        {/* Radial Glow */}
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, var(--cyber-purple) 0%, transparent 70%)",
            opacity: 0.15,
            filter: "blur(100px)",
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-[var(--color-border)] bg-[var(--bg-void)]/80 backdrop-blur-md">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--cyber-purple)] to-[var(--cyber-cyan)] flex items-center justify-center">
              <Gauge className="w-6 h-6 text-white" />
            </div>
            <span className="font-cyber text-xl font-bold neon-text-purple">
              AGENTS BY VALENTINE RF
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <a
              href="#how-it-works"
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              How It Works
            </a>
            <a
              href="#features"
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Features
            </a>
            <a
              href="#about"
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              About
            </a>
            {user ? (
              <Link href="/dashboard">
                <Button className="cyber-btn">
                  Dashboard
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            ) : (
              <a href={getLoginUrl()}>
                <Button className="cyber-btn">
                  Sign In
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </a>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 py-20 lg:py-32">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--cyber-purple)]/20 border border-[var(--cyber-purple)]/50 mb-8"
            >
              <Star className="w-4 h-4 text-[var(--cyber-yellow)]" />
              <span className="text-sm font-mono text-[var(--cyber-purple)]">
                RALPH Loop+ Powered
              </span>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-cyber text-4xl md:text-6xl lg:text-7xl font-bold mb-6"
            >
              <span className="neon-text-purple">AGENTS</span>{" "}
              <span className="neon-text-cyan">BY VALENTINE RF</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl md:text-2xl text-[var(--text-secondary)] mb-8 max-w-2xl mx-auto"
            >
              Your AI-powered software development partner.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link href="/dashboard">
                <Button className="cyber-btn text-lg px-8 py-6">
                  <Play className="w-5 h-5 mr-2" />
                  Launch Dashboard
                </Button>
              </Link>
              <a href="#features">
                <Button
                  variant="outline"
                  className="text-lg px-8 py-6 border-[var(--cyber-purple)] text-[var(--cyber-purple)] hover:bg-[var(--cyber-purple)]/10"
                >
                  Explore Features
                </Button>
              </a>
            </motion.div>
          </div>

          {/* Hero Visual - Spinning Wheel Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-16 relative max-w-3xl mx-auto"
          >
            <div className="aspect-video rounded-xl overflow-hidden cyber-border bg-[var(--bg-deep)]">
              {/* Placeholder for wheel animation */}
              <div className="w-full h-full flex items-center justify-center relative">
                {/* Animated rings */}
                <motion.div
                  className="absolute w-64 h-64 rounded-full border-2 border-[var(--cyber-purple)]/30"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
                <motion.div
                  className="absolute w-48 h-48 rounded-full border-2 border-[var(--cyber-cyan)]/30"
                  animate={{ rotate: -360 }}
                  transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
                <motion.div
                  className="absolute w-32 h-32 rounded-full border-2 border-[var(--cyber-magenta)]/30"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />

                {/* Center */}
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--cyber-purple)] to-[var(--cyber-cyan)] flex items-center justify-center z-10">
                  <Gauge className="w-10 h-10 text-white" />
                </div>

                {/* Model Labels */}
                <motion.div
                  className="absolute top-8 font-cyber text-sm text-[var(--cyber-cyan)]"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  CODEX
                </motion.div>
                <motion.div
                  className="absolute right-8 font-cyber text-sm text-[var(--cyber-magenta)]"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                >
                  CLAUDE
                </motion.div>
                <motion.div
                  className="absolute bottom-8 font-cyber text-sm text-[var(--cyber-purple)]"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                >
                  GEMINI
                </motion.div>
                <motion.div
                  className="absolute left-8 font-cyber text-sm text-[var(--cyber-yellow)]"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}
                >
                  MANUS
                </motion.div>
              </div>
            </div>

            {/* Glow effect */}
            <div
              className="absolute inset-0 -z-10 blur-3xl opacity-30"
              style={{
                background:
                  "linear-gradient(135deg, var(--cyber-purple) 0%, var(--cyber-cyan) 100%)",
              }}
            />
          </motion.div>
        </div>
      </section>

      {/* How It Works - Multi-Agent Workflow Section */}
      <section id="how-it-works" className="relative z-10 py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-cyber text-3xl md:text-4xl font-bold mb-4"
            >
              <span className="neon-text-purple">MULTI-AGENT</span> WORKFLOW
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              viewport={{ once: true }}
              className="text-[var(--text-muted)] max-w-2xl mx-auto"
            >
              Orchestrate multiple AI models working together in a seamless
              pipeline
            </motion.p>
          </div>

          {/* Workflow Diagram */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-5xl mx-auto mb-16"
          >
            <div className="cyber-card p-8">
              {/* Pipeline Flow */}
              <div className="flex flex-col lg:flex-row items-center justify-between gap-4 lg:gap-2">
                {/* Stage 1: Spec Agent */}
                <div className="flex flex-col items-center text-center p-4 flex-1">
                  <div className="w-16 h-16 rounded-full bg-[var(--cyber-cyan)]/20 border-2 border-[var(--cyber-cyan)] flex items-center justify-center mb-3">
                    <Wand2 className="w-8 h-8 text-[var(--cyber-cyan)]" />
                  </div>
                  <h4 className="font-cyber text-sm font-bold text-[var(--cyber-cyan)] mb-1">
                    SPEC AGENT
                  </h4>
                  <p className="text-xs text-[var(--text-muted)]">
                    Analyzes requirements & creates specifications
                  </p>
                </div>

                {/* Arrow */}
                <div className="hidden lg:block text-[var(--cyber-purple)]">
                  <ChevronRight className="w-8 h-8" />
                </div>
                <div className="lg:hidden text-[var(--cyber-purple)] rotate-90">
                  <ChevronRight className="w-8 h-8" />
                </div>

                {/* Stage 2: Implementer */}
                <div className="flex flex-col items-center text-center p-4 flex-1">
                  <div className="w-16 h-16 rounded-full bg-[var(--cyber-magenta)]/20 border-2 border-[var(--cyber-magenta)] flex items-center justify-center mb-3">
                    <Zap className="w-8 h-8 text-[var(--cyber-magenta)]" />
                  </div>
                  <h4 className="font-cyber text-sm font-bold text-[var(--cyber-magenta)] mb-1">
                    IMPLEMENTER
                  </h4>
                  <p className="text-xs text-[var(--text-muted)]">
                    Writes code based on specifications
                  </p>
                </div>

                {/* Arrow */}
                <div className="hidden lg:block text-[var(--cyber-purple)]">
                  <ChevronRight className="w-8 h-8" />
                </div>
                <div className="lg:hidden text-[var(--cyber-purple)] rotate-90">
                  <ChevronRight className="w-8 h-8" />
                </div>

                {/* Stage 3: Reviewer */}
                <div className="flex flex-col items-center text-center p-4 flex-1">
                  <div className="w-16 h-16 rounded-full bg-[var(--cyber-yellow)]/20 border-2 border-[var(--cyber-yellow)] flex items-center justify-center mb-3">
                    <GitBranch className="w-8 h-8 text-[var(--cyber-yellow)]" />
                  </div>
                  <h4 className="font-cyber text-sm font-bold text-[var(--cyber-yellow)] mb-1">
                    REVIEWER
                  </h4>
                  <p className="text-xs text-[var(--text-muted)]">
                    Reviews code quality & suggests improvements
                  </p>
                </div>

                {/* Arrow */}
                <div className="hidden lg:block text-[var(--cyber-purple)]">
                  <ChevronRight className="w-8 h-8" />
                </div>
                <div className="lg:hidden text-[var(--cyber-purple)] rotate-90">
                  <ChevronRight className="w-8 h-8" />
                </div>

                {/* Stage 4: Verifier */}
                <div className="flex flex-col items-center text-center p-4 flex-1">
                  <div className="w-16 h-16 rounded-full bg-[var(--status-success)]/20 border-2 border-[var(--status-success)] flex items-center justify-center mb-3">
                    <Shield className="w-8 h-8 text-[var(--status-success)]" />
                  </div>
                  <h4 className="font-cyber text-sm font-bold text-[var(--status-success)] mb-1">
                    VERIFIER
                  </h4>
                  <p className="text-xs text-[var(--text-muted)]">
                    Runs tests & validates completion
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* AI Models Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {/* Codex */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              viewport={{ once: true }}
              className="cyber-card p-6 text-center hover:border-[var(--cyber-cyan)]/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-[var(--cyber-cyan)]/20 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-[var(--cyber-cyan)]" />
              </div>
              <h4 className="font-cyber text-lg font-bold text-[var(--cyber-cyan)] mb-2">
                CODEX
              </h4>
              <p className="text-sm text-[var(--text-muted)]">
                OpenAI's code-specialized model for rapid code generation and
                completion
              </p>
            </motion.div>

            {/* Claude */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              viewport={{ once: true }}
              className="cyber-card p-6 text-center hover:border-[var(--cyber-magenta)]/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-[var(--cyber-magenta)]/20 flex items-center justify-center mx-auto mb-4">
                <Activity className="w-6 h-6 text-[var(--cyber-magenta)]" />
              </div>
              <h4 className="font-cyber text-lg font-bold text-[var(--cyber-magenta)] mb-2">
                CLAUDE
              </h4>
              <p className="text-sm text-[var(--text-muted)]">
                Anthropic's assistant excelling at reasoning, analysis, and safe
                code practices
              </p>
            </motion.div>

            {/* Gemini */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              viewport={{ once: true }}
              className="cyber-card p-6 text-center hover:border-[var(--cyber-purple)]/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-[var(--cyber-purple)]/20 flex items-center justify-center mx-auto mb-4">
                <Star className="w-6 h-6 text-[var(--cyber-purple)]" />
              </div>
              <h4 className="font-cyber text-lg font-bold text-[var(--cyber-purple)] mb-2">
                GEMINI
              </h4>
              <p className="text-sm text-[var(--text-muted)]">
                Google's multimodal AI with strong context understanding and
                code analysis
              </p>
            </motion.div>

            {/* Manus */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              viewport={{ once: true }}
              className="cyber-card p-6 text-center hover:border-[var(--cyber-yellow)]/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-[var(--cyber-yellow)]/20 flex items-center justify-center mx-auto mb-4">
                <Gauge className="w-6 h-6 text-[var(--cyber-yellow)]" />
              </div>
              <h4 className="font-cyber text-lg font-bold text-[var(--cyber-yellow)] mb-2">
                MANUS
              </h4>
              <p className="text-sm text-[var(--text-muted)]">
                Integrated AI agent for autonomous task execution and workflow
                automation
              </p>
            </motion.div>
          </div>

          {/* Key Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 max-w-4xl mx-auto"
          >
            <div className="cyber-glass p-8 rounded-xl">
              <h3 className="font-cyber text-xl font-bold text-center mb-6 neon-text-purple">
                HOW IT WORKS
              </h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-cyber font-bold text-[var(--cyber-cyan)] mb-2">
                    1
                  </div>
                  <h4 className="font-semibold text-[var(--text-primary)] mb-2">
                    Select Your Model
                  </h4>
                  <p className="text-sm text-[var(--text-muted)]">
                    Spin the wheel or manually choose the AI model best suited
                    for your task
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-cyber font-bold text-[var(--cyber-magenta)] mb-2">
                    2
                  </div>
                  <h4 className="font-semibold text-[var(--text-primary)] mb-2">
                    Define Your Promise
                  </h4>
                  <p className="text-sm text-[var(--text-muted)]">
                    Set completion criteria that the agent must fulfill before
                    exiting
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-cyber font-bold text-[var(--status-success)] mb-2">
                    3
                  </div>
                  <h4 className="font-semibold text-[var(--text-primary)] mb-2">
                    Watch It Work
                  </h4>
                  <p className="text-sm text-[var(--text-muted)]">
                    The RALPH Loop ensures your agent keeps working until all
                    criteria are met
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="relative z-10 py-20 bg-[var(--bg-deep)]"
      >
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-cyber text-3xl md:text-4xl font-bold mb-4">
              <span className="neon-text-purple">NEXT-GEN</span> FEATURES
            </h2>
            <p className="text-[var(--text-muted)] max-w-2xl mx-auto">
              Everything you need to orchestrate autonomous coding loops with
              multiple AI models
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="cyber-card p-6 hover:border-[var(--cyber-purple)]/50 transition-colors group"
              >
                <div
                  className="w-14 h-14 rounded-lg flex items-center justify-center mb-4 transition-all group-hover:scale-110"
                  style={{
                    backgroundColor: `${feature.color}20`,
                    color: feature.color,
                  }}
                >
                  {feature.icon}
                </div>
                <h3 className="font-cyber text-lg font-bold mb-2 text-[var(--text-primary)]">
                  {feature.title}
                </h3>
                <p className="text-sm text-[var(--text-muted)]">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="relative z-10 py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-cyber text-3xl md:text-4xl font-bold mb-6">
              POWERED BY <span className="neon-text-cyan">RALPH LOOP+</span>
            </h2>
            <p className="text-[var(--text-secondary)] mb-8">
              RALPH (Recursive Agent Loop with Promise Handling) is a framework
              that creates persistent feedback loops for AI coding agents. The
              stop hook intercepts exit attempts and checks your completion
              promise—if the criteria aren't met, the loop continues until the
              job is done.
            </p>
            <div className="cyber-glass p-6 rounded-lg text-left font-mono text-sm">
              <pre className="text-[var(--text-secondary)] overflow-x-auto">
                {`# The RALPH Loop Flow
┌─────────────────────────────────────────┐
│  Claude tries to exit                   │
│           ↓                             │
│  Stop Hook intercepts                   │
│           ↓                             │
│  Check COMPLETION_PROMISE.md            │
│           ↓                             │
│  ┌───────────────────────────────────┐  │
│  │ All [x] checked?  →  Allow exit ✅ │  │
│  │ Items still [ ]?  →  Continue ❌   │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[var(--color-border)] py-8">
        <div className="container mx-auto px-6 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            Built with <span className="text-[var(--cyber-purple)]">♥</span>{" "}
            using RALPH Loop+ Framework
          </p>
        </div>
      </footer>
    </div>
  );
}
