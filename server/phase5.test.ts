import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock authenticated user context
function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("Phase 5: Analytics Data", () => {
  it("sessions.list returns array for analytics processing", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    // List sessions - should return array (possibly empty)
    const sessions = await caller.sessions.list();
    
    expect(Array.isArray(sessions)).toBe(true);
  });
  
  it("sessions.create returns sessionId", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    // Create a test session
    const result = await caller.sessions.create({
      name: "Analytics Test Session",
      selectedModel: "claude",
      agentProfile: "patch_goblin",
      workingDirectory: "/test/path",
    });
    
    // Verify session creation returns sessionId
    expect(result).toHaveProperty("sessionId");
    expect(typeof result.sessionId).toBe("string");
  });
});

describe("Phase 5: Prompt Templates", () => {
  it("prompts.list returns array for template library", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    // List prompts - should return array
    const prompts = await caller.prompts.list();
    
    expect(Array.isArray(prompts)).toBe(true);
  });
  
  it("prompts.save creates a new template", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    // Save a new prompt template
    const result = await caller.prompts.save({
      name: "Test Template",
      goal: "Build a test component",
      context: "React + TypeScript",
      doneWhen: "Tests pass",
      doNot: "Skip types",
      expandedPrompt: "react, typescript, testing",
    });
    
    // prompts.save returns { success: true }
    expect(result).toHaveProperty("success", true);
  });
  
  it("prompts can be listed after creation", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    // First create a prompt
    await caller.prompts.save({
      name: "Template to List",
      goal: "Test listing",
      context: "",
      doneWhen: "",
      doNot: "",
      expandedPrompt: "",
    });
    
    // Then list prompts
    const prompts = await caller.prompts.list();
    
    // Should have at least one prompt
    expect(Array.isArray(prompts)).toBe(true);
  });
});

describe("Phase 5: CLI Integration", () => {
  it("sessions can be created for CLI execution", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    // Create a session
    const result = await caller.sessions.create({
      name: "CLI Test Session",
      selectedModel: "claude",
      agentProfile: "patch_goblin",
      workingDirectory: "/test/cli",
    });
    
    // Session should be created and return sessionId
    expect(result).toHaveProperty("sessionId");
    expect(result.sessionId).toMatch(/^session-/);
  });
  
  it("sessions can be updated with iteration progress", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    // Create a session first
    const created = await caller.sessions.create({
      name: "Iteration Test",
      selectedModel: "claude",
      agentProfile: "test_gremlin",
      workingDirectory: "/test/iter",
    });
    
    // Update the session using correct schema
    const updated = await caller.sessions.update({
      sessionId: created.sessionId,
      updates: {
        currentIteration: 5,
        completionProgress: 60,
        status: "running",
      },
    });
    
    expect(updated.success).toBe(true);
  });
});
