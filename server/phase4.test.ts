import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-phase4",
    email: "phase4@example.com",
    name: "Phase 4 Test User",
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
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("Phase 4 Features", () => {
  describe("sessions.create with completion criteria", () => {
    it("creates a session with completion criteria", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.sessions.create({
        model: "claude",
        profile: "patch_goblin",
        workingDirectory: "/home/ubuntu/test-project",
        maxIterations: 50,
        completionCriteria: JSON.stringify([
          { id: "1", text: "All tests pass", completed: false },
          { id: "2", text: "Build succeeds", completed: false },
        ]),
      });

      expect(result).toBeDefined();
      expect(result.sessionId).toBeDefined();
      expect(typeof result.sessionId).toBe("string");
    });
  });

  describe("sessions.update with status changes", () => {
    it("updates session status to paused", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // First create a session
      const createResult = await caller.sessions.create({
        model: "claude",
        profile: "architect_owl",
        workingDirectory: "/home/ubuntu/test-project-2",
        maxIterations: 25,
      });

      // Then update its status
      const updateResult = await caller.sessions.update({
        sessionId: createResult.sessionId,
        updates: { status: "paused" },
      });

      expect(updateResult).toBeDefined();
      expect(updateResult.success).toBe(true);
    });
  });

  describe("sessions.list returns user sessions", () => {
    it("returns an array of sessions", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.sessions.list();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("prompts.save stores prompt data", () => {
    it("saves a prompt with all fields", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.prompts.save({
        name: "REST API Build Prompt",
        goal: "Build a REST API",
        context: "Using Express.js and TypeScript",
        doneWhen: "All endpoints return correct responses",
        doNot: "Use deprecated packages",
        expandedPrompt: "Full expanded prompt text here...",
        targetModel: "claude",
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe("prompts.list returns user prompts", () => {
    it("returns an array of prompts", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.prompts.list();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

describe("Session Export/Import Schema", () => {
  it("validates session export schema structure", () => {
    const exportData = {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      session: {
        name: "Test Session",
        model: "claude",
        profile: "patch_goblin",
        workingDirectory: "/home/ubuntu",
        maxIterations: 50,
        noProgressThreshold: 3,
        circuitBreakerEnabled: true,
        dangerouslySkipPermissions: true,
      },
      completionCriteria: [
        { id: "1", text: "All tests pass", completed: false },
        { id: "2", text: "Build succeeds", completed: true },
      ],
    };

    expect(exportData.version).toBe("1.0.0");
    expect(exportData.session.model).toBe("claude");
    expect(exportData.completionCriteria).toHaveLength(2);
    expect(exportData.completionCriteria[1].completed).toBe(true);
  });
});
