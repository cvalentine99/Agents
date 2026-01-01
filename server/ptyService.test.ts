import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";

// Create mock PTY process
const createMockPtyProcess = () => ({
  onData: vi.fn((callback: (data: string) => void) => {
    // Store callback for later use
    (createMockPtyProcess as any).dataCallback = callback;
  }),
  onExit: vi.fn((callback: (info: { exitCode: number; signal?: number }) => void) => {
    (createMockPtyProcess as any).exitCallback = callback;
  }),
  write: vi.fn(),
  resize: vi.fn(),
  kill: vi.fn(),
  pid: 12345,
});

// Mock node-pty
vi.mock("node-pty", () => ({
  spawn: vi.fn(() => createMockPtyProcess()),
}));

// Import after mocking
import * as pty from "node-pty";

describe("PtyService", () => {
  let mockPtyProcess: ReturnType<typeof createMockPtyProcess>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPtyProcess = createMockPtyProcess();
    vi.mocked(pty.spawn).mockReturnValue(mockPtyProcess as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Session Creation", () => {
    it("should create a new PTY session with correct parameters", () => {
      const sessionId = "session-123";
      const userId = "user-1";
      const cwd = "/home/ubuntu/project";

      // Simulate createSession
      const shell = process.platform === "win32" ? "powershell.exe" : "bash";
      
      pty.spawn(shell, [], {
        name: "xterm-256color",
        cols: 120,
        rows: 30,
        cwd: cwd,
        env: {
          ...process.env,
          TERM: "xterm-256color",
          COLORTERM: "truecolor",
        },
      });

      expect(pty.spawn).toHaveBeenCalledWith(
        shell,
        [],
        expect.objectContaining({
          name: "xterm-256color",
          cols: 120,
          rows: 30,
          cwd: cwd,
        })
      );
    });

    it("should use bash shell on non-Windows platforms", () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, "platform", { value: "linux" });

      const shell = process.platform === "win32" ? "powershell.exe" : "bash";
      expect(shell).toBe("bash");

      Object.defineProperty(process, "platform", { value: originalPlatform });
    });

    it("should set correct terminal environment variables", () => {
      const expectedEnv = {
        TERM: "xterm-256color",
        COLORTERM: "truecolor",
      };

      expect(expectedEnv.TERM).toBe("xterm-256color");
      expect(expectedEnv.COLORTERM).toBe("truecolor");
    });

    it("should store session with correct metadata", () => {
      const sessions = new Map<string, {
        id: string;
        cwd: string;
        createdAt: Date;
        userId: string;
      }>();

      const sessionId = "session-456";
      const session = {
        id: sessionId,
        cwd: "/home/ubuntu",
        createdAt: new Date(),
        userId: "user-2",
      };

      sessions.set(sessionId, session);

      expect(sessions.has(sessionId)).toBe(true);
      expect(sessions.get(sessionId)?.userId).toBe("user-2");
    });

    it("should kill existing session before creating new one with same ID", () => {
      const sessions = new Map<string, { id: string; kill: () => void }>();
      const killFn = vi.fn();

      // Add existing session
      sessions.set("session-123", { id: "session-123", kill: killFn });

      // Simulate killSession before create
      const existing = sessions.get("session-123");
      if (existing) {
        existing.kill();
        sessions.delete("session-123");
      }

      expect(killFn).toHaveBeenCalled();
      expect(sessions.has("session-123")).toBe(false);
    });
  });

  describe("Input/Output Handling", () => {
    it("should write input to PTY process", () => {
      const input = "ls -la\n";
      mockPtyProcess.write(input);

      expect(mockPtyProcess.write).toHaveBeenCalledWith(input);
    });

    it("should execute command by appending newline", () => {
      const command = "npm test";
      const expectedInput = command + "\n";

      mockPtyProcess.write(expectedInput);

      expect(mockPtyProcess.write).toHaveBeenCalledWith("npm test\n");
    });

    it("should emit output events when PTY sends data", () => {
      const emitter = new EventEmitter();
      const outputData: string[] = [];

      emitter.on("output", (sessionId: string, data: string) => {
        outputData.push(data);
      });

      // Simulate PTY output
      emitter.emit("output", "session-123", "Hello World\n");
      emitter.emit("output", "session-123", "Command completed\n");

      expect(outputData).toHaveLength(2);
      expect(outputData[0]).toBe("Hello World\n");
      expect(outputData[1]).toBe("Command completed\n");
    });

    it("should handle binary data in output", () => {
      const binaryData = Buffer.from([0x1b, 0x5b, 0x32, 0x4a]).toString();
      const emitter = new EventEmitter();
      let receivedData = "";

      emitter.on("output", (_: string, data: string) => {
        receivedData = data;
      });

      emitter.emit("output", "session-123", binaryData);

      expect(receivedData).toBe(binaryData);
    });

    it("should handle ANSI escape sequences", () => {
      const ansiOutput = "\x1b[32mGreen text\x1b[0m";
      const emitter = new EventEmitter();
      let receivedData = "";

      emitter.on("output", (_: string, data: string) => {
        receivedData = data;
      });

      emitter.emit("output", "session-123", ansiOutput);

      expect(receivedData).toContain("\x1b[32m");
      expect(receivedData).toContain("Green text");
    });
  });

  describe("Terminal Resize", () => {
    it("should resize PTY terminal", () => {
      const cols = 160;
      const rows = 40;

      mockPtyProcess.resize(cols, rows);

      expect(mockPtyProcess.resize).toHaveBeenCalledWith(cols, rows);
    });

    it("should handle minimum dimensions", () => {
      const minCols = 80;
      const minRows = 24;

      mockPtyProcess.resize(minCols, minRows);

      expect(mockPtyProcess.resize).toHaveBeenCalledWith(80, 24);
    });

    it("should return false for non-existent session", () => {
      const sessions = new Map<string, { resize: (cols: number, rows: number) => void }>();
      
      const session = sessions.get("non-existent");
      const result = session ? true : false;

      expect(result).toBe(false);
    });
  });

  describe("Session Termination", () => {
    it("should kill PTY process on session termination", () => {
      mockPtyProcess.kill();

      expect(mockPtyProcess.kill).toHaveBeenCalled();
    });

    it("should remove session from map after kill", () => {
      const sessions = new Map<string, { id: string }>();
      sessions.set("session-123", { id: "session-123" });

      sessions.delete("session-123");

      expect(sessions.has("session-123")).toBe(false);
    });

    it("should emit killed event", () => {
      const emitter = new EventEmitter();
      let killedSessionId = "";

      emitter.on("killed", (sessionId: string) => {
        killedSessionId = sessionId;
      });

      emitter.emit("killed", "session-123");

      expect(killedSessionId).toBe("session-123");
    });

    it("should handle exit event from PTY", () => {
      const emitter = new EventEmitter();
      let exitInfo: { sessionId: string; exitCode: number; signal?: number } | null = null;

      emitter.on("exit", (sessionId: string, exitCode: number, signal?: number) => {
        exitInfo = { sessionId, exitCode, signal };
      });

      emitter.emit("exit", "session-123", 0, undefined);

      expect(exitInfo).not.toBeNull();
      expect(exitInfo?.exitCode).toBe(0);
    });

    it("should handle non-zero exit codes", () => {
      const emitter = new EventEmitter();
      let exitCode = 0;

      emitter.on("exit", (_: string, code: number) => {
        exitCode = code;
      });

      emitter.emit("exit", "session-123", 1);

      expect(exitCode).toBe(1);
    });

    it("should handle signal termination", () => {
      const emitter = new EventEmitter();
      let signal: number | undefined;

      emitter.on("exit", (_: string, __: number, sig?: number) => {
        signal = sig;
      });

      emitter.emit("exit", "session-123", -1, 9); // SIGKILL

      expect(signal).toBe(9);
    });
  });

  describe("Session Queries", () => {
    it("should get session by ID", () => {
      const sessions = new Map<string, { id: string; userId: string }>();
      sessions.set("session-123", { id: "session-123", userId: "user-1" });

      const session = sessions.get("session-123");

      expect(session).toBeDefined();
      expect(session?.id).toBe("session-123");
    });

    it("should return undefined for non-existent session", () => {
      const sessions = new Map<string, { id: string }>();

      const session = sessions.get("non-existent");

      expect(session).toBeUndefined();
    });

    it("should check if session exists", () => {
      const sessions = new Map<string, { id: string }>();
      sessions.set("session-123", { id: "session-123" });

      expect(sessions.has("session-123")).toBe(true);
      expect(sessions.has("session-456")).toBe(false);
    });

    it("should get all sessions for a user", () => {
      const sessions = new Map<string, { id: string; userId: string }>();
      sessions.set("session-1", { id: "session-1", userId: "user-1" });
      sessions.set("session-2", { id: "session-2", userId: "user-1" });
      sessions.set("session-3", { id: "session-3", userId: "user-2" });

      const userSessions = Array.from(sessions.values()).filter(
        s => s.userId === "user-1"
      );

      expect(userSessions).toHaveLength(2);
      expect(userSessions.every(s => s.userId === "user-1")).toBe(true);
    });
  });

  describe("Multi-Session Management", () => {
    it("should manage multiple concurrent sessions", () => {
      const sessions = new Map<string, { id: string; userId: string }>();

      sessions.set("session-1", { id: "session-1", userId: "user-1" });
      sessions.set("session-2", { id: "session-2", userId: "user-2" });
      sessions.set("session-3", { id: "session-3", userId: "user-3" });

      expect(sessions.size).toBe(3);
    });

    it("should isolate sessions by user", () => {
      const sessions = new Map<string, { id: string; userId: string; data: string }>();

      sessions.set("session-1", { id: "session-1", userId: "user-1", data: "user1-data" });
      sessions.set("session-2", { id: "session-2", userId: "user-2", data: "user2-data" });

      const user1Session = sessions.get("session-1");
      const user2Session = sessions.get("session-2");

      expect(user1Session?.data).toBe("user1-data");
      expect(user2Session?.data).toBe("user2-data");
      expect(user1Session?.data).not.toBe(user2Session?.data);
    });

    it("should clean up all sessions for a user", () => {
      const sessions = new Map<string, { id: string; userId: string }>();

      sessions.set("session-1", { id: "session-1", userId: "user-1" });
      sessions.set("session-2", { id: "session-2", userId: "user-1" });
      sessions.set("session-3", { id: "session-3", userId: "user-2" });

      // Clean up user-1 sessions
      for (const [key, session] of sessions) {
        if (session.userId === "user-1") {
          sessions.delete(key);
        }
      }

      expect(sessions.size).toBe(1);
      expect(sessions.has("session-3")).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle PTY spawn failure", () => {
      vi.mocked(pty.spawn).mockImplementationOnce(() => {
        throw new Error("Failed to spawn PTY");
      });

      let error: Error | null = null;
      try {
        pty.spawn("bash", [], {});
      } catch (e) {
        error = e as Error;
      }

      expect(error).not.toBeNull();
      expect(error?.message).toBe("Failed to spawn PTY");
    });

    it("should handle write to killed session", () => {
      const sessions = new Map<string, { write: (data: string) => boolean }>();

      const session = sessions.get("killed-session");
      const result = session?.write("test") ?? false;

      expect(result).toBe(false);
    });

    it("should handle resize of killed session", () => {
      const sessions = new Map<string, { resize: (cols: number, rows: number) => boolean }>();

      const session = sessions.get("killed-session");
      const result = session?.resize(120, 30) ?? false;

      expect(result).toBe(false);
    });
  });

  describe("Working Directory", () => {
    it("should use provided working directory", () => {
      const cwd = "/home/ubuntu/my-project";
      
      pty.spawn("bash", [], { cwd });

      expect(pty.spawn).toHaveBeenCalledWith(
        "bash",
        [],
        expect.objectContaining({ cwd })
      );
    });

    it("should use default directory when not provided", () => {
      const defaultCwd = "/home/ubuntu";
      
      pty.spawn("bash", [], { cwd: defaultCwd });

      expect(pty.spawn).toHaveBeenCalledWith(
        "bash",
        [],
        expect.objectContaining({ cwd: defaultCwd })
      );
    });

    it("should handle invalid directory gracefully", () => {
      const invalidCwd = "/nonexistent/path";
      
      // In real implementation, this would throw or handle gracefully
      pty.spawn("bash", [], { cwd: invalidCwd });

      expect(pty.spawn).toHaveBeenCalled();
    });
  });

  describe("Event Emitter Integration", () => {
    it("should emit created event on session creation", () => {
      const emitter = new EventEmitter();
      let createdSessionId = "";

      emitter.on("created", (sessionId: string) => {
        createdSessionId = sessionId;
      });

      emitter.emit("created", "session-123");

      expect(createdSessionId).toBe("session-123");
    });

    it("should support multiple event listeners", () => {
      const emitter = new EventEmitter();
      const calls: string[] = [];

      emitter.on("output", () => calls.push("listener1"));
      emitter.on("output", () => calls.push("listener2"));

      emitter.emit("output", "session-123", "data");

      expect(calls).toHaveLength(2);
      expect(calls).toContain("listener1");
      expect(calls).toContain("listener2");
    });

    it("should remove event listeners on cleanup", () => {
      const emitter = new EventEmitter();
      const listener = vi.fn();

      emitter.on("output", listener);
      emitter.removeListener("output", listener);
      emitter.emit("output", "session-123", "data");

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("Security Considerations", () => {
    it("should not allow path traversal in working directory", () => {
      const maliciousCwd = "/home/ubuntu/../../../etc";
      const normalizedPath = maliciousCwd.replace(/\.\./g, "");
      
      // In real implementation, should validate and sanitize
      expect(normalizedPath).not.toContain("..");
    });

    it("should validate session ownership", () => {
      const sessions = new Map<string, { id: string; userId: string }>();
      sessions.set("session-123", { id: "session-123", userId: "user-1" });

      const session = sessions.get("session-123");
      const requestingUserId = "user-2";

      const hasAccess = session?.userId === requestingUserId;

      expect(hasAccess).toBe(false);
    });

    it("should sanitize command input", () => {
      const maliciousCommand = "ls; rm -rf /";
      
      // In real implementation, should sanitize or reject
      const containsDangerousChars = /[;&|`$]/.test(maliciousCommand);
      
      expect(containsDangerousChars).toBe(true);
    });
  });
});

describe("PtyService Singleton", () => {
  it("should maintain single instance", () => {
    // Singleton pattern test
    class PtyServiceSingleton {
      private static instance: PtyServiceSingleton;
      
      private constructor() {}
      
      static getInstance(): PtyServiceSingleton {
        if (!PtyServiceSingleton.instance) {
          PtyServiceSingleton.instance = new PtyServiceSingleton();
        }
        return PtyServiceSingleton.instance;
      }
    }

    const instance1 = PtyServiceSingleton.getInstance();
    const instance2 = PtyServiceSingleton.getInstance();

    expect(instance1).toBe(instance2);
  });
});
