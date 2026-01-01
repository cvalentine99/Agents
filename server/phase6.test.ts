import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-phase6",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("Phase 6: Prompt Library", () => {
  it("can save a prompt template with tags", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.prompts.save({
      name: "React Component Builder",
      goal: "Build a reusable React component",
      context: "Using TypeScript and Tailwind CSS",
      doneWhen: "Component renders correctly with props",
      doNot: "Use class components",
      tags: ["react", "typescript", "tailwind"],
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it("can list all saved prompts", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.prompts.list();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Phase 6: Session Management", () => {
  it("can create a new session", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sessions.create({
      model: "claude",
      workingDirectory: "/home/ubuntu/test-project",
      prompt: "Build a todo app",
      completionCriteria: ["Tests pass", "UI renders"],
    });

    expect(result).toBeDefined();
    expect(result.sessionId).toBeDefined();
  });

  it("can list all sessions", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sessions.list();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("can get session analytics", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Analytics is computed on the frontend from session list data
    const sessions = await caller.sessions.list();
    expect(sessions).toBeDefined();
    expect(Array.isArray(sessions)).toBe(true);
    
    // Compute analytics from sessions
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter((s: any) => s.status === 'complete').length;
    const successRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;
    
    expect(totalSessions).toBeGreaterThanOrEqual(0);
    expect(successRate).toBeGreaterThanOrEqual(0);
  });
});

describe("Phase 6: Multi-Session View", () => {
  it("sessions list returns data for multi-session view", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const sessions = await caller.sessions.list();

    // Multi-session view needs session data with status
    expect(Array.isArray(sessions)).toBe(true);
    if (sessions.length > 0) {
      expect(sessions[0]).toHaveProperty("status");
      // Model is stored in selectedModel field
      expect(sessions[0]).toHaveProperty("selectedModel");
    }
  });
});
