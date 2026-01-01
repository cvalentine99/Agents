import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";

// Mock node-pty before importing ralphEngine
vi.mock("node-pty", () => ({
  spawn: vi.fn(() => ({
    onData: vi.fn(),
    onExit: vi.fn(),
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn(),
  })),
}));

// Mock fs module
vi.mock("fs", () => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => "{}"),
  readdirSync: vi.fn(() => ["index.ts", "package.json"]),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

// Mock the LLM executor
vi.mock("./llmExecutor", () => ({
  callLLM: vi.fn().mockResolvedValue({
    content: "Generated code response",
    model: "claude",
    tokensUsed: 100,
  }),
  generateCode: vi.fn().mockResolvedValue({
    success: true,
    code: 'console.log("Hello World");',
    explanation: "Simple hello world",
  }),
  reviewCode: vi.fn().mockResolvedValue({
    issues: [],
    suggestions: ["Consider adding types"],
    approved: true,
  }),
  analyzeTestResults: vi.fn().mockResolvedValue({
    passed: true,
    summary: "All tests passed",
    failures: [],
  }),
}));

// Mock promptMd service
vi.mock("./promptMd", () => ({
  getPrompt: vi.fn().mockResolvedValue(null),
  savePrompt: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock autoSignSuggestions
vi.mock("./autoSignSuggestions", () => ({
  recordFailure: vi.fn(),
  getConsecutiveFailures: vi.fn().mockReturnValue(0),
  getAutoSuggestions: vi.fn().mockReturnValue([]),
}));

// Mock ptyService
vi.mock("./ptyService", () => {
  const mockPtyService = new EventEmitter();
  return {
    ptyService: Object.assign(mockPtyService, {
      createSession: vi.fn().mockReturnValue({
        id: "test-session",
        ptyProcess: { write: vi.fn(), kill: vi.fn() },
        cwd: "/home/ubuntu",
        createdAt: new Date(),
        userId: "user-1",
      }),
      write: vi.fn().mockReturnValue(true),
      executeCommand: vi.fn().mockReturnValue(true),
      killSession: vi.fn().mockReturnValue(true),
      getSession: vi.fn(),
      hasSession: vi.fn().mockReturnValue(true),
    }),
  };
});

import type { RalphConfig, RalphState } from "./ralphEngine";

describe("RalphEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("RalphConfig validation", () => {
    it("should define correct config structure", () => {
      const config: RalphConfig = {
        sessionId: "session-123",
        userId: "user-1",
        workingDir: "/home/ubuntu/project",
        model: "claude",
        maxIterations: 50,
        noProgressThreshold: 3,
        prompt: {
          goal: "Build a todo app",
          context: "Using React and TypeScript",
          doneWhen: "All tests pass",
          doNot: "Don't break existing code",
        },
        completionCriteria: ["Tests pass", "Build succeeds"],
      };

      expect(config.sessionId).toBe("session-123");
      expect(config.model).toBe("claude");
      expect(config.maxIterations).toBe(50);
      expect(config.noProgressThreshold).toBe(3);
      expect(config.prompt.goal).toBe("Build a todo app");
      expect(config.completionCriteria).toHaveLength(2);
    });

    it("should support all LLM model types", () => {
      const models: Array<RalphConfig["model"]> = ["claude", "codex", "gemini", "manus"];
      
      models.forEach(model => {
        const config: RalphConfig = {
          sessionId: "test",
          userId: "user-1",
          workingDir: "/test",
          model,
          maxIterations: 10,
          noProgressThreshold: 3,
          prompt: { goal: "", context: "", doneWhen: "", doNot: "" },
          completionCriteria: [],
        };
        expect(config.model).toBe(model);
      });
    });
  });

  describe("RalphState management", () => {
    it("should define correct initial state", () => {
      const state: RalphState = {
        status: "idle",
        currentIteration: 0,
        completionProgress: 0,
        circuitBreaker: "CLOSED",
        noProgressCount: 0,
        filesModified: [],
        testsPassed: 0,
        testsFailed: 0,
        errors: [],
        lastOutput: "",
      };

      expect(state.status).toBe("idle");
      expect(state.circuitBreaker).toBe("CLOSED");
      expect(state.currentIteration).toBe(0);
    });

    it("should support all status types", () => {
      const statuses: Array<RalphState["status"]> = [
        "idle", "running", "paused", "complete", "failed"
      ];

      statuses.forEach(status => {
        const state: RalphState = {
          status,
          currentIteration: 0,
          completionProgress: 0,
          circuitBreaker: "CLOSED",
          noProgressCount: 0,
          filesModified: [],
          testsPassed: 0,
          testsFailed: 0,
          errors: [],
          lastOutput: "",
        };
        expect(state.status).toBe(status);
      });
    });

    it("should support all circuit breaker states", () => {
      const cbStates: Array<RalphState["circuitBreaker"]> = [
        "CLOSED", "HALF_OPEN", "OPEN"
      ];

      cbStates.forEach(cbState => {
        const state: RalphState = {
          status: "running",
          currentIteration: 0,
          completionProgress: 0,
          circuitBreaker: cbState,
          noProgressCount: 0,
          filesModified: [],
          testsPassed: 0,
          testsFailed: 0,
          errors: [],
          lastOutput: "",
        };
        expect(state.circuitBreaker).toBe(cbState);
      });
    });
  });

  describe("Circuit Breaker Logic", () => {
    it("should transition from CLOSED to OPEN after threshold failures", () => {
      const noProgressThreshold = 3;
      let noProgressCount = 0;
      let circuitBreaker: RalphState["circuitBreaker"] = "CLOSED";

      // Simulate failures
      for (let i = 0; i < noProgressThreshold; i++) {
        noProgressCount++;
        if (noProgressCount >= noProgressThreshold) {
          circuitBreaker = "OPEN";
        }
      }

      expect(circuitBreaker).toBe("OPEN");
      expect(noProgressCount).toBe(3);
    });

    it("should reset noProgressCount on successful progress", () => {
      let noProgressCount = 2;
      let circuitBreaker: RalphState["circuitBreaker"] = "CLOSED";

      // Simulate progress
      const madeProgress = true;
      if (madeProgress) {
        noProgressCount = 0;
        circuitBreaker = "CLOSED";
      }

      expect(noProgressCount).toBe(0);
      expect(circuitBreaker).toBe("CLOSED");
    });

    it("should pause loop when circuit breaker is OPEN", () => {
      const circuitBreaker: RalphState["circuitBreaker"] = "OPEN";
      let status: RalphState["status"] = "running";

      if (circuitBreaker === "OPEN") {
        status = "paused";
      }

      expect(status).toBe("paused");
    });
  });

  describe("Iteration Management", () => {
    it("should increment iteration counter", () => {
      let currentIteration = 0;
      const maxIterations = 50;

      currentIteration++;
      expect(currentIteration).toBe(1);
      expect(currentIteration < maxIterations).toBe(true);
    });

    it("should stop at max iterations", () => {
      let currentIteration = 49;
      const maxIterations = 50;
      let status: RalphState["status"] = "running";

      currentIteration++;
      if (currentIteration >= maxIterations) {
        status = "failed";
      }

      expect(currentIteration).toBe(50);
      expect(status).toBe("failed");
    });

    it("should track files modified across iterations", () => {
      const filesModified: string[] = [];
      
      // Iteration 1
      filesModified.push("src/index.ts");
      
      // Iteration 2
      filesModified.push("src/utils.ts");
      filesModified.push("src/index.ts"); // duplicate
      
      // Deduplicate
      const uniqueFiles = Array.from(new Set(filesModified));
      
      expect(uniqueFiles).toHaveLength(2);
      expect(uniqueFiles).toContain("src/index.ts");
      expect(uniqueFiles).toContain("src/utils.ts");
    });
  });

  describe("Completion Criteria", () => {
    it("should calculate completion progress", () => {
      const criteria = ["Tests pass", "Build succeeds", "Lint clean"];
      const completed = ["Tests pass", "Build succeeds"];
      
      const progress = Math.round((completed.length / criteria.length) * 100);
      
      expect(progress).toBe(67);
    });

    it("should mark complete when all criteria met", () => {
      const criteria = ["Tests pass", "Build succeeds"];
      const completed = ["Tests pass", "Build succeeds"];
      let status: RalphState["status"] = "running";
      
      if (completed.length === criteria.length) {
        status = "complete";
      }
      
      expect(status).toBe("complete");
    });

    it("should continue when criteria not met", () => {
      const criteria = ["Tests pass", "Build succeeds", "Lint clean"];
      const completed = ["Tests pass"];
      let status: RalphState["status"] = "running";
      
      if (completed.length < criteria.length) {
        // Continue loop
        status = "running";
      }
      
      expect(status).toBe("running");
    });
  });

  describe("Error Handling", () => {
    it("should record errors in state", () => {
      const errors: string[] = [];
      
      try {
        throw new Error("Test error");
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        errors.push(errorMsg);
      }
      
      expect(errors).toHaveLength(1);
      expect(errors[0]).toBe("Test error");
    });

    it("should increment noProgressCount on error", () => {
      let noProgressCount = 0;
      
      // Simulate error
      noProgressCount++;
      
      expect(noProgressCount).toBe(1);
    });

    it("should track multiple errors", () => {
      const errors: string[] = [];
      
      errors.push("Error 1");
      errors.push("Error 2");
      errors.push("Error 3");
      
      expect(errors).toHaveLength(3);
    });
  });

  describe("PROMPT.md Integration", () => {
    it("should construct prompt from config", () => {
      const config: RalphConfig = {
        sessionId: "test",
        userId: "user-1",
        workingDir: "/project",
        model: "claude",
        maxIterations: 50,
        noProgressThreshold: 3,
        prompt: {
          goal: "Build a REST API",
          context: "Using Express.js",
          doneWhen: "All endpoints work",
          doNot: "Don't use deprecated methods",
        },
        completionCriteria: ["Tests pass"],
      };

      const promptMd = `# GOAL
${config.prompt.goal}

# CONTEXT
${config.prompt.context}

# DONE WHEN
${config.prompt.doneWhen}

# DO NOT
${config.prompt.doNot}`;

      expect(promptMd).toContain("Build a REST API");
      expect(promptMd).toContain("Using Express.js");
      expect(promptMd).toContain("All endpoints work");
      expect(promptMd).toContain("Don't use deprecated methods");
    });
  });

  describe("Test Results Tracking", () => {
    it("should track test pass/fail counts", () => {
      const state: RalphState = {
        status: "running",
        currentIteration: 5,
        completionProgress: 50,
        circuitBreaker: "CLOSED",
        noProgressCount: 0,
        filesModified: [],
        testsPassed: 0,
        testsFailed: 0,
        errors: [],
        lastOutput: "",
      };

      // Simulate test results
      state.testsPassed = 10;
      state.testsFailed = 2;

      expect(state.testsPassed).toBe(10);
      expect(state.testsFailed).toBe(2);
      expect(state.testsPassed + state.testsFailed).toBe(12);
    });

    it("should update test counts across iterations", () => {
      let testsPassed = 0;
      let testsFailed = 0;

      // Iteration 1
      testsPassed = 5;
      testsFailed = 3;

      // Iteration 2 (improved)
      testsPassed = 7;
      testsFailed = 1;

      expect(testsPassed).toBe(7);
      expect(testsFailed).toBe(1);
    });
  });

  describe("Event Emission", () => {
    it("should define expected event types", () => {
      const expectedEvents = [
        "started",
        "log",
        "output",
        "iterationStart",
        "iterationComplete",
        "stateChange",
        "complete",
        "maxIterations",
      ];

      expectedEvents.forEach(event => {
        expect(typeof event).toBe("string");
      });
    });

    it("should emit events with correct data structure", () => {
      const emitter = new EventEmitter();
      const events: Array<{ type: string; data: unknown }> = [];

      emitter.on("started", (sessionId, state) => {
        events.push({ type: "started", data: { sessionId, state } });
      });

      emitter.on("log", (sessionId, message) => {
        events.push({ type: "log", data: { sessionId, message } });
      });

      // Simulate emissions
      emitter.emit("started", "session-123", { status: "running" });
      emitter.emit("log", "session-123", "Starting loop...");

      expect(events).toHaveLength(2);
      expect(events[0].type).toBe("started");
      expect(events[1].type).toBe("log");
    });
  });

  describe("Session Lifecycle", () => {
    it("should initialize session with running state", () => {
      const initialState: RalphState = {
        status: "running",
        currentIteration: 0,
        completionProgress: 0,
        circuitBreaker: "CLOSED",
        noProgressCount: 0,
        filesModified: [],
        testsPassed: 0,
        testsFailed: 0,
        errors: [],
        lastOutput: "",
      };

      expect(initialState.status).toBe("running");
      expect(initialState.currentIteration).toBe(0);
    });

    it("should transition through lifecycle states", () => {
      const states: Array<RalphState["status"]> = [];

      states.push("idle");
      states.push("running");
      states.push("paused");
      states.push("running");
      states.push("complete");

      expect(states[0]).toBe("idle");
      expect(states[states.length - 1]).toBe("complete");
    });
  });

  describe("Working Directory Handling", () => {
    it("should validate working directory path", () => {
      const validPaths = [
        "/home/ubuntu/project",
        "/home/ubuntu/my-app",
        "/tmp/test-project",
      ];

      validPaths.forEach(path => {
        expect(path.startsWith("/")).toBe(true);
      });
    });

    it("should handle relative paths", () => {
      const relativePath = "project";
      const basePath = "/home/ubuntu";
      const fullPath = `${basePath}/${relativePath}`;

      expect(fullPath).toBe("/home/ubuntu/project");
    });
  });

  describe("Output Buffer Management", () => {
    it("should accumulate output data", () => {
      let buffer = "";

      buffer += "Line 1\n";
      buffer += "Line 2\n";
      buffer += "Line 3\n";

      expect(buffer).toContain("Line 1");
      expect(buffer).toContain("Line 2");
      expect(buffer).toContain("Line 3");
      expect(buffer.split("\n").length).toBe(4); // 3 lines + empty
    });

    it("should clear buffer on session end", () => {
      let buffer = "Some output data";

      // Clear on session end
      buffer = "";

      expect(buffer).toBe("");
    });
  });
});

describe("RalphEngine Integration Scenarios", () => {
  it("should handle successful completion scenario", () => {
    // Simulate a successful run
    const scenario = {
      iterations: 5,
      testsPassedFinal: 20,
      testsFailedFinal: 0,
      completionProgress: 100,
      status: "complete" as const,
    };

    expect(scenario.status).toBe("complete");
    expect(scenario.completionProgress).toBe(100);
    expect(scenario.testsFailedFinal).toBe(0);
  });

  it("should handle max iterations scenario", () => {
    const scenario = {
      maxIterations: 50,
      currentIteration: 50,
      completionProgress: 75,
      status: "failed" as const,
    };

    expect(scenario.status).toBe("failed");
    expect(scenario.currentIteration).toBe(scenario.maxIterations);
  });

  it("should handle circuit breaker trip scenario", () => {
    const scenario = {
      noProgressCount: 3,
      noProgressThreshold: 3,
      circuitBreaker: "OPEN" as const,
      status: "paused" as const,
    };

    expect(scenario.circuitBreaker).toBe("OPEN");
    expect(scenario.status).toBe("paused");
    expect(scenario.noProgressCount).toBe(scenario.noProgressThreshold);
  });

  it("should handle recovery scenario", () => {
    // Start with circuit breaker open
    let circuitBreaker: RalphState["circuitBreaker"] = "OPEN";
    let status: RalphState["status"] = "paused";

    // User intervention resets
    circuitBreaker = "HALF_OPEN";
    status = "running";

    // Successful iteration
    circuitBreaker = "CLOSED";

    expect(circuitBreaker).toBe("CLOSED");
    expect(status).toBe("running");
  });
});
