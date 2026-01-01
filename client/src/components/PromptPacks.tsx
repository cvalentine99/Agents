import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Package, 
  Check, 
  Copy,
  ChevronDown,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PromptPack {
  id: string;
  name: string;
  stack: string[];
  description: string;
  acceptanceGates: string[];
  promptTemplate: string;
  color: string;
}

const promptPacks: PromptPack[] = [
  {
    id: "react-tailwind",
    name: "React + Tailwind + Vite",
    stack: ["React 18", "Tailwind CSS", "Vite", "TypeScript"],
    description: "Modern frontend development with component-based architecture",
    acceptanceGates: [
      "TypeScript compiles without errors",
      "All components render without console errors",
      "Tailwind classes are valid",
      "Vite build succeeds",
      "No accessibility violations (axe-core)",
    ],
    promptTemplate: `Stack: React 18 + Tailwind CSS + Vite + TypeScript

Acceptance Gates (ALL must pass):
- [ ] TypeScript compiles: \`pnpm tsc --noEmit\`
- [ ] Build succeeds: \`pnpm build\`
- [ ] No console errors in browser
- [ ] Components are accessible (semantic HTML, ARIA)

Conventions:
- Use functional components with hooks
- Prefer Tailwind utilities over custom CSS
- Use TypeScript strict mode
- Follow React best practices (no direct DOM manipulation)`,
    color: "var(--cyber-cyan)",
  },
  {
    id: "fastapi-pytest",
    name: "FastAPI + Pydantic + pytest",
    stack: ["FastAPI", "Pydantic", "pytest", "Python 3.11+"],
    description: "High-performance Python API with type validation",
    acceptanceGates: [
      "All pytest tests pass",
      "Pydantic models validate correctly",
      "mypy type checks pass",
      "ruff linting passes",
      "API endpoints return correct status codes",
    ],
    promptTemplate: `Stack: FastAPI + Pydantic v2 + pytest + Python 3.11+

Acceptance Gates (ALL must pass):
- [ ] Tests pass: \`pytest -v\`
- [ ] Type check: \`mypy .\`
- [ ] Lint: \`ruff check .\`
- [ ] API docs generate: \`/docs\` endpoint works

Conventions:
- Use Pydantic v2 models for all request/response schemas
- Async endpoints where appropriate
- Dependency injection for services
- Comprehensive docstrings`,
    color: "var(--cyber-purple)",
  },
  {
    id: "rust-axum",
    name: "Rust + Axum + Tokio",
    stack: ["Rust", "Axum", "Tokio", "SQLx"],
    description: "Blazing fast async web services in Rust",
    acceptanceGates: [
      "cargo build --release succeeds",
      "cargo test passes",
      "cargo clippy has no warnings",
      "No unsafe code without justification",
      "All endpoints handle errors gracefully",
    ],
    promptTemplate: `Stack: Rust + Axum + Tokio + SQLx

Acceptance Gates (ALL must pass):
- [ ] Build: \`cargo build --release\`
- [ ] Tests: \`cargo test\`
- [ ] Lint: \`cargo clippy -- -D warnings\`
- [ ] Format: \`cargo fmt --check\`

Conventions:
- Use Result<T, E> for error handling
- Async/await with Tokio runtime
- Strong typing with custom error types
- Document public APIs with rustdoc`,
    color: "var(--cyber-magenta)",
  },
  {
    id: "node-express",
    name: "Node.js + Express + Prisma",
    stack: ["Node.js", "Express", "Prisma", "TypeScript"],
    description: "Backend API with ORM and type safety",
    acceptanceGates: [
      "TypeScript compiles",
      "All Jest tests pass",
      "Prisma schema is valid",
      "ESLint passes",
      "API responds to health check",
    ],
    promptTemplate: `Stack: Node.js + Express + Prisma + TypeScript

Acceptance Gates (ALL must pass):
- [ ] Build: \`pnpm build\`
- [ ] Tests: \`pnpm test\`
- [ ] Lint: \`pnpm lint\`
- [ ] Prisma: \`pnpm prisma validate\`

Conventions:
- Use async/await for all async operations
- Validate inputs with zod
- Use Prisma for all database operations
- Structured error handling with custom error classes`,
    color: "var(--status-success)",
  },
  {
    id: "python-ml",
    name: "Python + PyTorch + MLflow",
    stack: ["Python", "PyTorch", "MLflow", "pandas"],
    description: "Machine learning pipeline with experiment tracking",
    acceptanceGates: [
      "Model trains without errors",
      "Metrics are logged to MLflow",
      "Data pipeline is reproducible",
      "Model can be serialized/loaded",
      "Unit tests pass",
    ],
    promptTemplate: `Stack: Python + PyTorch + MLflow + pandas

Acceptance Gates (ALL must pass):
- [ ] Training completes: \`python train.py\`
- [ ] Tests: \`pytest tests/\`
- [ ] Type check: \`mypy .\`
- [ ] MLflow tracking works

Conventions:
- Use dataclasses for configuration
- Log all hyperparameters to MLflow
- Reproducible with random seeds
- Document model architecture`,
    color: "var(--cyber-yellow)",
  },
  {
    id: "go-gin",
    name: "Go + Gin + GORM",
    stack: ["Go", "Gin", "GORM", "PostgreSQL"],
    description: "High-performance Go web service with ORM",
    acceptanceGates: [
      "go build succeeds",
      "go test ./... passes",
      "golangci-lint passes",
      "No race conditions (go test -race)",
      "API handles concurrent requests",
    ],
    promptTemplate: `Stack: Go + Gin + GORM + PostgreSQL

Acceptance Gates (ALL must pass):
- [ ] Build: \`go build ./...\`
- [ ] Tests: \`go test ./...\`
- [ ] Race: \`go test -race ./...\`
- [ ] Lint: \`golangci-lint run\`

Conventions:
- Use context for cancellation
- Structured logging with slog
- Dependency injection pattern
- Graceful shutdown handling`,
    color: "var(--status-info)",
  },
];

interface PromptPacksProps {
  onSelectPack: (pack: PromptPack) => void;
  selectedPackId?: string;
}

export function PromptPacks({ onSelectPack, selectedPackId }: PromptPacksProps) {
  const [expandedPack, setExpandedPack] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyTemplate = async (pack: PromptPack) => {
    await navigator.clipboard.writeText(pack.promptTemplate);
    setCopiedId(pack.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="cyber-card p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-cyber text-xl font-bold neon-text-purple">
          KNOWN-GOOD PROMPT PACKS
        </h2>
        <span className="text-xs font-mono text-[var(--text-muted)]">
          {promptPacks.length} stacks available
        </span>
      </div>

      {/* Pack Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {promptPacks.map((pack) => {
          const isSelected = selectedPackId === pack.id;
          const isExpanded = expandedPack === pack.id;

          return (
            <motion.div
              key={pack.id}
              className={`cyber-glass rounded overflow-hidden ${
                isSelected ? "cyber-border" : ""
              }`}
              style={{
                borderColor: isSelected ? pack.color : undefined,
              }}
              whileHover={{ scale: 1.02 }}
            >
              {/* Pack Header */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5" style={{ color: pack.color }} />
                    <h3 
                      className="font-cyber text-sm font-bold"
                      style={{ color: pack.color }}
                    >
                      {pack.name}
                    </h3>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4" style={{ color: pack.color }} />
                  )}
                </div>

                <p className="text-xs text-[var(--text-muted)] mb-3">
                  {pack.description}
                </p>

                {/* Stack Tags */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {pack.stack.map((tech) => (
                    <span
                      key={tech}
                      className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-void)] text-[var(--text-secondary)]"
                    >
                      {tech}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    style={{ color: pack.color }}
                    onClick={() => onSelectPack(pack)}
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    Use Pack
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => copyTemplate(pack)}
                  >
                    {copiedId === pack.id ? (
                      <Check className="w-3 h-3 text-[var(--status-success)]" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => setExpandedPack(isExpanded ? null : pack.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-[var(--color-border)]"
                >
                  {/* Acceptance Gates */}
                  <div className="p-4 bg-[var(--bg-void)]">
                    <span className="text-xs font-cyber uppercase tracking-wider text-[var(--text-muted)] block mb-2">
                      Acceptance Gates
                    </span>
                    <div className="space-y-1">
                      {pack.acceptanceGates.map((gate, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs">
                          <div 
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: pack.color }}
                          />
                          <span className="text-[var(--text-secondary)]">{gate}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Template Preview */}
                  <div className="p-4">
                    <span className="text-xs font-cyber uppercase tracking-wider text-[var(--text-muted)] block mb-2">
                      Template Preview
                    </span>
                    <pre className="text-[10px] font-mono text-[var(--text-secondary)] bg-[var(--bg-void)] p-2 rounded max-h-32 overflow-auto whitespace-pre-wrap">
                      {pack.promptTemplate}
                    </pre>
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export { promptPacks };
export type { PromptPack };
