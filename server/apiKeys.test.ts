import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database functions
vi.mock("./db", () => ({
  saveApiKey: vi.fn().mockResolvedValue({}),
  getUserApiKeys: vi.fn().mockResolvedValue([
    { id: 1, provider: "claude", keyHint: "abc1", isValid: true, createdAt: new Date() },
    { id: 2, provider: "codex", keyHint: "xyz2", isValid: true, createdAt: new Date() },
  ]),
  getApiKeyForProvider: vi.fn().mockResolvedValue({
    id: 1,
    provider: "claude",
    encryptedKey: "mock-encrypted",
    keyHint: "abc1",
    isValid: true,
  }),
  deleteApiKey: vi.fn().mockResolvedValue({}),
  updateApiKeyValidity: vi.fn().mockResolvedValue({}),
}));

// Mock crypto functions
vi.mock("./crypto", () => ({
  encrypt: vi.fn().mockReturnValue("encrypted-key-data"),
  decrypt: vi.fn().mockReturnValue("sk-ant-test-key-abc1"),
  getKeyHint: vi.fn().mockReturnValue("abc1"),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
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

describe("apiKeys router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves an API key and returns key hint", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.apiKeys.save({
      provider: "claude",
      apiKey: "sk-ant-test-key-abc1",
    });

    expect(result).toEqual({ success: true, keyHint: "abc1" });
  });

  it("lists user API keys without exposing actual keys", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.apiKeys.list();

    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0]).toHaveProperty("provider");
    expect(result[0]).toHaveProperty("keyHint");
    expect(result[0]).not.toHaveProperty("encryptedKey");
  });

  it("gets API key metadata for a specific provider", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.apiKeys.getForProvider({ provider: "claude" });

    expect(result).not.toBeNull();
    expect(result?.provider).toBe("claude");
    expect(result?.keyHint).toBe("abc1");
    expect(result?.isValid).toBe(true);
  });

  it("validates Claude API key format", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.apiKeys.validate({ provider: "claude" });

    expect(result.valid).toBe(true);
  });

  it("deletes an API key", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.apiKeys.delete({ id: 1 });

    expect(result).toEqual({ success: true });
  });
});

describe("sessions router", () => {
  it("creates a new session with startLoop", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Mock the session creation
    vi.mock("./db", async (importOriginal) => {
      const actual = await importOriginal() as Record<string, unknown>;
      return {
        ...actual,
        createSession: vi.fn().mockResolvedValue({}),
        getSessionBySessionId: vi.fn().mockResolvedValue({
          id: 1,
          sessionId: "session-test123",
          userId: 1,
          status: "running",
        }),
      };
    });

    const result = await caller.sessions.startLoop({
      config: {
        name: "Test Session",
        ralphMode: true,
        maxIterations: 50,
        noProgressThreshold: 3,
        autoAskHuman: true,
        safetyMode: "standard",
        selectedModel: "claude",
        selectedProfile: "patch_goblin",
      },
      prompt: "Build a todo app",
      workingDirectory: "/home/ubuntu/test-project",
    });

    expect(result).toHaveProperty("sessionId");
    expect(result.sessionId).toMatch(/^session-/);
    expect(result).toHaveProperty("message");
  });
});
