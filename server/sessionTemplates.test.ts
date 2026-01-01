import { describe, expect, it } from "vitest";
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
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("sessionTemplates router", () => {
  it("should create a new session template", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sessionTemplates.create({
      name: "Test Template",
      description: "A test session template",
      tags: ["test", "demo"],
      selectedModel: "claude",
      selectedProfile: "patch_goblin",
      ralphMode: true,
      maxIterations: 50,
      noProgressThreshold: 3,
      autoAskHuman: true,
      safetyMode: "standard",
      promptGoal: "Build a test feature",
      promptContext: "Testing context",
      promptDoneWhen: "All tests pass",
      promptDoNot: "Don't break things",
      completionCriteria: ["Tests pass", "Build succeeds"],
    });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.name).toBe("Test Template");
  });

  it("should list session templates", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sessionTemplates.list();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should track template usage", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First create a template
    const created = await caller.sessionTemplates.create({
      name: "Usage Test Template",
      description: "Testing usage tracking",
      tags: ["usage-test"],
      selectedModel: "gemini",
      selectedProfile: "architect_owl",
      ralphMode: false,
      maxIterations: 25,
      noProgressThreshold: 5,
      autoAskHuman: false,
      safetyMode: "strict",
    });

    // Then use it
    const used = await caller.sessionTemplates.use({ id: created.id });

    expect(used).toBeDefined();
    expect(used.name).toBe("Usage Test Template");
    expect(used.usageCount).toBeGreaterThanOrEqual(1);
  });

  it("should delete a session template", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First create a template
    const created = await caller.sessionTemplates.create({
      name: "Delete Test Template",
      description: "Will be deleted",
      tags: ["delete-test"],
      selectedModel: "codex",
      selectedProfile: "test_gremlin",
      ralphMode: true,
      maxIterations: 100,
      noProgressThreshold: 2,
      autoAskHuman: true,
      safetyMode: "permissive",
    });

    // Then delete it
    const result = await caller.sessionTemplates.delete({ id: created.id });

    expect(result).toEqual({ success: true });
  });
});
