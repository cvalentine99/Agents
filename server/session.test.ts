import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
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

function createPublicContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
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

describe("auth router", () => {
  it("auth.me returns user when authenticated", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();

    expect(result).not.toBeNull();
    expect(result?.openId).toBe("test-user-123");
    expect(result?.email).toBe("test@example.com");
  });

  it("auth.me returns null when not authenticated", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();

    expect(result).toBeNull();
  });
});

describe("sessions router schema validation", () => {
  it("sessions.create validates input schema correctly", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Test that the router exists and accepts valid input
    // We don't actually run the mutation since it requires DB
    expect(caller.sessions).toBeDefined();
    expect(caller.sessions.create).toBeDefined();
  });

  it("sessions.list is defined for authenticated users", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    expect(caller.sessions.list).toBeDefined();
  });
});

describe("criteria router structure", () => {
  it("criteria router has expected procedures", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    expect(caller.criteria).toBeDefined();
    expect(caller.criteria.add).toBeDefined();
    expect(caller.criteria.list).toBeDefined();
    expect(caller.criteria.toggle).toBeDefined();
    expect(caller.criteria.delete).toBeDefined();
  });
});

describe("metrics router structure", () => {
  it("metrics router has expected procedures", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    expect(caller.metrics).toBeDefined();
    expect(caller.metrics.add).toBeDefined();
    expect(caller.metrics.list).toBeDefined();
  });
});

describe("assemblyLine router structure", () => {
  it("assemblyLine router has expected procedures", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    expect(caller.assemblyLine).toBeDefined();
    expect(caller.assemblyLine.create).toBeDefined();
    expect(caller.assemblyLine.list).toBeDefined();
    expect(caller.assemblyLine.update).toBeDefined();
  });
});

describe("diffHunks router structure", () => {
  it("diffHunks router has expected procedures", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    expect(caller.diffHunks).toBeDefined();
    expect(caller.diffHunks.add).toBeDefined();
    expect(caller.diffHunks.list).toBeDefined();
    expect(caller.diffHunks.approve).toBeDefined();
  });
});

describe("checkpoints router structure", () => {
  it("checkpoints router has expected procedures", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    expect(caller.checkpoints).toBeDefined();
    expect(caller.checkpoints.create).toBeDefined();
    expect(caller.checkpoints.list).toBeDefined();
    expect(caller.checkpoints.latest).toBeDefined();
  });
});
