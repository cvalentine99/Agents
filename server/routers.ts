import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
import * as db from "./db";
import { encrypt, decrypt, getKeyHint } from "./crypto";
import { generateResearchPDF, generatePDFFilename } from "./pdfGenerator";
import * as rag from "./rag";
import * as ragFileUpload from "./ragFileUpload";
import * as promptMd from "./promptMd";
import * as autoSign from "./autoSignSuggestions";
import * as fileBrowser from "./fileBrowser";

// Session configuration schema
const sessionConfigSchema = z.object({
  name: z.string().optional(),
  ralphMode: z.boolean().default(true),
  maxIterations: z.number().min(5).max(200).default(50),
  noProgressThreshold: z.number().min(1).max(20).default(3),
  autoAskHuman: z.boolean().default(true),
  safetyMode: z.enum(["standard", "strict", "permissive"]).default("standard"),
  selectedModel: z.enum(["codex", "claude", "gemini", "manus"]).default("claude"),
  selectedProfile: z.string().default("patch_goblin"), // Built-in or custom profile ID
});

// Prompt schema
const promptSchema = z.object({
  name: z.string(),
  goal: z.string(),
  context: z.string().optional(),
  doneWhen: z.string().optional(),
  doNot: z.string().optional(),
  expandedPrompt: z.string().optional(),
  completionPromise: z.string().optional(),
  targetModel: z.enum(["codex", "claude", "gemini", "manus"]).optional(),
  packId: z.string().optional(),
});

// Provider type
const providerSchema = z.enum(["codex", "claude", "gemini", "manus"]);

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ==================== API KEYS ====================
  apiKeys: router({
    // Save/update API key
    save: protectedProcedure
      .input(z.object({
        provider: providerSchema,
        apiKey: z.string().min(10),
      }))
      .mutation(async ({ ctx, input }) => {
        const encryptedKey = encrypt(input.apiKey);
        const keyHint = getKeyHint(input.apiKey);
        
        await db.saveApiKey({
          userId: ctx.user.id,
          provider: input.provider,
          encryptedKey,
          keyHint,
          isValid: true,
        });
        
        return { success: true, keyHint };
      }),

    // Get all user API keys (metadata only, not the actual keys)
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserApiKeys(ctx.user.id);
    }),

    // Delete API key
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteApiKey(input.id, ctx.user.id);
        return { success: true };
      }),

    // Validate API key (test connection)
    validate: protectedProcedure
      .input(z.object({ provider: providerSchema }))
      .mutation(async ({ ctx, input }) => {
        const apiKeyRecord = await db.getApiKeyForProvider(ctx.user.id, input.provider);
        if (!apiKeyRecord) {
          return { valid: false, error: "No API key found for this provider" };
        }
        
        try {
          const apiKey = decrypt(apiKeyRecord.encryptedKey);
          
          // Basic validation - check if key has expected format
          let isValid = false;
          switch (input.provider) {
            case "claude":
              isValid = apiKey.startsWith("sk-ant-") || apiKey.startsWith("sk-");
              break;
            case "codex":
              isValid = apiKey.startsWith("sk-") || apiKey.startsWith("sess-");
              break;
            case "gemini":
              isValid = apiKey.length > 20;
              break;
            case "manus":
              isValid = apiKey.length > 10;
              break;
          }
          
          await db.updateApiKeyValidity(apiKeyRecord.id, isValid);
          return { valid: isValid };
        } catch {
          await db.updateApiKeyValidity(apiKeyRecord.id, false);
          return { valid: false, error: "Failed to decrypt API key" };
        }
      }),

    // Get decrypted key for internal use (returns masked version for display)
    getForProvider: protectedProcedure
      .input(z.object({ provider: providerSchema }))
      .query(async ({ ctx, input }) => {
        const apiKeyRecord = await db.getApiKeyForProvider(ctx.user.id, input.provider);
        if (!apiKeyRecord) return null;
        
        return {
          id: apiKeyRecord.id,
          provider: apiKeyRecord.provider,
          keyHint: apiKeyRecord.keyHint,
          isValid: apiKeyRecord.isValid,
        };
      }),
  }),

  // ==================== SESSIONS ====================
  sessions: router({
    // Create a new session
    create: protectedProcedure
      .input(sessionConfigSchema)
      .mutation(async ({ ctx, input }) => {
        const sessionId = `session-${nanoid(12)}`;
        await db.createSession({
          userId: ctx.user.id,
          sessionId,
          ...input,
        });
        return { sessionId };
      }),

    // Get all user sessions
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserSessions(ctx.user.id);
    }),

    // Get a specific session
    get: protectedProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ ctx, input }) => {
        const session = await db.getSessionBySessionId(input.sessionId);
        // SECURITY: Verify ownership to prevent IDOR
        if (!session || session.userId !== ctx.user.id) {
          return null;
        }
        return session;
      }),

    // Update session
    update: protectedProcedure
      .input(z.object({
        sessionId: z.string(),
        updates: z.object({
          status: z.enum(["idle", "running", "paused", "complete", "failed"]).optional(),
          currentIteration: z.number().optional(),
          completionProgress: z.number().optional(),
          circuitBreakerState: z.enum(["CLOSED", "HALF_OPEN", "OPEN"]).optional(),
          noProgressCount: z.number().optional(),
          selectedModel: z.enum(["codex", "claude", "gemini", "manus"]).optional(),
          selectedProfile: z.string().optional(), // Built-in or custom profile ID
          startedAt: z.date().optional(),
          completedAt: z.date().optional(),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        // SECURITY: Verify ownership to prevent IDOR
        const session = await db.getSessionBySessionId(input.sessionId);
        if (!session || session.userId !== ctx.user.id) {
          throw new Error("Session not found or access denied");
        }
        await db.updateSession(input.sessionId, input.updates);
        return { success: true };
      }),

    // Delete session
    delete: protectedProcedure
      .input(z.object({ sessionId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        // SECURITY: Verify ownership to prevent IDOR
        const session = await db.getSessionBySessionId(input.sessionId);
        if (!session || session.userId !== ctx.user.id) {
          throw new Error("Session not found or access denied");
        }
        await db.deleteSession(input.sessionId);
        return { success: true };
      }),

    // Start a loop (creates session + starts CLI execution)
    startLoop: protectedProcedure
      .input(z.object({
        config: sessionConfigSchema,
        prompt: z.string(),
        workingDirectory: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Create session
        const sessionId = `session-${nanoid(12)}`;
        await db.createSession({
          userId: ctx.user.id,
          sessionId,
          ...input.config,
          status: "running",
          startedAt: new Date(),
        });
        
        // Get session to get the database ID
        const session = await db.getSessionBySessionId(sessionId);
        if (!session) throw new Error("Failed to create session");
        
        return { 
          sessionId, 
          sessionDbId: session.id,
          message: "Session created. Connect to WebSocket for CLI output streaming." 
        };
      }),
  }),

  // ==================== CLI EXECUTION ====================
  cli: router({
    // Create CLI execution record
    create: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        iteration: z.number(),
        command: z.string(),
        workingDirectory: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // SECURITY: Verify session ownership to prevent IDOR
        const session = await db.getSessionById(input.sessionId);
        if (!session || session.userId !== ctx.user.id) {
          throw new Error("Session not found or access denied");
        }
        const _result = await db.createCliExecution(input);
        return { success: true };
      }),

    // Update CLI execution
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        sessionId: z.number(), // Added for ownership verification
        updates: z.object({
          pid: z.number().optional(),
          exitCode: z.number().optional(),
          stdout: z.string().optional(),
          stderr: z.string().optional(),
          status: z.enum(["running", "completed", "failed", "killed"]).optional(),
          completedAt: z.date().optional(),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        // SECURITY: Verify session ownership to prevent IDOR
        const session = await db.getSessionById(input.sessionId);
        if (!session || session.userId !== ctx.user.id) {
          throw new Error("Session not found or access denied");
        }
        await db.updateCliExecution(input.id, input.updates);
        return { success: true };
      }),

    // Get session CLI executions
    list: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ ctx, input }) => {
        // SECURITY: Verify session ownership to prevent IDOR
        const session = await db.getSessionById(input.sessionId);
        if (!session || session.userId !== ctx.user.id) {
          return [];
        }
        return db.getSessionCliExecutions(input.sessionId);
      }),

    // Get running executions (only user's own)
    running: protectedProcedure.query(async ({ ctx }) => {
      const executions = await db.getRunningExecutions();
      // SECURITY: Filter to only user's own sessions
      const userSessions = await db.getUserSessions(ctx.user.id);
      const userSessionIds = new Set(userSessions.map(s => s.id));
      return executions.filter(e => userSessionIds.has(e.sessionId));
    }),
  }),

  // ==================== COMPLETION CRITERIA ====================
  criteria: router({
    add: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        text: z.string(),
        orderIndex: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // SECURITY: Verify session ownership to prevent IDOR
        const session = await db.getSessionById(input.sessionId);
        if (!session || session.userId !== ctx.user.id) {
          throw new Error("Session not found or access denied");
        }
        await db.addCompletionCriterion(input);
        return { success: true };
      }),

    list: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ ctx, input }) => {
        // SECURITY: Verify session ownership to prevent IDOR
        const session = await db.getSessionById(input.sessionId);
        if (!session || session.userId !== ctx.user.id) {
          return [];
        }
        return db.getSessionCriteria(input.sessionId);
      }),

    toggle: protectedProcedure
      .input(z.object({ id: z.number(), sessionId: z.number(), checked: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        // SECURITY: Verify session ownership to prevent IDOR
        const session = await db.getSessionById(input.sessionId);
        if (!session || session.userId !== ctx.user.id) {
          throw new Error("Session not found or access denied");
        }
        await db.updateCriterion(input.id, input.checked);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number(), sessionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // SECURITY: Verify session ownership to prevent IDOR
        const session = await db.getSessionById(input.sessionId);
        if (!session || session.userId !== ctx.user.id) {
          throw new Error("Session not found or access denied");
        }
        await db.deleteCriterion(input.id);
        return { success: true };
      }),
  }),

  // ==================== METRICS ====================
  metrics: router({
    add: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        iteration: z.number(),
        diffLines: z.number(),
        testsRun: z.number(),
        testsPassed: z.number(),
        errorsDetected: z.number(),
        duration: z.number(),
        model: z.enum(["codex", "claude", "gemini", "manus"]),
      }))
      .mutation(async ({ input }) => {
        await db.addLoopMetric(input);
        return { success: true };
      }),

    list: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        return db.getSessionMetrics(input.sessionId);
      }),
  }),

  // ==================== FILE CHANGES ====================
  fileChanges: router({
    add: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        iteration: z.number(),
        path: z.string(),
        changeType: z.enum(["added", "modified", "deleted"]),
        linesAdded: z.number(),
        linesRemoved: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.addFileChange(input);
        return { success: true };
      }),

    list: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        return db.getSessionFileChanges(input.sessionId);
      }),
  }),

  // ==================== SAVED PROMPTS ====================
  prompts: router({
    save: protectedProcedure
      .input(promptSchema)
      .mutation(async ({ ctx, input }) => {
        await db.savePrompt({
          userId: ctx.user.id,
          ...input,
        });
        return { success: true };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserPrompts(ctx.user.id);
    }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deletePrompt(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ==================== ASSEMBLY LINE ====================
  assemblyLine: router({
    create: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        stageConfig: z.string(),
      }))
      .mutation(async ({ input }) => {
        await db.createAssemblyLineRun(input);
        return { success: true };
      }),

    list: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        return db.getSessionAssemblyRuns(input.sessionId);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        updates: z.object({
          status: z.enum(["pending", "running", "complete", "failed"]).optional(),
          currentStage: z.string().optional(),
          output: z.string().optional(),
          startedAt: z.date().optional(),
          completedAt: z.date().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await db.updateAssemblyLineRun(input.id, input.updates);
        return { success: true };
      }),
  }),

  // ==================== DIFF HUNKS ====================
  diffHunks: router({
    add: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        iteration: z.number(),
        filePath: z.string(),
        hunkHeader: z.string(),
        content: z.string(),
      }))
      .mutation(async ({ input }) => {
        await db.addDiffHunk(input);
        return { success: true };
      }),

    list: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        return db.getSessionDiffHunks(input.sessionId);
      }),

    approve: protectedProcedure
      .input(z.object({ id: z.number(), approved: z.boolean() }))
      .mutation(async ({ input }) => {
        await db.approveDiffHunk(input.id, input.approved);
        return { success: true };
      }),
  }),

  // ==================== SESSION TEMPLATES ====================
  sessionTemplates: router({
    // Create a new session template
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        selectedModel: z.enum(["codex", "claude", "gemini", "manus"]).default("claude"),
        selectedProfile: z.string().default("patch_goblin"), // Built-in or custom profile ID
        ralphMode: z.boolean().default(true),
        maxIterations: z.number().min(5).max(200).default(50),
        noProgressThreshold: z.number().min(1).max(20).default(3),
        autoAskHuman: z.boolean().default(true),
        safetyMode: z.enum(["standard", "strict", "permissive"]).default("standard"),
        promptGoal: z.string().optional(),
        promptContext: z.string().optional(),
        promptDoneWhen: z.string().optional(),
        promptDoNot: z.string().optional(),
        completionCriteria: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.createSessionTemplate({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          tags: input.tags ? JSON.stringify(input.tags) : null,
          selectedModel: input.selectedModel,
          selectedProfile: input.selectedProfile,
          ralphMode: input.ralphMode,
          maxIterations: input.maxIterations,
          noProgressThreshold: input.noProgressThreshold,
          autoAskHuman: input.autoAskHuman,
          safetyMode: input.safetyMode,
          promptGoal: input.promptGoal,
          promptContext: input.promptContext,
          promptDoneWhen: input.promptDoneWhen,
          promptDoNot: input.promptDoNot,
          completionCriteria: input.completionCriteria ? JSON.stringify(input.completionCriteria) : null,
        });
        return { id: result.insertId, name: input.name, success: true };
      }),

    // List all user templates
    list: protectedProcedure.query(async ({ ctx }) => {
      const templates = await db.getUserSessionTemplates(ctx.user.id);
      return templates.map(t => ({
        ...t,
        tags: t.tags ? JSON.parse(t.tags) : [],
        completionCriteria: t.completionCriteria ? JSON.parse(t.completionCriteria) : [],
      }));
    }),

    // Get a specific template
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const template = await db.getSessionTemplateById(input.id, ctx.user.id);
        if (!template) return null;
        return {
          ...template,
          tags: template.tags ? JSON.parse(template.tags) : [],
          completionCriteria: template.completionCriteria ? JSON.parse(template.completionCriteria) : [],
        };
      }),

    // Update a template
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        updates: z.object({
          name: z.string().min(1).max(255).optional(),
          description: z.string().optional(),
          tags: z.array(z.string()).optional(),
          selectedModel: z.enum(["codex", "claude", "gemini", "manus"]).optional(),
          selectedProfile: z.string().optional(), // Built-in or custom profile ID
          ralphMode: z.boolean().optional(),
          maxIterations: z.number().min(5).max(200).optional(),
          noProgressThreshold: z.number().min(1).max(20).optional(),
          autoAskHuman: z.boolean().optional(),
          safetyMode: z.enum(["standard", "strict", "permissive"]).optional(),
          promptGoal: z.string().optional(),
          promptContext: z.string().optional(),
          promptDoneWhen: z.string().optional(),
          promptDoNot: z.string().optional(),
          completionCriteria: z.array(z.string()).optional(),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        const updates: Record<string, unknown> = { ...input.updates };
        if (input.updates.tags) {
          updates.tags = JSON.stringify(input.updates.tags);
        }
        if (input.updates.completionCriteria) {
          updates.completionCriteria = JSON.stringify(input.updates.completionCriteria);
        }
        await db.updateSessionTemplate(input.id, ctx.user.id, updates as any);
        return { success: true };
      }),

    // Delete a template
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteSessionTemplate(input.id, ctx.user.id);
        return { success: true };
      }),

    // Use a template (increment usage count)
    use: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.incrementTemplateUsage(input.id, ctx.user.id);
        const template = await db.getSessionTemplateById(input.id, ctx.user.id);
        if (!template) throw new Error("Template not found");
        return {
          ...template,
          tags: template.tags ? JSON.parse(template.tags) : [],
          completionCriteria: template.completionCriteria ? JSON.parse(template.completionCriteria) : [],
        };
      }),

    // Search templates
    search: protectedProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ ctx, input }) => {
        const templates = await db.searchSessionTemplates(ctx.user.id, input.query);
        return templates.map(t => ({
          ...t,
          tags: t.tags ? JSON.parse(t.tags) : [],
          completionCriteria: t.completionCriteria ? JSON.parse(t.completionCriteria) : [],
        }));
      }),
  }),

  // ==================== CHECKPOINTS ====================
  checkpoints: router({
    create: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        iteration: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        snapshotData: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createCheckpoint(input);
        return { success: true };
      }),

    list: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        return db.getSessionCheckpoints(input.sessionId);
      }),

    latest: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        return db.getLatestCheckpoint(input.sessionId);
      }),
  }),

  // ==================== DEEP RESEARCH ====================
  research: router({
    // Create a new research session
    create: protectedProcedure
      .input(z.object({
        topic: z.string().min(5).max(2000),
        depth: z.enum(["quick", "standard", "deep"]).default("standard"),
      }))
      .mutation(async ({ ctx, input }) => {
        const totalSteps = input.depth === "quick" ? 3 : input.depth === "standard" ? 5 : 8;
        
        const result = await db.createResearchSession({
          userId: ctx.user.id,
          topic: input.topic,
          depth: input.depth,
          status: "pending",
          currentStep: 0,
          totalSteps,
        });
        
        // Get the inserted ID
        const insertId = Number(result[0].insertId);
        
        return { id: insertId, success: true };
      }),

    // Get a single research session with findings and steps
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const session = await db.getResearchSession(input.id);
        if (!session) throw new Error("Research session not found");
        if (session.userId !== ctx.user.id) throw new Error("Unauthorized");
        
        const findings = await db.getResearchFindings(input.id);
        const steps = await db.getResearchSteps(input.id);
        
        return { ...session, findings, steps };
      }),

    // List user's research sessions
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserResearchSessions(ctx.user.id);
    }),

    // Delete a research session
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const session = await db.getResearchSession(input.id);
        if (!session) throw new Error("Research session not found");
        if (session.userId !== ctx.user.id) throw new Error("Unauthorized");
        
        await db.deleteResearchSession(input.id);
        return { success: true };
      }),

    // Execute research (starts the AI research process)
    execute: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const session = await db.getResearchSession(input.id);
        if (!session) throw new Error("Research session not found");
        if (session.userId !== ctx.user.id) throw new Error("Unauthorized");
        if (session.status !== "pending") throw new Error("Research already started");
        
        // Update status to researching
        await db.updateResearchSession(input.id, {
          status: "researching",
          startedAt: new Date(),
        });
        
        // Import LLM helper
        const { invokeLLM } = await import("./_core/llm");
        
        try {
          // Step 1: Planning - Understand the research topic and create a plan
          await db.addResearchStep({
            researchSessionId: input.id,
            stepNumber: 1,
            stepType: "planning",
            query: session.topic,
            reasoning: "Understanding the research topic and creating a research plan",
            status: "running",
            startedAt: new Date(),
          });
          
          const planningResponse = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a research assistant. Your task is to create a comprehensive research plan for the given topic. 
Break down the topic into key questions that need to be answered.
Output a JSON object with: { "keyQuestions": ["question1", "question2", ...], "searchQueries": ["query1", "query2", ...], "expectedSources": ["type1", "type2", ...] }`,
              },
              {
                role: "user",
                content: `Research topic: ${session.topic}\n\nCreate a detailed research plan.`,
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "research_plan",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    keyQuestions: { type: "array", items: { type: "string" } },
                    searchQueries: { type: "array", items: { type: "string" } },
                    expectedSources: { type: "array", items: { type: "string" } },
                  },
                  required: ["keyQuestions", "searchQueries", "expectedSources"],
                  additionalProperties: false,
                },
              },
            },
          });
          
          const planContent = planningResponse.choices[0]?.message?.content;
          const plan = typeof planContent === "string" ? JSON.parse(planContent) : planContent;
          
          // Update step 1 as complete
          const steps = await db.getResearchSteps(input.id);
          const step1 = steps.find(s => s.stepNumber === 1);
          if (step1) {
            await db.updateResearchStep(step1.id, {
              status: "complete",
              result: JSON.stringify(plan),
              completedAt: new Date(),
            });
          }
          
          await db.updateResearchSession(input.id, { currentStep: 1 });
          
          // Step 2: Searching - Research each key question
          await db.addResearchStep({
            researchSessionId: input.id,
            stepNumber: 2,
            stepType: "searching",
            query: plan.searchQueries?.join(", ") || session.topic,
            reasoning: "Researching key questions to gather information",
            status: "running",
            startedAt: new Date(),
          });
          
          const searchResponse = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a research assistant conducting deep research. Based on the research plan, provide detailed findings for each key question.
For each finding, include:
- A clear title
- Detailed content with facts and analysis
- Source type (web, paper, documentation, code, analysis)
- Relevance score (0-100)
- Confidence level (low, medium, high)

Output a JSON array of findings.`,
              },
              {
                role: "user",
                content: `Research topic: ${session.topic}\n\nKey questions to answer:\n${plan.keyQuestions?.map((q: string, i: number) => `${i + 1}. ${q}`).join("\n")}\n\nProvide detailed findings for each question.`,
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "research_findings",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    findings: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          content: { type: "string" },
                          sourceType: { type: "string", enum: ["web", "paper", "documentation", "code", "analysis"] },
                          relevanceScore: { type: "number" },
                          confidence: { type: "string", enum: ["low", "medium", "high"] },
                        },
                        required: ["title", "content", "sourceType", "relevanceScore", "confidence"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["findings"],
                  additionalProperties: false,
                },
              },
            },
          });
          
          const searchContent = searchResponse.choices[0]?.message?.content;
          const searchResults = typeof searchContent === "string" ? JSON.parse(searchContent) : searchContent;
          
          // Save findings to database
          for (const finding of searchResults.findings || []) {
            await db.addResearchFinding({
              researchSessionId: input.id,
              title: finding.title,
              content: finding.content,
              sourceType: finding.sourceType,
              relevanceScore: Math.min(100, Math.max(0, finding.relevanceScore)),
              confidence: finding.confidence,
              stepNumber: 2,
            });
          }
          
          // Update step 2
          const steps2 = await db.getResearchSteps(input.id);
          const step2 = steps2.find(s => s.stepNumber === 2);
          if (step2) {
            await db.updateResearchStep(step2.id, {
              status: "complete",
              result: `Found ${searchResults.findings?.length || 0} findings`,
              completedAt: new Date(),
            });
          }
          
          await db.updateResearchSession(input.id, { 
            currentStep: 2,
            sourcesCount: searchResults.findings?.length || 0,
          });
          
          // Step 3: Synthesizing - Create final summary
          await db.addResearchStep({
            researchSessionId: input.id,
            stepNumber: 3,
            stepType: "synthesizing",
            reasoning: "Synthesizing all findings into a comprehensive summary",
            status: "running",
            startedAt: new Date(),
          });
          
          const synthesisResponse = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a research assistant. Synthesize all the research findings into a comprehensive, well-structured summary.
Use markdown formatting for better readability.
Include:
- Executive summary
- Key findings organized by theme
- Important insights and implications
- Recommendations or next steps if applicable
- Limitations and areas for further research`,
              },
              {
                role: "user",
                content: `Research topic: ${session.topic}\n\nFindings:\n${searchResults.findings?.map((f: { title: string; content: string }) => `## ${f.title}\n${f.content}`).join("\n\n")}\n\nSynthesize these findings into a comprehensive research summary.`,
              },
            ],
          });
          
          const summary = synthesisResponse.choices[0]?.message?.content;
          const summaryText = typeof summary === "string" ? summary : JSON.stringify(summary);
          
          // Update step 3
          const steps3 = await db.getResearchSteps(input.id);
          const step3 = steps3.find(s => s.stepNumber === 3);
          if (step3) {
            await db.updateResearchStep(step3.id, {
              status: "complete",
              result: "Summary generated successfully",
              completedAt: new Date(),
            });
          }
          
          // Calculate tokens used
          const tokensUsed = 
            (planningResponse.usage?.total_tokens || 0) +
            (searchResponse.usage?.total_tokens || 0) +
            (synthesisResponse.usage?.total_tokens || 0);
          
          // Update session as complete
          await db.updateResearchSession(input.id, {
            status: "complete",
            currentStep: 3,
            summary: summaryText,
            tokensUsed,
            completedAt: new Date(),
          });
          
          return { success: true, summary: summaryText };
          
        } catch (error) {
          // Mark as failed
          await db.updateResearchSession(input.id, {
            status: "failed",
            completedAt: new Date(),
          });
          throw error;
        }
      }),

    // Generate share link for research
    share: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const session = await db.getResearchSession(input.id);
        if (!session) throw new Error("Research session not found");
        if (session.userId !== ctx.user.id) throw new Error("Unauthorized");
        
        // Generate share token if not exists
        let shareToken = session.shareToken;
        if (!shareToken) {
          shareToken = nanoid(16);
          await db.updateResearchSession(input.id, {
            shareToken,
            isPublic: true,
          });
        } else {
          // Just enable public access
          await db.updateResearchSession(input.id, { isPublic: true });
        }
        
        return { shareToken, success: true };
      }),

    // Disable sharing
    unshare: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const session = await db.getResearchSession(input.id);
        if (!session) throw new Error("Research session not found");
        if (session.userId !== ctx.user.id) throw new Error("Unauthorized");
        
        await db.updateResearchSession(input.id, { isPublic: false });
        return { success: true };
      }),

    // Get public research by share token (no auth required)
    getPublic: publicProcedure
      .input(z.object({ shareToken: z.string() }))
      .query(async ({ input }) => {
        const session = await db.getResearchByShareToken(input.shareToken);
        if (!session) throw new Error("Research not found");
        if (!session.isPublic) throw new Error("Research is not public");
        
        const findings = await db.getResearchFindings(session.id);
        const steps = await db.getResearchSteps(session.id);
        const followUps = await db.getResearchFollowUps(session.id);
        
        // Return without sensitive user info
        return {
          id: session.id,
          topic: session.topic,
          depth: session.depth,
          status: session.status,
          summary: session.summary,
          sourcesCount: session.sourcesCount,
          createdAt: session.createdAt,
          completedAt: session.completedAt,
          findings,
          steps,
          followUps,
        };
      }),

    // Add follow-up question
    askFollowUp: protectedProcedure
      .input(z.object({
        researchSessionId: z.number(),
        question: z.string().min(5).max(1000),
      }))
      .mutation(async ({ ctx, input }) => {
        const session = await db.getResearchSession(input.researchSessionId);
        if (!session) throw new Error("Research session not found");
        if (session.userId !== ctx.user.id) throw new Error("Unauthorized");
        if (session.status !== "complete") throw new Error("Research must be complete to ask follow-up questions");
        
        // Create follow-up entry
        const result = await db.addResearchFollowUp({
          researchSessionId: input.researchSessionId,
          question: input.question,
          status: "pending",
        });
        
        const followUpId = Number(result[0].insertId);
        
        // Process the follow-up question with LLM
        const { invokeLLM } = await import("./_core/llm");
        
        try {
          await db.updateResearchFollowUp(followUpId, { status: "processing" });
          
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a research assistant. The user has completed research on a topic and now has a follow-up question.

Original Research Topic: ${session.topic}

Research Summary:
${session.summary}

Answer the follow-up question based on the research context. Be specific and cite relevant findings when possible.
Use markdown formatting for better readability.`,
              },
              {
                role: "user",
                content: input.question,
              },
            ],
          });
          
          const answer = response.choices[0]?.message?.content;
          const answerText = typeof answer === "string" ? answer : JSON.stringify(answer);
          
          await db.updateResearchFollowUp(followUpId, {
            answer: answerText,
            status: "complete",
            tokensUsed: response.usage?.total_tokens || 0,
            answeredAt: new Date(),
          });
          
          return { id: followUpId, answer: answerText, success: true };
          
        } catch (error) {
          await db.updateResearchFollowUp(followUpId, { status: "failed" });
          throw error;
        }
      }),

    // Get follow-up questions for a research session
    getFollowUps: protectedProcedure
      .input(z.object({ researchSessionId: z.number() }))
      .query(async ({ ctx, input }) => {
        const session = await db.getResearchSession(input.researchSessionId);
        if (!session) throw new Error("Research session not found");
        if (session.userId !== ctx.user.id) throw new Error("Unauthorized");
        
        return db.getResearchFollowUps(input.researchSessionId);
      }),

    // Export research as markdown
    exportMarkdown: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const session = await db.getResearchSession(input.id);
        if (!session) throw new Error("Research session not found");
        if (session.userId !== ctx.user.id) throw new Error("Unauthorized");
        
        const findings = await db.getResearchFindings(input.id);
        const followUps = await db.getResearchFollowUps(input.id);
        
        // Build markdown document
        let markdown = `# ${session.topic}\n\n`;
        markdown += `**Research Depth:** ${session.depth}\n`;
        markdown += `**Status:** ${session.status}\n`;
        markdown += `**Sources:** ${session.sourcesCount}\n`;
        markdown += `**Date:** ${session.createdAt.toISOString().split('T')[0]}\n\n`;
        markdown += `---\n\n`;
        
        if (session.summary) {
          markdown += session.summary + "\n\n";
        }
        
        if (findings.length > 0) {
          markdown += `---\n\n## Research Findings\n\n`;
          for (const finding of findings) {
            markdown += `### ${finding.title}\n\n`;
            markdown += `**Source Type:** ${finding.sourceType} | **Confidence:** ${finding.confidence} | **Relevance:** ${finding.relevanceScore}%\n\n`;
            markdown += `${finding.content}\n\n`;
          }
        }
        
        if (followUps.length > 0) {
          markdown += `---\n\n## Follow-up Questions\n\n`;
          for (const followUp of followUps) {
            markdown += `### Q: ${followUp.question}\n\n`;
            if (followUp.answer) {
              markdown += `${followUp.answer}\n\n`;
            }
          }
        }
        
        markdown += `---\n\n*Generated by Agents by Valentine RF - Deep Research*\n`;
        
        return { markdown, filename: `research-${session.id}.md` };
      }),

    // Export research as PDF
    exportPDF: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const session = await db.getResearchSession(input.id);
        if (!session) throw new Error("Research session not found");
        if (session.userId !== ctx.user.id) throw new Error("Unauthorized");
        
        const findings = await db.getResearchFindings(input.id);
        const followUps = await db.getResearchFollowUps(input.id);
        
        const pdfBuffer = await generateResearchPDF({
          topic: session.topic,
          depth: session.depth,
          status: session.status,
          sourcesCount: session.sourcesCount,
          createdAt: session.createdAt,
          completedAt: session.completedAt,
          summary: session.summary,
          findings: findings.map(f => ({
            title: f.title,
            content: f.content,
            sourceType: f.sourceType,
            confidence: f.confidence,
            relevanceScore: f.relevanceScore,
          })),
          followUps: followUps.map(f => ({
            question: f.question,
            answer: f.answer,
          })),
        });
        
        const filename = generatePDFFilename(session.topic);
        const base64 = pdfBuffer.toString("base64");
        
        return { pdf: base64, filename };
      }),
  }),

  // ==================== TEMPLATES ====================
  templates: router({
    // Create a custom template
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(3).max(255),
        description: z.string().max(1000).optional(),
        topic: z.string().min(5).max(2000),
        category: z.string().max(100).default("custom"),
        categoryId: z.number().optional(),
        depth: z.enum(["quick", "standard", "deep"]).default("standard"),
        tags: z.array(z.string()).max(10).optional(),
        isPublic: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.createCustomTemplate({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          topic: input.topic,
          category: input.category,
          categoryId: input.categoryId,
          depth: input.depth,
          tags: input.tags || [],
          isPublic: input.isPublic,
        });
        return { id: result[0].insertId, success: true };
      }),

    // Get user's custom templates
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getCustomTemplates(ctx.user.id);
    }),

    // Get a specific custom template
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const template = await db.getCustomTemplate(input.id, ctx.user.id);
        if (!template) throw new Error("Template not found");
        return template;
      }),

    // Update a custom template
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(3).max(255).optional(),
        description: z.string().max(1000).optional(),
        topic: z.string().min(5).max(2000).optional(),
        category: z.string().max(100).optional(),
        categoryId: z.number().nullable().optional(),
        depth: z.enum(["quick", "standard", "deep"]).optional(),
        tags: z.array(z.string()).max(10).optional(),
        isPublic: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        await db.updateCustomTemplate(id, ctx.user.id, updates);
        return { success: true };
      }),

    // Delete a custom template
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteCustomTemplate(input.id, ctx.user.id);
        return { success: true };
      }),

    // Toggle favorite on a template
    toggleFavorite: protectedProcedure
      .input(z.object({
        templateId: z.string(),
        templateType: z.enum(["builtin", "custom"]),
        customTemplateId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const isFavorited = await db.isTemplateFavorited(
          ctx.user.id,
          input.templateId,
          input.templateType
        );
        
        if (isFavorited) {
          await db.removeTemplateFavorite(ctx.user.id, input.templateId, input.templateType);
          return { favorited: false };
        } else {
          await db.addTemplateFavorite({
            userId: ctx.user.id,
            templateId: input.templateId,
            templateType: input.templateType,
            customTemplateId: input.customTemplateId,
          });
          return { favorited: true };
        }
      }),

    // Get user's favorites
    getFavorites: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserFavorites(ctx.user.id);
    }),

    // Track template usage
    trackUsage: protectedProcedure
      .input(z.object({
        templateId: z.string(),
        templateType: z.enum(["builtin", "custom"]),
        customTemplateId: z.number().optional(),
        researchSessionId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.trackTemplateUsage({
          userId: ctx.user.id,
          templateId: input.templateId,
          templateType: input.templateType,
          customTemplateId: input.customTemplateId,
          researchSessionId: input.researchSessionId,
        });
        
        // Increment usage count for custom templates
        if (input.templateType === "custom" && input.customTemplateId) {
          await db.incrementCustomTemplateUsage(input.customTemplateId);
        }
        
        return { success: true };
      }),

    // Get global usage stats (for popular badges)
    getUsageStats: protectedProcedure.query(async () => {
      return db.getTemplateUsageStats();
    }),

    // Get user's personal usage stats
    getUserUsageStats: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserTemplateUsageStats(ctx.user.id);
    }),

    // ==================== CATEGORIES ====================
    
    // Create a category
    createCategory: protectedProcedure
      .input(z.object({
        name: z.string().min(2).max(100),
        description: z.string().max(500).optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#8b5cf6"),
        icon: z.string().max(50).default("folder"),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.createUserCategory({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          color: input.color,
          icon: input.icon,
        });
        return { id: result[0].insertId, success: true };
      }),

    // Get user's categories
    listCategories: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserCategories(ctx.user.id);
    }),

    // Update a category
    updateCategory: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(2).max(100).optional(),
        description: z.string().max(500).optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        icon: z.string().max(50).optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        await db.updateUserCategory(id, ctx.user.id, updates);
        return { success: true };
      }),

    // Delete a category
    deleteCategory: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteUserCategory(input.id, ctx.user.id);
        return { success: true };
      }),

    // ==================== IMPORT/EXPORT ====================
    
    // Export all user's custom templates
    exportTemplates: protectedProcedure.query(async ({ ctx }) => {
      const templates = await db.exportUserTemplates(ctx.user.id);
      const categories = await db.getUserCategories(ctx.user.id);
      
      return {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        templates,
        categories: categories.map(c => ({
          name: c.name,
          description: c.description,
          color: c.color,
          icon: c.icon,
        })),
      };
    }),

    // Import templates from JSON
    importTemplates: protectedProcedure
      .input(z.object({
        templates: z.array(z.object({
          name: z.string(),
          description: z.string().nullable().optional(),
          topic: z.string(),
          category: z.string().optional(),
          categoryName: z.string().optional(),
          depth: z.enum(["quick", "standard", "deep"]).optional(),
          tags: z.array(z.string()).nullable().optional(),
        })),
        categories: z.array(z.object({
          name: z.string(),
          description: z.string().nullable().optional(),
          color: z.string().optional(),
          icon: z.string().optional(),
        })).optional(),
        createMissingCategories: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        // First, create any missing categories if requested
        const categoryMap = new Map<string, number>();
        const existingCategories = await db.getUserCategories(ctx.user.id);
        
        for (const cat of existingCategories) {
          categoryMap.set(cat.name, cat.id);
        }
        
        if (input.createMissingCategories && input.categories) {
          for (const cat of input.categories) {
            if (!categoryMap.has(cat.name)) {
              const result = await db.createUserCategory({
                userId: ctx.user.id,
                name: cat.name,
                description: cat.description,
                color: cat.color || "#8b5cf6",
                icon: cat.icon || "folder",
              });
              categoryMap.set(cat.name, result[0].insertId);
            }
          }
        }
        
        // Import templates
        const result = await db.importUserTemplates(
          ctx.user.id,
          input.templates.map(t => ({
            name: t.name,
            description: t.description || null,
            topic: t.topic,
            category: t.category || "custom",
            categoryName: t.categoryName,
            depth: t.depth || "standard",
            tags: t.tags || null,
          })),
          categoryMap
        );
        
        return result;
      }),
  }),

  // ==================== PROMPT.md (Ralph Loop Core) ====================
  promptMd: router({
    // Get current PROMPT.md for a project
    get: protectedProcedure
      .input(z.object({
        projectPath: z.string().min(1),
      }))
      .query(async ({ ctx, input }) => {
        return promptMd.getPrompt(ctx.user.id, input.projectPath);
      }),

    // Get PROMPT.md version history
    getHistory: protectedProcedure
      .input(z.object({
        projectPath: z.string().min(1),
      }))
      .query(async ({ ctx, input }) => {
        return promptMd.getPromptHistory(ctx.user.id, input.projectPath);
      }),

    // Save/update PROMPT.md
    save: protectedProcedure
      .input(z.object({
        projectPath: z.string().min(1),
        content: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        return promptMd.savePrompt(ctx.user.id, input.projectPath, input.content);
      }),

    // Initialize PROMPT.md with default template
    initialize: protectedProcedure
      .input(z.object({
        projectPath: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        return promptMd.initializePrompt(ctx.user.id, input.projectPath);
      }),

    // Add a sign to PROMPT.md
    addSign: protectedProcedure
      .input(z.object({
        projectPath: z.string().min(1),
        signText: z.string().min(1),
        failurePattern: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return promptMd.addSign(ctx.user.id, input.projectPath, input.signText, input.failurePattern);
      }),

    // Get suggested signs for a failure pattern
    getSuggestedSigns: publicProcedure
      .input(z.object({
        failurePattern: z.string().min(1),
      }))
      .query(async ({ input }) => {
        return promptMd.getSuggestedSigns(input.failurePattern);
      }),

    // Get all signs for a prompt
    getSigns: protectedProcedure
      .input(z.object({
        promptId: z.number(),
      }))
      .query(async ({ input }) => {
        return promptMd.getPromptSigns(input.promptId);
      }),

    // Detect failure pattern from error output
    detectFailurePattern: publicProcedure
      .input(z.object({
        errorOutput: z.string().min(1),
      }))
      .query(async ({ input }) => {
        return promptMd.detectFailurePattern(input.errorOutput);
      }),

    // List all projects with PROMPT.md for the user
    listProjects: protectedProcedure
      .query(async ({ ctx }) => {
        return promptMd.listUserProjects(ctx.user.id);
      }),

    // Get default template
    getDefaultTemplate: publicProcedure
      .query(async () => {
        return promptMd.DEFAULT_PROMPT_TEMPLATE;
      }),
  }),

  // ==================== Auto-Sign Suggestions ====================
  autoSign: router({
    // Record a failure for auto-suggestion tracking
    recordFailure: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        errorOutput: z.string(),
        iteration: z.number(),
      }))
      .mutation(async ({ input }) => {
        autoSign.recordFailure(input.sessionId, input.errorOutput, input.iteration);
        return { success: true };
      }),

    // Record a success (resets consecutive failures)
    recordSuccess: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ input }) => {
        autoSign.recordSuccess(input.sessionId);
        return { success: true };
      }),

    // Get auto-suggested signs based on failure history
    getSuggestions: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        return autoSign.getAutoSuggestions(input.sessionId);
      }),

    // Dismiss a suggestion
    dismissSuggestion: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        pattern: z.string(),
        sign: z.string(),
      }))
      .mutation(async ({ input }) => {
        autoSign.dismissSuggestion(input.sessionId, input.pattern, input.sign);
        return { success: true };
      }),

    // Generate a custom sign using LLM
    generateCustomSign: protectedProcedure
      .input(z.object({ errorOutput: z.string().max(5000) }))
      .mutation(async ({ input }) => {
        const sign = await autoSign.generateCustomSign(input.errorOutput);
        return { sign };
      }),

    // Get failure statistics for a session
    getStats: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        return autoSign.getFailureStats(input.sessionId);
      }),

    // Clear failure history for a session
    clearHistory: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ input }) => {
        autoSign.clearFailureHistory(input.sessionId);
        return { success: true };
      }),

    // Check if the same error is repeating
    isRepeatedError: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        return { isRepeated: autoSign.isRepeatedError(input.sessionId) };
      }),

    // Get consecutive failure count
    getConsecutiveFailures: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        return { count: autoSign.getConsecutiveFailures(input.sessionId) };
      }),
  }),

  // ==================== File Browser ====================
  fileBrowser: router({
    // List directory contents
    listDirectory: protectedProcedure
      .input(z.object({
        path: z.string().default('/home/ubuntu'),
        directoriesOnly: z.boolean().default(true),
      }))
      .query(async ({ input }) => {
        return fileBrowser.listDirectory(input.path, input.directoriesOnly);
      }),

    // Check if path is a project directory
    isProjectDirectory: protectedProcedure
      .input(z.object({ path: z.string() }))
      .query(async ({ input }) => {
        return fileBrowser.isProjectDirectory(input.path);
      }),

    // Get recent directories
    getRecentDirectories: protectedProcedure
      .query(async () => {
        return { directories: fileBrowser.getRecentDirectories() };
      }),

    // Create a new directory
    createDirectory: protectedProcedure
      .input(z.object({
        parentPath: z.string(),
        dirName: z.string().min(1).max(255),
      }))
      .mutation(async ({ input }) => {
        const newPath = await fileBrowser.createDirectory(input.parentPath, input.dirName);
        return { path: newPath };
      }),
  }),

  // ==================== RAG (Retrieval-Augmented Generation) ====================
  rag: router({
    // Document Management
    ingestDocument: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        content: z.string().min(10),
        source: z.string().max(512).default("manual-upload"),
        sourceType: z.enum(["file", "url", "text", "code", "documentation"]).default("text"),
        tags: z.array(z.string()).max(20).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await rag.ingestDocument(
          ctx.user.id,
          input.title,
          input.content,
          input.source,
          input.sourceType,
          input.tags,
          input.metadata
        );
        return result;
      }),

    listDocuments: protectedProcedure.query(async ({ ctx }) => {
      return rag.listDocuments(ctx.user.id);
    }),

    deleteDocument: protectedProcedure
      .input(z.object({ documentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const success = await rag.deleteDocument(input.documentId, ctx.user.id);
        return { success };
      }),

    // Semantic Search
    search: protectedProcedure
      .input(z.object({
        query: z.string().min(1).max(1000),
        topK: z.number().min(1).max(20).default(5),
      }))
      .mutation(async ({ ctx, input }) => {
        return rag.semanticSearch(ctx.user.id, input.query, input.topK);
      }),

    // Conversation Management
    createConversation: protectedProcedure
      .input(z.object({
        title: z.string().max(255).optional(),
        systemPrompt: z.string().max(5000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const conversationId = await rag.createConversation(
          ctx.user.id,
          input.title,
          input.systemPrompt
        );
        return { conversationId };
      }),

    listConversations: protectedProcedure
      .input(z.object({
        includeArchived: z.boolean().default(false),
      }).optional())
      .query(async ({ ctx, input }) => {
        return rag.listConversations(ctx.user.id, input?.includeArchived);
      }),

    getConversation: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ ctx, input }) => {
        const conversation = await rag.getConversation(input.conversationId, ctx.user.id);
        if (!conversation) throw new Error("Conversation not found");
        return conversation;
      }),

    archiveConversation: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const success = await rag.archiveConversation(input.conversationId, ctx.user.id);
        return { success };
      }),

    deleteConversation: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const success = await rag.deleteConversation(input.conversationId, ctx.user.id);
        return { success };
      }),

    // RAG Chat
    chat: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
        message: z.string().min(1).max(10000),
      }))
      .mutation(async ({ ctx, input }) => {
        return rag.ragChat(ctx.user.id, input.conversationId, input.message);
      }),

    // Feedback
    provideFeedback: protectedProcedure
      .input(z.object({
        messageId: z.number(),
        feedback: z.enum(["positive", "negative"]),
        comment: z.string().max(1000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const success = await rag.provideFeedback(
          input.messageId,
          ctx.user.id,
          input.feedback,
          input.comment
        );
        return { success };
      }),

    // System Documentation Ingestion
    ingestSystemDocs: protectedProcedure.mutation(async ({ ctx }) => {
      return rag.ingestSystemDocumentation(ctx.user.id);
    }),

    // File Upload
    uploadFile: protectedProcedure
      .input(z.object({
        filename: z.string().min(1).max(255),
        content: z.string(), // Base64 encoded file content
        tags: z.array(z.string()).max(20).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Validate file type
        if (!ragFileUpload.isSupportedFileType(input.filename)) {
          throw new Error(`Unsupported file type. Supported: ${Object.keys(ragFileUpload.SUPPORTED_FILE_TYPES).join(", ")}`);
        }
        
        // Decode base64 content
        const buffer = Buffer.from(input.content, "base64");
        
        // Validate file size (10MB max)
        if (!ragFileUpload.validateFileSize(buffer.length)) {
          throw new Error(`File too large. Maximum size is 10MB.`);
        }
        
        // Parse the file
        const parsed = await ragFileUpload.parseFile(buffer, input.filename);
        
        // Extract title from content or use filename
        const title = ragFileUpload.extractTitleFromContent(parsed.content, input.filename);
        
        // Detect source type
        const sourceType = ragFileUpload.detectSourceType(parsed.metadata.extension);
        
        // Ingest the document
        const result = await rag.ingestDocument(
          ctx.user.id,
          title,
          parsed.content,
          `file://${input.filename}`,
          sourceType,
          input.tags,
          parsed.metadata
        );
        
        return {
          ...result,
          metadata: parsed.metadata,
        };
      }),

    // Search conversations and messages
    searchConversations: protectedProcedure
      .input(z.object({
        query: z.string().min(1).max(500),
        limit: z.number().min(1).max(50).default(20),
      }))
      .query(async ({ ctx, input }) => {
        return rag.searchConversations(ctx.user.id, input.query, input.limit);
      }),
  }),

  // ==================== CUSTOM AGENT PROFILES ====================
  agentProfiles: router({
    // List all profiles (built-in + custom)
    list: protectedProcedure.query(async ({ ctx }) => {
      const customProfiles = await db.getCustomAgentProfiles(ctx.user.id);
      
      // Built-in profiles
      const builtInProfiles = [
        {
          id: 'patch_goblin',
          name: 'Patch Goblin',
          slug: 'patch_goblin',
          description: 'Fast diffs, minimal prose. Gets straight to the code changes.',
          icon: 'Zap',
          color: 'green',
          systemPrompt: 'You are a fast-moving code goblin. Output only diffs and minimal explanations. No fluff.',
          outputStyle: 'concise' as const,
          codeGeneration: 'diffs' as const,
          testingApproach: 'test_after' as const,
          isBuiltIn: true,
        },
        {
          id: 'architect_owl',
          name: 'Architect Owl',
          slug: 'architect_owl',
          description: 'Design and tradeoffs focus. Thinks before coding.',
          icon: 'Bird',
          color: 'blue',
          systemPrompt: 'You are a wise architect owl. Focus on design decisions, tradeoffs, and system structure. Explain your reasoning before suggesting code.',
          outputStyle: 'detailed' as const,
          codeGeneration: 'none' as const,
          testingApproach: 'test_first' as const,
          isBuiltIn: true,
        },
        {
          id: 'test_gremlin',
          name: 'Test Gremlin',
          slug: 'test_gremlin',
          description: 'Test-first approach. Writes tests before implementation.',
          icon: 'Bug',
          color: 'orange',
          systemPrompt: 'You are a test-obsessed gremlin. Always write tests first, then implement. Coverage is king.',
          outputStyle: 'balanced' as const,
          codeGeneration: 'full' as const,
          testingApproach: 'test_first' as const,
          isBuiltIn: true,
        },
        {
          id: 'refactor_surgeon',
          name: 'Refactor Surgeon',
          slug: 'refactor_surgeon',
          description: 'Safe refactors only. Preserves behavior while improving structure.',
          icon: 'Scissors',
          color: 'purple',
          systemPrompt: 'You are a precise refactoring surgeon. Make safe, incremental changes. Never break existing functionality.',
          outputStyle: 'balanced' as const,
          codeGeneration: 'diffs' as const,
          testingApproach: 'test_after' as const,
          isBuiltIn: true,
        },
      ];
      
      return {
        builtIn: builtInProfiles,
        custom: customProfiles.map(p => ({ ...p, isBuiltIn: false })),
      };
    }),

    // Get single profile
    get: protectedProcedure
      .input(z.object({
        id: z.union([z.number(), z.string()]),
      }))
      .query(async ({ ctx, input }) => {
        // Check if it's a built-in profile
        if (typeof input.id === 'string') {
          const builtIn = ['patch_goblin', 'architect_owl', 'test_gremlin', 'refactor_surgeon'];
          if (builtIn.includes(input.id)) {
            return { isBuiltIn: true, slug: input.id };
          }
        }
        
        // Get custom profile
        const profile = await db.getCustomAgentProfile(Number(input.id), ctx.user.id);
        if (!profile) {
          throw new Error('Profile not found');
        }
        return { ...profile, isBuiltIn: false };
      }),

    // Create custom profile
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        description: z.string().min(1).max(500),
        icon: z.string().default('Bot'),
        color: z.string().default('purple'),
        systemPrompt: z.string().min(10).max(5000),
        outputStyle: z.enum(['concise', 'detailed', 'balanced']).default('balanced'),
        codeGeneration: z.enum(['full', 'diffs', 'none']).default('diffs'),
        testingApproach: z.enum(['test_first', 'test_after', 'no_tests']).default('test_after'),
        settings: z.object({
          maxResponseLength: z.number().optional(),
          preferredLanguages: z.array(z.string()).optional(),
          avoidPatterns: z.array(z.string()).optional(),
          focusAreas: z.array(z.string()).optional(),
        }).optional(),
        isPublic: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        // Generate slug from name
        const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        
        const profile = await db.createCustomAgentProfile({
          userId: ctx.user.id,
          name: input.name,
          slug,
          description: input.description,
          icon: input.icon,
          color: input.color,
          systemPrompt: input.systemPrompt,
          outputStyle: input.outputStyle,
          codeGeneration: input.codeGeneration,
          testingApproach: input.testingApproach,
          settings: input.settings || null,
          isPublic: input.isPublic,
        });
        
        return profile;
      }),

    // Update custom profile
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().min(1).max(500).optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
        systemPrompt: z.string().min(10).max(5000).optional(),
        outputStyle: z.enum(['concise', 'detailed', 'balanced']).optional(),
        codeGeneration: z.enum(['full', 'diffs', 'none']).optional(),
        testingApproach: z.enum(['test_first', 'test_after', 'no_tests']).optional(),
        settings: z.object({
          maxResponseLength: z.number().optional(),
          preferredLanguages: z.array(z.string()).optional(),
          avoidPatterns: z.array(z.string()).optional(),
          focusAreas: z.array(z.string()).optional(),
        }).optional(),
        isPublic: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        
        // Verify ownership
        const existing = await db.getCustomAgentProfile(id, ctx.user.id);
        if (!existing) {
          throw new Error('Profile not found or access denied');
        }
        
        // Update slug if name changed
        const updateData: Record<string, unknown> = { ...updates };
        if (updates.name) {
          updateData.slug = updates.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        }
        
        await db.updateCustomAgentProfile(id, ctx.user.id, updateData);
        return { success: true };
      }),

    // Delete custom profile
    delete: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify ownership
        const existing = await db.getCustomAgentProfile(input.id, ctx.user.id);
        if (!existing) {
          throw new Error('Profile not found or access denied');
        }
        
        await db.deleteCustomAgentProfile(input.id, ctx.user.id);
        return { success: true };
      }),

    // Duplicate a profile (built-in or custom)
    duplicate: protectedProcedure
      .input(z.object({
        sourceId: z.union([z.number(), z.string()]),
        newName: z.string().min(1).max(100),
      }))
      .mutation(async ({ ctx, input }) => {
        let sourceProfile: {
          name: string;
          description: string;
          icon: string;
          color: string;
          systemPrompt: string;
          outputStyle: 'concise' | 'detailed' | 'balanced';
          codeGeneration: 'full' | 'diffs' | 'none';
          testingApproach: 'test_first' | 'test_after' | 'no_tests';
          settings?: Record<string, unknown> | null;
        };
        
        // Get source profile data
        if (typeof input.sourceId === 'string') {
          // Built-in profile
          const builtInMap: Record<string, typeof sourceProfile> = {
            patch_goblin: {
              name: 'Patch Goblin',
              description: 'Fast diffs, minimal prose. Gets straight to the code changes.',
              icon: 'Zap',
              color: 'green',
              systemPrompt: 'You are a fast-moving code goblin. Output only diffs and minimal explanations. No fluff.',
              outputStyle: 'concise',
              codeGeneration: 'diffs',
              testingApproach: 'test_after',
            },
            architect_owl: {
              name: 'Architect Owl',
              description: 'Design and tradeoffs focus. Thinks before coding.',
              icon: 'Bird',
              color: 'blue',
              systemPrompt: 'You are a wise architect owl. Focus on design decisions, tradeoffs, and system structure. Explain your reasoning before suggesting code.',
              outputStyle: 'detailed',
              codeGeneration: 'none',
              testingApproach: 'test_first',
            },
            test_gremlin: {
              name: 'Test Gremlin',
              description: 'Test-first approach. Writes tests before implementation.',
              icon: 'Bug',
              color: 'orange',
              systemPrompt: 'You are a test-obsessed gremlin. Always write tests first, then implement. Coverage is king.',
              outputStyle: 'balanced',
              codeGeneration: 'full',
              testingApproach: 'test_first',
            },
            refactor_surgeon: {
              name: 'Refactor Surgeon',
              description: 'Safe refactors only. Preserves behavior while improving structure.',
              icon: 'Scissors',
              color: 'purple',
              systemPrompt: 'You are a precise refactoring surgeon. Make safe, incremental changes. Never break existing functionality.',
              outputStyle: 'balanced',
              codeGeneration: 'diffs',
              testingApproach: 'test_after',
            },
          };
          
          sourceProfile = builtInMap[input.sourceId];
          if (!sourceProfile) {
            throw new Error('Built-in profile not found');
          }
        } else {
          // Custom profile
          const custom = await db.getCustomAgentProfile(input.sourceId, ctx.user.id);
          if (!custom) {
            throw new Error('Profile not found or access denied');
          }
          sourceProfile = custom;
        }
        
        // Create duplicate with new name
        const slug = input.newName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        
        const newProfile = await db.createCustomAgentProfile({
          userId: ctx.user.id,
          name: input.newName,
          slug,
          description: sourceProfile.description,
          icon: sourceProfile.icon,
          color: sourceProfile.color,
          systemPrompt: sourceProfile.systemPrompt,
          outputStyle: sourceProfile.outputStyle,
          codeGeneration: sourceProfile.codeGeneration,
          testingApproach: sourceProfile.testingApproach,
          settings: sourceProfile.settings || null,
          isPublic: false,
        });
        
        return newProfile;
      }),

    // Track usage
    trackUsage: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.incrementAgentProfileUsage(input.id, ctx.user.id);
        return { success: true };
      }),

    // ==================== TEMPLATE GALLERY ====================
    
    // List all available templates
    listTemplates: publicProcedure
      .input(z.object({
        category: z.enum(['all', 'documentation', 'security', 'performance', 'architecture', 'testing', 'devops', 'specialized']).default('all'),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const { agentProfileTemplates, categoryInfo, searchTemplates, getTemplatesByCategory } = await import('../shared/agentProfileTemplates');
        
        const category = input?.category || 'all';
        const search = input?.search;
        
        let templates = agentProfileTemplates;
        
        // Filter by category
        if (category !== 'all') {
          templates = getTemplatesByCategory(category as any);
        }
        
        // Filter by search
        if (search && search.trim()) {
          const searchResults = searchTemplates(search);
          templates = templates.filter(t => searchResults.some(sr => sr.id === t.id));
        }
        
        return {
          templates,
          categories: categoryInfo,
          totalCount: agentProfileTemplates.length,
        };
      }),

    // Get single template by ID
    getTemplate: publicProcedure
      .input(z.object({
        id: z.string(),
      }))
      .query(async ({ input }) => {
        const { getTemplateById } = await import('../shared/agentProfileTemplates');
        const template = getTemplateById(input.id);
        
        if (!template) {
          throw new Error('Template not found');
        }
        
        return template;
      }),

    // Import template as custom profile
    importTemplate: protectedProcedure
      .input(z.object({
        templateId: z.string(),
        customName: z.string().min(1).max(100).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getTemplateById } = await import('../shared/agentProfileTemplates');
        const template = getTemplateById(input.templateId);
        
        if (!template) {
          throw new Error('Template not found');
        }
        
        // Use custom name or template name
        const name = input.customName || template.name;
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        
        // Create custom profile from template
        const profile = await db.createCustomAgentProfile({
          userId: ctx.user.id,
          name,
          slug,
          description: template.description,
          icon: template.icon,
          color: template.color,
          systemPrompt: template.systemPrompt,
          outputStyle: template.outputStyle,
          codeGeneration: template.codeGeneration,
          testingApproach: template.testingApproach,
          settings: null,
          isPublic: false,
        });
        
        return {
          profile,
          sourceTemplate: template.id,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
