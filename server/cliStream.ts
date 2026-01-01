import { spawn, ChildProcess } from "child_process";
import type { WebSocket } from "ws";
import * as db from "./db";
import { decrypt } from "./crypto";

// Store active processes
const activeProcesses: Map<string, ChildProcess> = new Map();

// Store session state for iteration tracking
const sessionState: Map<string, {
  iteration: number;
  filesModified: string[];
  testsRun: number;
  testsPassed: number;
  errors: number;
  diffLines: number;
  startTime: number;
}> = new Map();

interface StreamMessage {
  type: "stdout" | "stderr" | "status" | "error" | "complete" | "progress" | "iteration";
  data: string;
  timestamp: number;
  iteration?: number;
  exitCode?: number;
  progress?: {
    filesModified?: number;
    testsRun?: number;
    testsPassed?: number;
    errors?: number;
    diffLines?: number;
    duration?: number;
  };
}

interface StartLoopParams {
  sessionId: string;
  userId: number;
  prompt: string;
  workingDirectory: string;
  model: "codex" | "claude" | "gemini" | "manus";
  maxIterations: number;
  dangerouslySkipPermissions: boolean;
  completionCriteria?: string;
  agentProfile?: string;
}

/**
 * Build the CLI command based on the selected model
 */
function buildCommand(params: StartLoopParams, apiKey: string): { command: string; args: string[]; env: Record<string, string> } {
  const { model, prompt, maxIterations, dangerouslySkipPermissions, agentProfile } = params;
  
  // Build the full prompt with agent profile context
  let fullPrompt = prompt;
  if (agentProfile) {
    const profileContext = getAgentProfileContext(agentProfile);
    fullPrompt = `${profileContext}\n\n${prompt}`;
  }
  
  const baseEnv: Record<string, string> = {};
  
  switch (model) {
    case "claude": {
      const claudeArgs: string[] = [];
      
      // Add dangerous skip permissions first if enabled
      if (dangerouslySkipPermissions) {
        claudeArgs.push("--dangerously-skip-permissions");
      }
      
      // Add print flag and prompt
      claudeArgs.push("--print", fullPrompt);
      
      // Add max turns
      claudeArgs.push("--max-turns", String(maxIterations));
      
      // Set API key in environment
      if (apiKey) {
        baseEnv.ANTHROPIC_API_KEY = apiKey;
      }
      
      return { command: "claude", args: claudeArgs, env: baseEnv };
    }
      
    case "codex":
      // OpenAI Codex CLI
      if (apiKey) {
        baseEnv.OPENAI_API_KEY = apiKey;
      }
      return {
        command: "codex",
        args: ["--prompt", fullPrompt, "--full-auto"],
        env: baseEnv,
      };
      
    case "gemini":
      // Google Gemini CLI
      if (apiKey) {
        baseEnv.GOOGLE_API_KEY = apiKey;
      }
      return {
        command: "gemini",
        args: ["--prompt", fullPrompt],
        env: baseEnv,
      };
      
    case "manus":
      // Manus CLI
      return {
        command: "manus",
        args: ["run", "--prompt", fullPrompt],
        env: baseEnv,
      };
      
    default:
      throw new Error(`Unknown model: ${model}`);
  }
}

/**
 * Get agent profile context for the prompt
 */
function getAgentProfileContext(profile: string): string {
  switch (profile) {
    case "patch_goblin":
      return `You are Patch Goblin - a fast, efficient coding agent focused on minimal diffs.
Rules:
- Make the smallest possible changes to fix issues
- Avoid refactoring unless explicitly asked
- Output only the changed code, not full files
- Prefer surgical fixes over rewrites
- Skip explanations unless asked`;
      
    case "architect_owl":
      return `You are Architect Owl - a thoughtful design agent focused on architecture and tradeoffs.
Rules:
- Think through design implications before coding
- Consider scalability, maintainability, and performance
- Explain tradeoffs between different approaches
- Suggest patterns and best practices
- Ask clarifying questions when requirements are ambiguous`;
      
    case "test_gremlin":
      return `You are Test Gremlin - a test-first development agent.
Rules:
- Always write tests before implementation
- Aim for high test coverage
- Include edge cases and error scenarios
- Use appropriate testing patterns (unit, integration, e2e)
- Ensure tests are readable and maintainable`;
      
    case "refactor_surgeon":
      return `You are Refactor Surgeon - a safe refactoring agent.
Rules:
- Make changes incrementally with tests passing at each step
- Preserve existing behavior while improving code quality
- Extract functions, reduce duplication, improve naming
- Never change functionality without explicit permission
- Document any behavioral changes`;
      
    default:
      return "";
  }
}

/**
 * Parse CLI output to extract progress information
 */
type SessionState = {
  iteration: number;
  filesModified: string[];
  testsRun: number;
  testsPassed: number;
  errors: number;
  diffLines: number;
  startTime: number;
};

function parseOutputForProgress(text: string, state: SessionState): void {
  // Detect file modifications
  const filePatterns = [
    /(?:Created|Modified|Updated|Wrote|Writing)\s+(?:file\s+)?[`']?([^\s`']+\.[a-zA-Z]+)[`']?/gi,
    /(?:File|Path):\s*([^\s]+\.[a-zA-Z]+)/gi,
  ];
  
  for (const pattern of filePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const file = match[1];
      if (!state.filesModified.includes(file)) {
        state.filesModified.push(file);
      }
    }
  }
  
  // Detect test results
  const testPatterns = [
    /(\d+)\s+(?:tests?|specs?)\s+(?:passed|passing)/i,
    /(?:passed|passing):\s*(\d+)/i,
    /✓\s+(\d+)\s+(?:tests?|specs?)/i,
  ];
  
  for (const pattern of testPatterns) {
    const match = text.match(pattern);
    if (match) {
      state.testsPassed = Math.max(state.testsPassed, parseInt(match[1], 10));
    }
  }
  
  const totalTestPatterns = [
    /(\d+)\s+(?:tests?|specs?)\s+(?:total|run)/i,
    /(?:total|ran):\s*(\d+)/i,
  ];
  
  for (const pattern of totalTestPatterns) {
    const match = text.match(pattern);
    if (match) {
      state.testsRun = Math.max(state.testsRun, parseInt(match[1], 10));
    }
  }
  
  // Detect errors
  const errorPatterns = [
    /(?:error|failed|failure)s?:\s*(\d+)/i,
    /(\d+)\s+(?:errors?|failures?)/i,
  ];
  
  for (const pattern of errorPatterns) {
    const match = text.match(pattern);
    if (match) {
      state.errors = Math.max(state.errors, parseInt(match[1], 10));
    }
  }
  
  // Count diff lines (rough estimate from output)
  const diffLinePatterns = [
    /^\+[^+]/gm,
    /^-[^-]/gm,
  ];
  
  for (const pattern of diffLinePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      state.diffLines += matches.length;
    }
  }
}

/**
 * Send a message through WebSocket
 */
function sendMessage(ws: WebSocket, message: StreamMessage) {
  if (ws.readyState === 1) { // WebSocket.OPEN = 1
    ws.send(JSON.stringify(message));
  }
}

/**
 * Start a CLI process and stream output to WebSocket
 */
export async function startCliStream(
  ws: WebSocket,
  params: StartLoopParams
): Promise<void> {
  const { sessionId, userId, model, workingDirectory, prompt } = params;
  const processKey = `${sessionId}-${Date.now()}`;
  
  // Initialize session state
  sessionState.set(sessionId, {
    iteration: 1,
    filesModified: [],
    testsRun: 0,
    testsPassed: 0,
    errors: 0,
    diffLines: 0,
    startTime: Date.now(),
  });
  
  const state = sessionState.get(sessionId)!;
  
  try {
    // Get API key for the model
    const apiKeyRecord = await db.getApiKeyForProvider(userId, model);
    let apiKey = "";
    
    if (apiKeyRecord) {
      try {
        apiKey = decrypt(apiKeyRecord.encryptedKey);
      } catch (e) {
        sendMessage(ws, {
          type: "error",
          data: `Failed to decrypt API key for ${model}. Please check your API key in Settings.`,
          timestamp: Date.now(),
        });
        return;
      }
    } else if (model === "claude") {
      // Check for environment variable as fallback
      if (!process.env.ANTHROPIC_API_KEY) {
        sendMessage(ws, {
          type: "error",
          data: `No API key found for ${model}. Please add your API key in Settings.`,
          timestamp: Date.now(),
        });
        return;
      }
    }
    
    // Build command
    const { command, args, env: cmdEnv } = buildCommand(params, apiKey);
    
    // Create CLI execution record
    const commandStr = `${command} ${args.map(a => a.includes(" ") ? `"${a}"` : a).join(" ")}`;
    // Note: cliExecutions.sessionId is int, but we're using string sessionId
    // For now, we'll skip creating the execution record and just log
    console.info(`Starting CLI execution for session ${sessionId}: ${commandStr.substring(0, 100)}...`);
    
    // Update session status to running
    await db.updateSession(sessionId, { status: "running" });
    
    // Merge environment variables
    const env = {
      ...process.env,
      ...cmdEnv,
      // Ensure PATH includes common CLI locations
      PATH: `${process.env.PATH}:/usr/local/bin:/opt/homebrew/bin:${process.env.HOME}/.local/bin`,
    };
    
    sendMessage(ws, {
      type: "status",
      data: `🚀 Starting ${model.toUpperCase()} CLI in ${workingDirectory || "current directory"}...`,
      timestamp: Date.now(),
      iteration: state.iteration,
    });
    
    sendMessage(ws, {
      type: "status",
      data: `📋 Command: ${command} ${args.slice(0, 2).join(" ")}...`,
      timestamp: Date.now(),
      iteration: state.iteration,
    });
    
    // Spawn the process
    const child = spawn(command, args, {
      cwd: workingDirectory || process.cwd(),
      env: env as NodeJS.ProcessEnv,
      shell: true,
    });
    
    activeProcesses.set(processKey, child);
    
    // Buffer for accumulating output
    let outputBuffer = "";
    
    // Stream stdout
    child.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      outputBuffer += text;
      
      // Parse for progress updates
      parseOutputForProgress(text, state);
      
      sendMessage(ws, {
        type: "stdout",
        data: text,
        timestamp: Date.now(),
        iteration: state.iteration,
        progress: {
          filesModified: state.filesModified.length,
          testsRun: state.testsRun,
          testsPassed: state.testsPassed,
          errors: state.errors,
          diffLines: state.diffLines,
          duration: Math.floor((Date.now() - state.startTime) / 1000),
        },
      });
      
      // Detect iteration changes (Claude outputs iteration markers)
      if (text.includes("Turn") || text.includes("Iteration") || text.includes("Step")) {
        const iterMatch = text.match(/(?:Turn|Iteration|Step)\s*(\d+)/i);
        if (iterMatch) {
          const newIteration = parseInt(iterMatch[1], 10);
          if (newIteration > state.iteration) {
            state.iteration = newIteration;
            sendMessage(ws, {
              type: "iteration",
              data: `Starting iteration ${newIteration}`,
              timestamp: Date.now(),
              iteration: newIteration,
            });
          }
        }
      }
    });
    
    // Stream stderr
    child.stderr?.on("data", (data: Buffer) => {
      const text = data.toString();
      
      // Some CLIs output progress to stderr
      parseOutputForProgress(text, state);
      
      sendMessage(ws, {
        type: "stderr",
        data: text,
        timestamp: Date.now(),
        iteration: state.iteration,
      });
    });
    
    // Handle process exit
    child.on("close", async (code) => {
      activeProcesses.delete(processKey);
      
      const duration = Math.floor((Date.now() - state.startTime) / 1000);
      const status = code === 0 ? "complete" : "failed";
      
      // Update session status
      await db.updateSession(sessionId, {
        status,
        currentIteration: state.iteration,
      });
      
      // Note: CLI execution updates would need the execution ID
      // For now, we log the completion details
      console.info(`Session ${sessionId} completed with exit code ${code}`);
      
      sendMessage(ws, {
        type: "complete",
        data: code === 0 
          ? `✅ Process completed successfully after ${state.iteration} iteration(s)`
          : `❌ Process exited with code ${code}`,
        timestamp: Date.now(),
        iteration: state.iteration,
        exitCode: code ?? undefined,
        progress: {
          filesModified: state.filesModified.length,
          testsRun: state.testsRun,
          testsPassed: state.testsPassed,
          errors: state.errors,
          diffLines: state.diffLines,
          duration,
        },
      });
      
      // Cleanup session state
      sessionState.delete(sessionId);
    });
    
    // Handle process error
    child.on("error", async (error) => {
      activeProcesses.delete(processKey);
      
      // Update session status
      await db.updateSession(sessionId, { status: "failed" });
      
      let errorMessage = error.message;
      if (error.message.includes("ENOENT")) {
        errorMessage = `Command '${command}' not found. Please ensure ${model} CLI is installed and in your PATH.`;
      }
      
      sendMessage(ws, {
        type: "error",
        data: `❌ Process error: ${errorMessage}`,
        timestamp: Date.now(),
        iteration: state.iteration,
      });
      
      // Cleanup session state
      sessionState.delete(sessionId);
    });
    
  } catch (error) {
    sendMessage(ws, {
      type: "error",
      data: `❌ Failed to start CLI: ${error instanceof Error ? error.message : "Unknown error"}`,
      timestamp: Date.now(),
    });
    
    // Cleanup session state
    sessionState.delete(sessionId);
  }
}

/**
 * Stop a running CLI process
 */
export function stopCliProcess(sessionId: string): boolean {
  const keys = Array.from(activeProcesses.keys());
  for (const key of keys) {
    if (key.startsWith(`${sessionId}-`)) {
      const process = activeProcesses.get(key);
      if (process) {
        process.kill("SIGTERM");
        activeProcesses.delete(key);
        
        // Update session status
        db.updateSession(sessionId, { status: "paused" }).catch(console.error);
        
        // Cleanup session state
        sessionState.delete(sessionId);
        
        return true;
      }
    }
  }
  return false;
}

/**
 * Get count of active processes
 */
export function getActiveProcessCount(): number {
  return activeProcesses.size;
}

/**
 * Get session state
 */
export function getSessionState(sessionId: string) {
  return sessionState.get(sessionId);
}

/**
 * Kill all active processes (for cleanup)
 */
export function killAllProcesses(): void {
  const keys = Array.from(activeProcesses.keys());
  for (const key of keys) {
    const process = activeProcesses.get(key);
    if (process) {
      process.kill("SIGKILL");
      activeProcesses.delete(key);
    }
  }
  sessionState.clear();
}
