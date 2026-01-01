import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mic, 
  MicOff, 
  Wand2, 
  Copy, 
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Target,
  FileCode,
  Ban,
  CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { ModelType } from "./ModelWheel";

interface PromptSpec {
  goal: string;
  context: string;
  doneWhen: string;
  doNot: string;
}

interface PowerPromptorProps {
  selectedModel: ModelType;
  onGeneratePrompt: (prompt: string, completionPromise: string) => void;
}

export function PowerPromptor({ selectedModel, onGeneratePrompt }: PowerPromptorProps) {
  const [spec, setSpec] = useState<PromptSpec>({
    goal: "",
    context: "",
    doneWhen: "",
    doNot: "",
  });
  const [isRecording, setIsRecording] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scopeSize, setScopeSize] = useState([3]); // 1-5 scale
  const [confidenceGate, setConfidenceGate] = useState(true);
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [generatedPromise, setGeneratedPromise] = useState("");
  const [copied, setCopied] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);

  const scopeLabels = ["1 file", "5 files", "Module", "Package", "Whole repo"];

  const handleVoiceInput = () => {
    // Placeholder for voice input - would integrate with Web Speech API
    setIsRecording(!isRecording);
  };

  const expandToPrompt = () => {
    setIsExpanding(true);
    
    // Simulate expansion delay
    setTimeout(() => {
      const modelPrompt = generateModelOptimizedPrompt(spec, selectedModel, scopeSize[0], confidenceGate);
      const promise = generateCompletionPromise(spec);
      
      setGeneratedPrompt(modelPrompt);
      setGeneratedPromise(promise);
      setIsExpanding(false);
      
      onGeneratePrompt(modelPrompt, promise);
    }, 1000);
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="cyber-card p-6 space-y-6" data-tour="power-promptor">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-cyber text-xl font-bold neon-text-cyan">
          POWER PROMPTOR
        </h2>
        <span className="text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-surface)] px-2 py-1 rounded">
          Dyslexia-Friendly Mode
        </span>
      </div>

      {/* 4-Field Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Goal */}
        <PromptField
          icon={<Target className="w-5 h-5" />}
          label="Goal"
          placeholder="What do you want to build or fix?"
          value={spec.goal}
          onChange={(value) => setSpec({ ...spec, goal: value })}
          color="var(--cyber-cyan)"
          onVoice={handleVoiceInput}
          isRecording={isRecording}
        />

        {/* Context */}
        <PromptField
          icon={<FileCode className="w-5 h-5" />}
          label="Context"
          placeholder="Stack, files, constraints..."
          value={spec.context}
          onChange={(value) => setSpec({ ...spec, context: value })}
          color="var(--cyber-purple)"
        />

        {/* Done When */}
        <PromptField
          icon={<CheckCircle className="w-5 h-5" />}
          label="Done When"
          placeholder="Tests pass, builds, specific output..."
          value={spec.doneWhen}
          onChange={(value) => setSpec({ ...spec, doneWhen: value })}
          color="var(--status-success)"
        />

        {/* Do Not */}
        <PromptField
          icon={<Ban className="w-5 h-5" />}
          label="Do Not"
          placeholder="Things to avoid..."
          value={spec.doNot}
          onChange={(value) => setSpec({ ...spec, doNot: value })}
          color="var(--status-error)"
        />
      </div>

      {/* Advanced Options */}
      <div>
        <button
          className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Advanced Options
        </button>
        
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 p-4 cyber-glass rounded">
                {/* Scope Slider */}
                <div className="space-y-3">
                  <Label className="text-xs font-cyber uppercase tracking-wider">
                    Scope: {scopeLabels[scopeSize[0] - 1]}
                  </Label>
                  <Slider
                    value={scopeSize}
                    onValueChange={setScopeSize}
                    min={1}
                    max={5}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                    <span>Narrow</span>
                    <span>Wide</span>
                  </div>
                </div>

                {/* Confidence Gate */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-cyber uppercase tracking-wider">
                      Confidence Gate
                    </Label>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Ask before guessing
                    </p>
                  </div>
                  <Switch
                    checked={confidenceGate}
                    onCheckedChange={setConfidenceGate}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Expand Button */}
      <div className="flex justify-center">
        <Button
          className="cyber-btn px-8"
          onClick={expandToPrompt}
          disabled={!spec.goal || isExpanding}
        >
          {isExpanding ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-5 h-5 mr-2" />
              </motion.div>
              Expanding...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5 mr-2" />
              Expand to {selectedModel.charAt(0).toUpperCase() + selectedModel.slice(1)} Prompt
            </>
          )}
        </Button>
      </div>

      {/* Generated Output */}
      <AnimatePresence>
        {generatedPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Generated Prompt */}
            <div className="cyber-glass rounded p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-cyber uppercase tracking-wider text-[var(--cyber-cyan)]">
                  Generated Prompt
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyToClipboard}
                  className="text-xs"
                >
                  {copied ? (
                    <Check className="w-4 h-4 mr-1 text-[var(--status-success)]" />
                  ) : (
                    <Copy className="w-4 h-4 mr-1" />
                  )}
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
              <pre className="text-sm font-mono text-[var(--text-secondary)] whitespace-pre-wrap bg-[var(--bg-void)] p-3 rounded max-h-48 overflow-auto">
                {generatedPrompt}
              </pre>
            </div>

            {/* Completion Promise */}
            <div className="cyber-glass rounded p-4">
              <span className="text-xs font-cyber uppercase tracking-wider text-[var(--status-success)] block mb-2">
                Completion Promise (RALPH)
              </span>
              <pre className="text-sm font-mono text-[var(--text-secondary)] whitespace-pre-wrap bg-[var(--bg-void)] p-3 rounded">
                {generatedPromise}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface PromptFieldProps {
  icon: React.ReactNode;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  color: string;
  onVoice?: () => void;
  isRecording?: boolean;
}

function PromptField({ 
  icon, 
  label, 
  placeholder, 
  value, 
  onChange, 
  color,
  onVoice,
  isRecording 
}: PromptFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div style={{ color }}>{icon}</div>
        <Label className="text-sm font-cyber uppercase tracking-wider" style={{ color }}>
          {label}
        </Label>
        {onVoice && (
          <button
            onClick={onVoice}
            className={`ml-auto p-1.5 rounded transition-colors ${
              isRecording 
                ? "bg-[var(--status-error)]/20 text-[var(--status-error)]" 
                : "hover:bg-[var(--bg-surface)]"
            }`}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        )}
      </div>
      <Textarea
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[80px] text-base bg-[var(--bg-surface)] border-[var(--color-border)] focus:border-[var(--cyber-purple)] resize-none"
        style={{ 
          fontSize: "16px", // Larger text for dyslexia-friendly
          lineHeight: "1.6",
        }}
      />
    </div>
  );
}

// Helper functions to generate prompts
function generateModelOptimizedPrompt(
  spec: PromptSpec, 
  model: ModelType, 
  scope: number,
  confidenceGate: boolean
): string {
  const scopeText = ["1 file", "up to 5 files", "a module", "a package", "the whole repo"][scope - 1];
  
  const baseSpec = `Goal: ${spec.goal}

Context: ${spec.context}

Done when: ${spec.doneWhen}

Do not: ${spec.doNot}`;

  if (model === "gemini") {
    return `You are a senior software engineer. Follow this workflow strictly:
1) Parse the Job Spec below into a structured plan.
2) Propose the smallest safe change that satisfies "Done when".
3) List the exact files you will edit and commands you will run.
4) Execute by producing a patch-style diff.
5) Verification: explain how the change meets "Done when".

Rules:
${confidenceGate ? "- If any requirement is ambiguous, ask ONE clarifying question and stop." : ""}
- Do not propose broad refactors unless required by the spec.
- Keep changes minimal and reversible.
- Scope: ${scopeText}
- Output format:
  A) PLAN (bullets)
  B) FILES (list)
  C) COMMANDS (list)
  D) DIFF (unified diff)
  E) VERIFY (bullets)

JOB SPEC:
${baseSpec}`;
  }

  if (model === "codex") {
    return `Act as a coding agent working in an existing repo.

Objective:
${spec.goal}

Constraints:
- Keep changes minimal.
- Do not change system-wide settings.
${confidenceGate ? "- If unsure, ask one question and stop." : ""}
- Scope: ${scopeText}

Acceptance Criteria (must satisfy all):
${spec.doneWhen.split("\n").map((line, i) => `${i + 1}) ${line}`).join("\n")}

Forbidden:
${spec.doNot}

Deliverable:
- Produce a unified diff patch only (no prose).
- If tests are required, include commands as comments at the top of the diff.

Context:
${spec.context}`;
  }

  if (model === "claude") {
    return `<task>
${spec.goal}
</task>

<context>
${spec.context}
</context>

<success_criteria>
${spec.doneWhen}
</success_criteria>

<constraints>
- Scope: ${scopeText}
- ${spec.doNot}
${confidenceGate ? "- If anything is unclear, ask for clarification before proceeding." : ""}
</constraints>

Please approach this systematically:
1. Analyze the requirements
2. Plan the implementation
3. Execute with minimal changes
4. Verify against success criteria`;
  }

  // Manus / default
  return `# Task Specification

## Goal
${spec.goal}

## Context
${spec.context}

## Success Criteria
${spec.doneWhen}

## Constraints
- Scope: ${scopeText}
- ${spec.doNot}
${confidenceGate ? "- Ask before making assumptions" : ""}

## Execution Mode
Autonomous loop with RALPH completion promise enforcement.`;
}

function generateCompletionPromise(spec: PromptSpec): string {
  const criteria = spec.doneWhen.split("\n").filter(line => line.trim());
  
  return `# COMPLETION_PROMISE.md

## Success Criteria
${criteria.map(c => `- [ ] ${c.trim()}`).join("\n")}

## Verification
- [ ] All tests pass
- [ ] No new errors introduced
- [ ] Changes are minimal and scoped

## Status
PROMISE_SATISFIED: false`;
}
