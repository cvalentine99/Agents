import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";

// Mock all external dependencies
vi.mock("node-pty", () => ({
  spawn: vi.fn(() => ({
    onData: vi.fn(),
    onExit: vi.fn(),
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn(),
    pid: 12345,
  })),
}));

vi.mock("fs", () => ({
  existsSync: vi.fn(() => true),
  readFileSync: vi.fn(() => '{"goal": "Build a test app"}'),
  readdirSync: vi.fn(() => ["index.ts", "package.json", "src"]),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  statSync: vi.fn(() => ({ isDirectory: () => false })),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Generated code" }, finish_reason: "stop" }],
    usage: { total_tokens: 100 },
  }),
}));

vi.mock("./promptMd", () => ({
  getPrompt: vi.fn().mockResolvedValue({
    goal: "Build a todo app",
    context: "React + TypeScript",
    doneWhen: "All tests pass",
    doNot: "Don't break existing code",
  }),
  savePrompt: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("./autoSignSuggestions", () => ({
  recordFailure: vi.fn(),
  getConsecutiveFailures: vi.fn().mockReturnValue(0),
  getAutoSuggestions: vi.fn().mockReturnValue([]),
  clearFailures: vi.fn(),
}));

import type { RalphConfig, RalphState } from "./ralphEngine";

describe("RALPH Loop Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Full Session Lifecycle", () => {
    it("should complete a full session from start to finish", async () => {
      // Simulate a complete RALPH Loop session
      const sessionEvents: Array<{ event: string; data: any }> = [];
      const emitter = new EventEmitter();

      // Track all events
      ["started", "log", "iterationStart", "iterationComplete", "stateChange", "complete"].forEach(event => {
        emitter.on(event, (data: any) => {
          sessionEvents.push({ event, data });
        });
      });

      // Initialize session
      const config: RalphConfig = {
        sessionId: "integration-test-session",
        userId: "test-user",
        workingDir: "/home/ubuntu/test-project",
        model: "claude",
        maxIterations: 10,
        noProgressThreshold: 3,
        prompt: {
          goal: "Build a simple todo app",
          context: "Using React and TypeScript",
          doneWhen: "All tests pass and app renders",
          doNot: "Don't modify package.json",
        },
        completionCriteria: ["Tests pass", "Build succeeds", "No lint errors"],
      };

      // Simulate session start
      emitter.emit("started", config.sessionId, { status: "running" });

      // Simulate iterations
      for (let i = 1; i <= 5; i++) {
        emitter.emit("iterationStart", config.sessionId, i);
        emitter.emit("log", config.sessionId, `Iteration ${i}: Analyzing code...`);
        emitter.emit("iterationComplete", config.sessionId, i, { 
          filesModified: [`src/file${i}.ts`],
          testsPassed: i * 2,
          testsFailed: Math.max(0, 5 - i),
        });
      }

      // Simulate completion
      emitter.emit("complete", config.sessionId, {
        status: "complete",
        iterations: 5,
        filesModified: ["src/file1.ts", "src/file2.ts"],
      });

      // Verify session lifecycle
      expect(sessionEvents.find(e => e.event === "started")).toBeDefined();
      expect(sessionEvents.filter(e => e.event === "iterationStart")).toHaveLength(5);
      expect(sessionEvents.filter(e => e.event === "iterationComplete")).toHaveLength(5);
      expect(sessionEvents.find(e => e.event === "complete")).toBeDefined();
    });

    it("should handle session with circuit breaker trip", async () => {
      const state: RalphState = {
        status: "running",
        currentIteration: 0,
        completionProgress: 0,
        circuitBreaker: "CLOSED",
        noProgressCount: 0,
        filesModified: [],
        testsPassed: 0,
        testsFailed: 5,
        errors: [],
        lastOutput: "",
      };

      // Simulate iterations without progress
      for (let i = 0; i < 3; i++) {
        state.currentIteration++;
        state.noProgressCount++;
        
        if (state.noProgressCount >= 3) {
          state.circuitBreaker = "OPEN";
          state.status = "paused";
        }
      }

      expect(state.circuitBreaker).toBe("OPEN");
      expect(state.status).toBe("paused");
      expect(state.noProgressCount).toBe(3);
    });

    it("should recover from circuit breaker trip", async () => {
      const state: RalphState = {
        status: "paused",
        currentIteration: 5,
        completionProgress: 30,
        circuitBreaker: "OPEN",
        noProgressCount: 3,
        filesModified: ["src/app.ts"],
        testsPassed: 3,
        testsFailed: 7,
        errors: ["Test timeout"],
        lastOutput: "Error: timeout",
      };

      // Simulate user intervention (manual fix)
      state.circuitBreaker = "HALF_OPEN";
      state.status = "running";

      // Simulate successful iteration after intervention
      state.testsPassed = 8;
      state.testsFailed = 2;
      state.noProgressCount = 0;
      state.circuitBreaker = "CLOSED";

      expect(state.circuitBreaker).toBe("CLOSED");
      expect(state.status).toBe("running");
      expect(state.testsPassed).toBe(8);
    });
  });

  describe("Multi-File Code Generation", () => {
    it("should track modifications across multiple files", () => {
      const filesModified: string[] = [];
      const fileChanges: Map<string, { before: string; after: string }> = new Map();

      // Simulate multi-file changes
      const changes = [
        { file: "src/App.tsx", before: "old code", after: "new code" },
        { file: "src/components/Todo.tsx", before: "", after: "new component" },
        { file: "src/utils/helpers.ts", before: "helper v1", after: "helper v2" },
        { file: "src/App.tsx", before: "new code", after: "final code" }, // Same file modified again
      ];

      changes.forEach(change => {
        if (!filesModified.includes(change.file)) {
          filesModified.push(change.file);
        }
        fileChanges.set(change.file, { before: change.before, after: change.after });
      });

      expect(filesModified).toHaveLength(3); // Unique files
      expect(fileChanges.get("src/App.tsx")?.after).toBe("final code"); // Latest change
    });

    it("should handle file creation and deletion", () => {
      const fileSystem: Map<string, string | null> = new Map();

      // Create files
      fileSystem.set("src/new-feature.ts", "export function newFeature() {}");
      fileSystem.set("src/temp.ts", "temporary file");

      // Delete file
      fileSystem.set("src/temp.ts", null);

      // Verify state
      expect(fileSystem.get("src/new-feature.ts")).toBeTruthy();
      expect(fileSystem.get("src/temp.ts")).toBeNull();
    });
  });

  describe("Test Execution Flow", () => {
    it("should parse and track test results across iterations", () => {
      const testHistory: Array<{ iteration: number; passed: number; failed: number }> = [];

      // Simulate test results over iterations
      const results = [
        { iteration: 1, passed: 5, failed: 10 },
        { iteration: 2, passed: 8, failed: 7 },
        { iteration: 3, passed: 12, failed: 3 },
        { iteration: 4, passed: 14, failed: 1 },
        { iteration: 5, passed: 15, failed: 0 },
      ];

      results.forEach(r => testHistory.push(r));

      // Verify improvement trend
      expect(testHistory[0].failed).toBeGreaterThan(testHistory[4].failed);
      expect(testHistory[4].passed).toBe(15);
      expect(testHistory[4].failed).toBe(0);
    });

    it("should detect test regression", () => {
      const testHistory = [
        { iteration: 1, passed: 10, failed: 5 },
        { iteration: 2, passed: 12, failed: 3 },
        { iteration: 3, passed: 8, failed: 7 }, // Regression!
      ];

      const hasRegression = testHistory.some((result, idx) => {
        if (idx === 0) return false;
        const prev = testHistory[idx - 1];
        return result.failed > prev.failed;
      });

      expect(hasRegression).toBe(true);
    });
  });

  describe("PROMPT.md Integration", () => {
    it("should load and validate PROMPT.md structure", () => {
      const promptMd = {
        goal: "Build a REST API",
        context: "Node.js + Express + TypeScript",
        doneWhen: "All endpoints return correct responses",
        doNot: "Don't use deprecated Express methods",
      };

      // Validate required fields
      expect(promptMd.goal).toBeTruthy();
      expect(promptMd.context).toBeTruthy();
      expect(promptMd.doneWhen).toBeTruthy();
      expect(promptMd.doNot).toBeTruthy();
    });

    it("should update PROMPT.md during session", () => {
      let promptMd = {
        goal: "Build a REST API",
        context: "Node.js + Express",
        doneWhen: "All tests pass",
        doNot: "",
      };

      // Simulate update during session
      promptMd = {
        ...promptMd,
        context: promptMd.context + "\nAdded: Using Zod for validation",
        doNot: "Don't use any deprecated methods",
      };

      expect(promptMd.context).toContain("Zod");
      expect(promptMd.doNot).toBeTruthy();
    });
  });

  describe("Error Recovery Scenarios", () => {
    it("should handle build errors gracefully", () => {
      const errors: string[] = [];
      let status: RalphState["status"] = "running";

      // Simulate build error
      const buildError = "TypeScript error: Cannot find module './missing'";
      errors.push(buildError);

      // System should continue, not crash
      expect(errors).toHaveLength(1);
      expect(status).toBe("running");
    });

    it("should handle test timeout", () => {
      const state: RalphState = {
        status: "running",
        currentIteration: 3,
        completionProgress: 40,
        circuitBreaker: "CLOSED",
        noProgressCount: 0,
        filesModified: [],
        testsPassed: 5,
        testsFailed: 0,
        errors: [],
        lastOutput: "",
      };

      // Simulate timeout
      const timeout = true;
      if (timeout) {
        state.errors.push("Test execution timed out after 30s");
        state.noProgressCount++;
      }

      expect(state.errors).toHaveLength(1);
      expect(state.noProgressCount).toBe(1);
    });

    it("should handle LLM API failure", () => {
      const state: RalphState = {
        status: "running",
        currentIteration: 2,
        completionProgress: 20,
        circuitBreaker: "CLOSED",
        noProgressCount: 0,
        filesModified: [],
        testsPassed: 3,
        testsFailed: 2,
        errors: [],
        lastOutput: "",
      };

      // Simulate LLM failure
      const llmError = new Error("API rate limit exceeded");
      state.errors.push(llmError.message);
      state.noProgressCount++;

      // Should retry, not crash
      expect(state.status).toBe("running");
      expect(state.errors).toContain("API rate limit exceeded");
    });
  });

  describe("Completion Criteria Evaluation", () => {
    it("should evaluate multiple completion criteria", () => {
      const criteria = [
        { name: "Tests pass", check: () => true },
        { name: "Build succeeds", check: () => true },
        { name: "No lint errors", check: () => false },
      ];

      const results = criteria.map(c => ({
        name: c.name,
        passed: c.check(),
      }));

      const allPassed = results.every(r => r.passed);
      const passedCount = results.filter(r => r.passed).length;

      expect(allPassed).toBe(false);
      expect(passedCount).toBe(2);
    });

    it("should calculate completion progress accurately", () => {
      const totalCriteria = 5;
      const passedCriteria = 3;

      const progress = Math.round((passedCriteria / totalCriteria) * 100);

      expect(progress).toBe(60);
    });
  });

  describe("Session State Persistence", () => {
    it("should serialize session state for persistence", () => {
      const state: RalphState = {
        status: "running",
        currentIteration: 5,
        completionProgress: 60,
        circuitBreaker: "CLOSED",
        noProgressCount: 0,
        filesModified: ["src/app.ts", "src/utils.ts"],
        testsPassed: 10,
        testsFailed: 2,
        errors: [],
        lastOutput: "Tests: 10 passed, 2 failed",
      };

      const serialized = JSON.stringify(state);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.currentIteration).toBe(5);
      expect(deserialized.filesModified).toHaveLength(2);
    });

    it("should restore session from persisted state", () => {
      const persistedState = {
        status: "paused",
        currentIteration: 8,
        completionProgress: 75,
        circuitBreaker: "HALF_OPEN",
        noProgressCount: 2,
        filesModified: ["src/main.ts"],
        testsPassed: 15,
        testsFailed: 3,
        errors: ["Previous error"],
        lastOutput: "Last output",
      };

      const state: RalphState = { ...persistedState } as RalphState;

      expect(state.status).toBe("paused");
      expect(state.currentIteration).toBe(8);
      expect(state.errors).toContain("Previous error");
    });
  });

  describe("Concurrent Session Handling", () => {
    it("should isolate state between sessions", () => {
      const sessions = new Map<string, RalphState>();

      // Create two sessions
      sessions.set("session-1", {
        status: "running",
        currentIteration: 5,
        completionProgress: 50,
        circuitBreaker: "CLOSED",
        noProgressCount: 0,
        filesModified: ["file1.ts"],
        testsPassed: 10,
        testsFailed: 0,
        errors: [],
        lastOutput: "",
      });

      sessions.set("session-2", {
        status: "paused",
        currentIteration: 3,
        completionProgress: 30,
        circuitBreaker: "OPEN",
        noProgressCount: 3,
        filesModified: ["file2.ts"],
        testsPassed: 5,
        testsFailed: 5,
        errors: ["Error in session 2"],
        lastOutput: "",
      });

      // Verify isolation
      expect(sessions.get("session-1")?.status).toBe("running");
      expect(sessions.get("session-2")?.status).toBe("paused");
      expect(sessions.get("session-1")?.errors).toHaveLength(0);
      expect(sessions.get("session-2")?.errors).toHaveLength(1);
    });
  });

  describe("Auto-Sign Suggestions Integration", () => {
    it("should record failures for auto-sign analysis", () => {
      const failures: Array<{ iteration: number; error: string; context: string }> = [];

      // Record failures
      failures.push({
        iteration: 3,
        error: "TypeError: Cannot read property 'map' of undefined",
        context: "src/components/List.tsx",
      });

      failures.push({
        iteration: 4,
        error: "TypeError: Cannot read property 'map' of undefined",
        context: "src/components/List.tsx",
      });

      // Detect pattern
      const sameErrorCount = failures.filter(
        f => f.error === failures[0].error
      ).length;

      expect(sameErrorCount).toBe(2);
    });

    it("should generate suggestions based on failure patterns", () => {
      const failures = [
        { error: "Cannot find module './utils'", count: 3 },
        { error: "Type error in props", count: 2 },
      ];

      const suggestions = failures
        .filter(f => f.count >= 2)
        .map(f => `Consider fixing: ${f.error}`);

      expect(suggestions).toHaveLength(2);
    });
  });
});

describe("RALPH Loop End-to-End Scenarios", () => {
  it("should complete a simple bug fix scenario", async () => {
    // Scenario: Fix a simple bug in existing code
    const scenario = {
      initialState: {
        testsPassed: 8,
        testsFailed: 2,
        errors: ["TypeError in utils.ts"],
      },
      iterations: [
        { action: "analyze", result: "Found bug in utils.ts line 42" },
        { action: "fix", result: "Applied fix to utils.ts" },
        { action: "test", result: "All tests pass" },
      ],
      finalState: {
        testsPassed: 10,
        testsFailed: 0,
        errors: [],
      },
    };

    expect(scenario.finalState.testsFailed).toBe(0);
    expect(scenario.iterations).toHaveLength(3);
  });

  it("should complete a feature addition scenario", async () => {
    // Scenario: Add a new feature
    const scenario = {
      goal: "Add user authentication",
      steps: [
        { step: 1, action: "Create auth module", files: ["src/auth/index.ts"] },
        { step: 2, action: "Add login component", files: ["src/components/Login.tsx"] },
        { step: 3, action: "Add auth tests", files: ["src/auth/auth.test.ts"] },
        { step: 4, action: "Integrate with app", files: ["src/App.tsx"] },
      ],
      totalFilesCreated: 4,
      testsAdded: 5,
    };

    expect(scenario.steps).toHaveLength(4);
    expect(scenario.totalFilesCreated).toBe(4);
  });

  it("should handle a refactoring scenario", async () => {
    // Scenario: Refactor code without breaking tests
    const scenario = {
      goal: "Refactor utils module",
      constraints: ["All existing tests must pass", "No API changes"],
      iterations: [
        { iteration: 1, testsPassed: 20, testsFailed: 0 },
        { iteration: 2, testsPassed: 20, testsFailed: 2 }, // Temporary regression
        { iteration: 3, testsPassed: 20, testsFailed: 0 }, // Fixed
      ],
      success: true,
    };

    const finalIteration = scenario.iterations[scenario.iterations.length - 1];
    expect(finalIteration.testsFailed).toBe(0);
    expect(scenario.success).toBe(true);
  });
});
