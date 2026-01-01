import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { WebSocketServer, WebSocket } from "ws";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { startCliStream, stopCliProcess } from "../cliStream";
import { streamRagChat } from "../ragStream";
import { ptyService } from "../ptyService";
import { ralphEngine } from "../ralphEngine";

// SECURITY: Rate limiting configuration
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: "Too many requests, please try again later." },
  skip: req => req.path === "/api/health", // Skip rate limiting for health checks
});

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 auth requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many authentication attempts, please try again later.",
  },
});

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

// Store active WebSocket connections by session
const wsConnections: Map<number, Set<WebSocket>> = new Map();

async function startServer() {
  const app = express();

  // SECURITY: Trust proxy for rate limiting when behind a reverse proxy
  app.set("trust proxy", 1);

  const server = createServer(app);

  // Create WebSocket servers with noServer mode to handle upgrades manually
  const wss = new WebSocketServer({ noServer: true });
  const ptyWss = new WebSocketServer({ noServer: true });
  const ralphWss = new WebSocketServer({ noServer: true });

  // Handle WebSocket upgrades manually to avoid conflicts with Vite
  server.on("upgrade", (request, socket, head) => {
    const pathname = request.url || "";

    if (pathname === "/api/ws/cli") {
      wss.handleUpgrade(request, socket, head, ws => {
        wss.emit("connection", ws, request);
      });
    } else if (pathname === "/api/ws/pty") {
      ptyWss.handleUpgrade(request, socket, head, ws => {
        ptyWss.emit("connection", ws, request);
      });
    } else if (pathname === "/api/ws/ralph") {
      ralphWss.handleUpgrade(request, socket, head, ws => {
        ralphWss.emit("connection", ws, request);
      });
    }
    // Let Vite handle HMR WebSocket connections (don't destroy socket for unknown paths)
  });

  wss.on("connection", (ws: WebSocket) => {
    let currentSessionId: number | null = null;

    ws.on("message", async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());

        switch (data.type) {
          case "start":
            // Start a new CLI stream
            currentSessionId = data.sessionId;

            // Add to connections map
            if (!wsConnections.has(data.sessionId)) {
              wsConnections.set(data.sessionId, new Set());
            }
            wsConnections.get(data.sessionId)?.add(ws);

            // Start the CLI process
            await startCliStream(ws, {
              sessionId: data.sessionId,
              userId: data.userId,
              prompt: data.prompt,
              workingDirectory: data.workingDirectory,
              model: data.model,
              maxIterations: data.maxIterations,
              dangerouslySkipPermissions:
                data.dangerouslySkipPermissions ?? true,
            });
            break;

          case "stop":
            // Stop the CLI process
            if (data.sessionId) {
              stopCliProcess(data.sessionId);
              ws.send(
                JSON.stringify({
                  type: "status",
                  data: "Process stopped by user",
                  timestamp: Date.now(),
                })
              );
            }
            break;

          case "ping":
            // Keep-alive ping
            ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
            break;
        }
      } catch (error) {
        ws.send(
          JSON.stringify({
            type: "error",
            data: `Invalid message: ${error instanceof Error ? error.message : "Unknown error"}`,
            timestamp: Date.now(),
          })
        );
      }
    });

    ws.on("close", () => {
      // Remove from connections map
      if (currentSessionId !== null) {
        wsConnections.get(currentSessionId)?.delete(ws);
        if (wsConnections.get(currentSessionId)?.size === 0) {
          wsConnections.delete(currentSessionId);
        }
      }
    });

    ws.on("error", error => {
      console.error("[WebSocket] Error:", error.message);
    });

    // Send initial connection confirmation
    ws.send(
      JSON.stringify({
        type: "connected",
        data: "WebSocket connected to CLI stream",
        timestamp: Date.now(),
      })
    );
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // LOGGING: Request logging for debugging and security auditing
  // Use 'combined' format in production for detailed logs, 'dev' for development
  const logFormat = process.env.NODE_ENV === "production" ? "combined" : "dev";
  app.use(
    morgan(logFormat, {
      // Skip logging for health check endpoints to reduce noise
      skip: req => req.url === "/api/health",
    })
  );

  // SECURITY: Apply rate limiting to API routes
  app.use("/api/", apiLimiter);
  app.use("/api/oauth/", authLimiter);

  // Health check endpoint (not rate limited)
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // RAG Streaming endpoint (SSE)
  app.get("/api/rag/stream", async (req, res) => {
    const { userId, conversationId, message } = req.query;

    if (!userId || !conversationId || !message) {
      res.status(400).json({ error: "Missing required parameters" });
      return;
    }

    await streamRagChat(res, {
      userId: parseInt(userId as string),
      conversationId: parseInt(conversationId as string),
      message: message as string,
    });
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // PTY WebSocket handler - REAL terminal
  ptyWss.on("connection", (ws: WebSocket) => {
    let sessionId: string | null = null;
    let outputHandler: ((sid: string, output: string) => void) | null = null;
    let exitHandler: ((sid: string, exitCode: number) => void) | null = null;

    ws.on("message", (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());

        switch (data.type) {
          case "create": {
            // Create new PTY session
            sessionId = data.sessionId || `pty-${Date.now()}`;
            const cwd = data.cwd || "/home/ubuntu";
            ptyService.createSession(
              sessionId!,
              data.userId || "anonymous",
              cwd
            );

            // Create handlers that capture the current sessionId
            const currentSessionId = sessionId;

            outputHandler = (sid: string, output: string) => {
              if (sid === currentSessionId && ws.readyState === 1) {
                ws.send(
                  JSON.stringify({
                    type: "output",
                    data: output,
                    timestamp: Date.now(),
                  })
                );
              }
            };

            exitHandler = (sid: string, exitCode: number) => {
              if (sid === currentSessionId && ws.readyState === 1) {
                ws.send(
                  JSON.stringify({
                    type: "exit",
                    exitCode,
                    timestamp: Date.now(),
                  })
                );
              }
            };

            // Forward PTY output to WebSocket
            ptyService.on("output", outputHandler);
            ptyService.on("exit", exitHandler);

            ws.send(
              JSON.stringify({
                type: "created",
                sessionId,
                cwd,
                timestamp: Date.now(),
              })
            );
            break;
          }

          case "input":
            // Send input to PTY
            if (sessionId) {
              ptyService.write(sessionId, data.data);
            }
            break;

          case "resize":
            // Resize PTY
            if (sessionId && data.cols && data.rows) {
              ptyService.resize(sessionId, data.cols, data.rows);
            }
            break;

          case "kill":
            // Kill PTY session
            if (sessionId) {
              ptyService.killSession(sessionId);
              ws.send(
                JSON.stringify({
                  type: "killed",
                  sessionId,
                  timestamp: Date.now(),
                })
              );
            }
            break;
        }
      } catch (error) {
        ws.send(
          JSON.stringify({
            type: "error",
            error: String(error),
            timestamp: Date.now(),
          })
        );
      }
    });

    ws.on("close", () => {
      // Clean up event listeners
      if (outputHandler) ptyService.off("output", outputHandler);
      if (exitHandler) ptyService.off("exit", exitHandler);
      if (sessionId) {
        ptyService.killSession(sessionId);
      }
    });

    ws.send(JSON.stringify({ type: "ready", timestamp: Date.now() }));
  });

  // RALPH Engine WebSocket handler
  ralphWss.on("connection", (ws: WebSocket) => {
    let sessionId: string | null = null;

    ws.on("message", async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());

        switch (data.type) {
          case "start":
            sessionId = data.config.sessionId;

            // Listen to RALPH events
            ralphEngine.on("log", (sid: string, log: string) => {
              if (sid === sessionId && ws.readyState === 1) {
                ws.send(
                  JSON.stringify({
                    type: "log",
                    data: log,
                    timestamp: Date.now(),
                  })
                );
              }
            });

            ralphEngine.on("output", (sid: string, output: string) => {
              if (sid === sessionId && ws.readyState === 1) {
                ws.send(
                  JSON.stringify({
                    type: "output",
                    data: output,
                    timestamp: Date.now(),
                  })
                );
              }
            });

            ralphEngine.on("stateChange", (sid: string, state: unknown) => {
              if (sid === sessionId && ws.readyState === 1) {
                ws.send(
                  JSON.stringify({
                    type: "state",
                    data: state,
                    timestamp: Date.now(),
                  })
                );
              }
            });

            ralphEngine.on(
              "iterationComplete",
              (sid: string, iteration: unknown) => {
                if (sid === sessionId && ws.readyState === 1) {
                  ws.send(
                    JSON.stringify({
                      type: "iteration",
                      data: iteration,
                      timestamp: Date.now(),
                    })
                  );
                }
              }
            );

            ralphEngine.on("complete", (sid: string, state: unknown) => {
              if (sid === sessionId && ws.readyState === 1) {
                ws.send(
                  JSON.stringify({
                    type: "complete",
                    data: state,
                    timestamp: Date.now(),
                  })
                );
              }
            });

            // Start the RALPH loop
            await ralphEngine.startSession(data.config);
            break;

          case "pause":
            if (sessionId) {
              ralphEngine.pauseSession(sessionId);
            }
            break;

          case "resume":
            if (sessionId) {
              await ralphEngine.resumeSession(sessionId);
            }
            break;

          case "stop":
            if (sessionId) {
              ralphEngine.stopSession(sessionId);
            }
            break;

          case "resetCircuitBreaker":
            if (sessionId) {
              ralphEngine.resetCircuitBreaker(sessionId);
            }
            break;
        }
      } catch (error) {
        ws.send(
          JSON.stringify({
            type: "error",
            error: String(error),
            timestamp: Date.now(),
          })
        );
      }
    });

    ws.on("close", () => {
      if (sessionId) {
        ralphEngine.stopSession(sessionId);
      }
    });

    ws.send(JSON.stringify({ type: "ready", timestamp: Date.now() }));
  });

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    console.log(
      `WebSocket CLI stream available at ws://localhost:${port}/api/ws/cli`
    );
    console.log(
      `WebSocket PTY terminal available at ws://localhost:${port}/api/ws/pty`
    );
    console.log(
      `WebSocket RALPH engine available at ws://localhost:${port}/api/ws/ralph`
    );
  });
}

startServer().catch(console.error);
