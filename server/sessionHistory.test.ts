import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("sessions router", () => {
  it("list returns array when called", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sessions.list();
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("create returns a new session with sessionId", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Use the correct schema matching sessionConfigSchema
    const result = await caller.sessions.create({
      selectedModel: "claude",
      selectedProfile: "patch_goblin",
      maxIterations: 10,
      ralphMode: true,
      noProgressThreshold: 3,
      autoAskHuman: true,
      safetyMode: "standard",
    });

    expect(result).toBeDefined();
    expect(result.sessionId).toBeDefined();
    expect(typeof result.sessionId).toBe("string");
    expect(result.sessionId).toMatch(/^session-/);
  });
});

describe("apiKeys router", () => {
  it("list returns array of API keys", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.apiKeys.list();
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("prompts router", () => {
  it("list returns array of prompts", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.prompts.list();
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("save creates a new prompt and returns success", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.prompts.save({
      name: "Test Prompt",
      goal: "Build a test feature",
      context: "Testing context",
      doneWhen: "All tests pass",
      doNot: "Do not break existing code",
      targetModel: "claude",
    });
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });
});
