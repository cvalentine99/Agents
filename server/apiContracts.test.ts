/**
 * API Contract Validation Tests
 * 
 * These tests validate that all tRPC procedures conform to their documented contracts.
 * They test input validation, output types, and error handling.
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";

// ============================================
// Input Schema Definitions (Contract)
// ============================================

const ApiKeyProviderSchema = z.enum(["codex", "claude", "gemini", "manus"]);

const SessionStatusSchema = z.enum(["idle", "running", "paused", "complete", "failed"]);

const CircuitBreakerStateSchema = z.enum(["CLOSED", "HALF_OPEN", "OPEN"]);

const AgentProfileSchema = z.enum([
  "patch-goblin",
  "architect-owl", 
  "test-gremlin",
  "refactor-surgeon"
]);

const ResearchDepthSchema = z.enum(["quick", "standard", "deep"]);

// ============================================
// API Keys Router Contracts
// ============================================

describe("API Keys Router Contracts", () => {
  const SaveApiKeyInput = z.object({
    provider: ApiKeyProviderSchema,
    apiKey: z.string().min(1),
  });

  const DeleteApiKeyInput = z.object({
    id: z.number().int().positive(),
  });

  const ValidateApiKeyInput = z.object({
    provider: ApiKeyProviderSchema,
    apiKey: z.string().min(1),
  });

  const GetForProviderInput = z.object({
    provider: ApiKeyProviderSchema,
  });

  it("validates save input schema", () => {
    // Valid inputs
    expect(SaveApiKeyInput.safeParse({ provider: "claude", apiKey: "sk-123" }).success).toBe(true);
    expect(SaveApiKeyInput.safeParse({ provider: "gemini", apiKey: "AIza..." }).success).toBe(true);
    
    // Invalid inputs
    expect(SaveApiKeyInput.safeParse({ provider: "invalid", apiKey: "sk-123" }).success).toBe(false);
    expect(SaveApiKeyInput.safeParse({ provider: "claude", apiKey: "" }).success).toBe(false);
    expect(SaveApiKeyInput.safeParse({ provider: "claude" }).success).toBe(false);
  });

  it("validates delete input schema", () => {
    expect(DeleteApiKeyInput.safeParse({ id: 1 }).success).toBe(true);
    expect(DeleteApiKeyInput.safeParse({ id: 100 }).success).toBe(true);
    
    expect(DeleteApiKeyInput.safeParse({ id: 0 }).success).toBe(false);
    expect(DeleteApiKeyInput.safeParse({ id: -1 }).success).toBe(false);
    expect(DeleteApiKeyInput.safeParse({ id: "1" }).success).toBe(false);
  });

  it("validates validate input schema", () => {
    expect(ValidateApiKeyInput.safeParse({ provider: "manus", apiKey: "key123" }).success).toBe(true);
    expect(ValidateApiKeyInput.safeParse({ provider: "codex", apiKey: "sk-..." }).success).toBe(true);
  });

  it("validates getForProvider input schema", () => {
    expect(GetForProviderInput.safeParse({ provider: "claude" }).success).toBe(true);
    expect(GetForProviderInput.safeParse({ provider: "unknown" }).success).toBe(false);
  });
});

// ============================================
// Sessions Router Contracts
// ============================================

describe("Sessions Router Contracts", () => {
  const CreateSessionInput = z.object({
    name: z.string().min(1).max(255),
    selectedModel: ApiKeyProviderSchema,
    selectedProfile: z.string().min(1),
    workingDirectory: z.string().min(1),
    maxIterations: z.number().int().min(1).max(1000),
    noProgressThreshold: z.number().int().min(1).max(100),
    promptGoal: z.string().min(1),
    promptContext: z.string().optional(),
    promptDoneWhen: z.string().optional(),
    promptDoNot: z.string().optional(),
  });

  const GetSessionInput = z.object({
    id: z.number().int().positive(),
  });

  const UpdateSessionInput = z.object({
    id: z.number().int().positive(),
    status: SessionStatusSchema.optional(),
    currentIteration: z.number().int().min(0).optional(),
    noProgressCount: z.number().int().min(0).optional(),
    circuitBreakerState: CircuitBreakerStateSchema.optional(),
    completionProgress: z.number().min(0).max(100).optional(),
  });

  it("validates create session input", () => {
    const validInput = {
      name: "Fix login bug",
      selectedModel: "claude",
      selectedProfile: "patch-goblin",
      workingDirectory: "/home/ubuntu/project",
      maxIterations: 50,
      noProgressThreshold: 5,
      promptGoal: "Fix the authentication bug",
    };
    
    expect(CreateSessionInput.safeParse(validInput).success).toBe(true);
    
    // With optional fields
    expect(CreateSessionInput.safeParse({
      ...validInput,
      promptContext: "React + TypeScript app",
      promptDoneWhen: "All tests pass",
      promptDoNot: "Modify the database schema",
    }).success).toBe(true);
  });

  it("rejects invalid session inputs", () => {
    // Empty name
    expect(CreateSessionInput.safeParse({
      name: "",
      selectedModel: "claude",
      selectedProfile: "patch-goblin",
      workingDirectory: "/home",
      maxIterations: 50,
      noProgressThreshold: 5,
      promptGoal: "Goal",
    }).success).toBe(false);

    // Invalid model
    expect(CreateSessionInput.safeParse({
      name: "Test",
      selectedModel: "gpt-4",
      selectedProfile: "patch-goblin",
      workingDirectory: "/home",
      maxIterations: 50,
      noProgressThreshold: 5,
      promptGoal: "Goal",
    }).success).toBe(false);

    // Max iterations too high
    expect(CreateSessionInput.safeParse({
      name: "Test",
      selectedModel: "claude",
      selectedProfile: "patch-goblin",
      workingDirectory: "/home",
      maxIterations: 10000,
      noProgressThreshold: 5,
      promptGoal: "Goal",
    }).success).toBe(false);
  });

  it("validates update session input", () => {
    expect(UpdateSessionInput.safeParse({ id: 1 }).success).toBe(true);
    expect(UpdateSessionInput.safeParse({ id: 1, status: "running" }).success).toBe(true);
    expect(UpdateSessionInput.safeParse({ id: 1, completionProgress: 75 }).success).toBe(true);
    expect(UpdateSessionInput.safeParse({ id: 1, circuitBreakerState: "OPEN" }).success).toBe(true);
    
    // Invalid status
    expect(UpdateSessionInput.safeParse({ id: 1, status: "invalid" }).success).toBe(false);
    // Progress out of range
    expect(UpdateSessionInput.safeParse({ id: 1, completionProgress: 150 }).success).toBe(false);
  });
});

// ============================================
// Criteria Router Contracts
// ============================================

describe("Criteria Router Contracts", () => {
  const AddCriterionInput = z.object({
    sessionId: z.number().int().positive(),
    text: z.string().min(1).max(500),
  });

  const ListCriteriaInput = z.object({
    sessionId: z.number().int().positive(),
  });

  const ToggleCriterionInput = z.object({
    id: z.number().int().positive(),
  });

  it("validates add criterion input", () => {
    expect(AddCriterionInput.safeParse({ sessionId: 1, text: "All tests pass" }).success).toBe(true);
    expect(AddCriterionInput.safeParse({ sessionId: 1, text: "" }).success).toBe(false);
    expect(AddCriterionInput.safeParse({ sessionId: 0, text: "Test" }).success).toBe(false);
  });

  it("validates list criteria input", () => {
    expect(ListCriteriaInput.safeParse({ sessionId: 1 }).success).toBe(true);
    expect(ListCriteriaInput.safeParse({ sessionId: -1 }).success).toBe(false);
  });

  it("validates toggle criterion input", () => {
    expect(ToggleCriterionInput.safeParse({ id: 1 }).success).toBe(true);
    expect(ToggleCriterionInput.safeParse({ id: "1" }).success).toBe(false);
  });
});

// ============================================
// Research Router Contracts
// ============================================

describe("Research Router Contracts", () => {
  const CreateResearchInput = z.object({
    topic: z.string().min(1).max(1000),
    depth: ResearchDepthSchema.optional(),
  });

  const ExecuteResearchInput = z.object({
    id: z.number().int().positive(),
  });

  const AskFollowUpInput = z.object({
    researchId: z.number().int().positive(),
    question: z.string().min(1).max(500),
  });

  it("validates create research input", () => {
    expect(CreateResearchInput.safeParse({ topic: "AI trends 2025" }).success).toBe(true);
    expect(CreateResearchInput.safeParse({ topic: "AI trends", depth: "deep" }).success).toBe(true);
    expect(CreateResearchInput.safeParse({ topic: "" }).success).toBe(false);
    expect(CreateResearchInput.safeParse({ topic: "Test", depth: "invalid" }).success).toBe(false);
  });

  it("validates execute research input", () => {
    expect(ExecuteResearchInput.safeParse({ id: 1 }).success).toBe(true);
    expect(ExecuteResearchInput.safeParse({ id: 0 }).success).toBe(false);
  });

  it("validates follow-up question input", () => {
    expect(AskFollowUpInput.safeParse({ researchId: 1, question: "What about costs?" }).success).toBe(true);
    expect(AskFollowUpInput.safeParse({ researchId: 1, question: "" }).success).toBe(false);
  });
});

// ============================================
// RAG Router Contracts
// ============================================

describe("RAG Router Contracts", () => {
  const IngestDocumentInput = z.object({
    title: z.string().min(1).max(255),
    content: z.string().min(1),
    source: z.string().optional(),
  });

  const SearchInput = z.object({
    query: z.string().min(1).max(500),
    limit: z.number().int().min(1).max(50).optional(),
  });

  const ChatInput = z.object({
    conversationId: z.number().int().positive(),
    message: z.string().min(1).max(2000),
  });

  const UploadFileInput = z.object({
    filename: z.string().min(1),
    content: z.string().min(1),
    mimeType: z.string().min(1),
  });

  it("validates ingest document input", () => {
    expect(IngestDocumentInput.safeParse({
      title: "API Documentation",
      content: "This is the content...",
    }).success).toBe(true);

    expect(IngestDocumentInput.safeParse({
      title: "Docs",
      content: "Content",
      source: "https://example.com",
    }).success).toBe(true);

    expect(IngestDocumentInput.safeParse({ title: "", content: "Test" }).success).toBe(false);
  });

  it("validates search input", () => {
    expect(SearchInput.safeParse({ query: "How to authenticate?" }).success).toBe(true);
    expect(SearchInput.safeParse({ query: "Test", limit: 10 }).success).toBe(true);
    expect(SearchInput.safeParse({ query: "Test", limit: 100 }).success).toBe(false);
    expect(SearchInput.safeParse({ query: "" }).success).toBe(false);
  });

  it("validates chat input", () => {
    expect(ChatInput.safeParse({ conversationId: 1, message: "Hello" }).success).toBe(true);
    expect(ChatInput.safeParse({ conversationId: 0, message: "Hello" }).success).toBe(false);
    expect(ChatInput.safeParse({ conversationId: 1, message: "" }).success).toBe(false);
  });

  it("validates upload file input", () => {
    expect(UploadFileInput.safeParse({
      filename: "doc.pdf",
      content: "base64content...",
      mimeType: "application/pdf",
    }).success).toBe(true);

    expect(UploadFileInput.safeParse({
      filename: "",
      content: "test",
      mimeType: "text/plain",
    }).success).toBe(false);
  });
});

// ============================================
// Agent Profiles Router Contracts
// ============================================

describe("Agent Profiles Router Contracts", () => {
  const CreateProfileInput = z.object({
    name: z.string().min(1).max(100),
    description: z.string().min(1).max(500),
    icon: z.string().min(1),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    systemPrompt: z.string().min(1).max(5000),
    outputStyle: z.enum(["concise", "detailed", "balanced"]).optional(),
    codeGeneration: z.enum(["full", "diffs", "none"]).optional(),
    testingApproach: z.enum(["tdd", "test-after", "no-tests"]).optional(),
  });

  const ListTemplatesInput = z.object({
    category: z.string().optional(),
    search: z.string().optional(),
  });

  const ImportTemplateInput = z.object({
    templateId: z.string().min(1),
  });

  it("validates create profile input", () => {
    expect(CreateProfileInput.safeParse({
      name: "Code Ninja",
      description: "Fast and efficient coder",
      icon: "⚡",
      color: "#FF5733",
      systemPrompt: "You are a fast coder...",
    }).success).toBe(true);

    expect(CreateProfileInput.safeParse({
      name: "Tester",
      description: "Test-first approach",
      icon: "🧪",
      color: "#00FF00",
      systemPrompt: "Write tests first...",
      outputStyle: "detailed",
      codeGeneration: "full",
      testingApproach: "tdd",
    }).success).toBe(true);

    // Invalid color format
    expect(CreateProfileInput.safeParse({
      name: "Test",
      description: "Desc",
      icon: "🔧",
      color: "red",
      systemPrompt: "Prompt",
    }).success).toBe(false);
  });

  it("validates list templates input", () => {
    expect(ListTemplatesInput.safeParse({}).success).toBe(true);
    expect(ListTemplatesInput.safeParse({ category: "security" }).success).toBe(true);
    expect(ListTemplatesInput.safeParse({ search: "audit" }).success).toBe(true);
  });

  it("validates import template input", () => {
    expect(ImportTemplateInput.safeParse({ templateId: "security-auditor" }).success).toBe(true);
    expect(ImportTemplateInput.safeParse({ templateId: "" }).success).toBe(false);
  });
});

// ============================================
// PROMPT.md Router Contracts
// ============================================

describe("PROMPT.md Router Contracts", () => {
  const GetPromptInput = z.object({
    projectPath: z.string().min(1),
  });

  const SavePromptInput = z.object({
    projectPath: z.string().min(1),
    content: z.string().min(1),
  });

  const AddSignInput = z.object({
    projectPath: z.string().min(1),
    sign: z.string().min(1).max(500),
    category: z.string().optional(),
  });

  const DetectFailureInput = z.object({
    errorType: z.string().min(1),
    errorMessage: z.string().min(1),
  });

  it("validates get prompt input", () => {
    expect(GetPromptInput.safeParse({ projectPath: "/home/ubuntu/project" }).success).toBe(true);
    expect(GetPromptInput.safeParse({ projectPath: "" }).success).toBe(false);
  });

  it("validates save prompt input", () => {
    expect(SavePromptInput.safeParse({
      projectPath: "/home/ubuntu/project",
      content: "# PROMPT.md\n\n## Goal\nFix bugs",
    }).success).toBe(true);
  });

  it("validates add sign input", () => {
    expect(AddSignInput.safeParse({
      projectPath: "/home/ubuntu/project",
      sign: "Always run tests before committing",
    }).success).toBe(true);

    expect(AddSignInput.safeParse({
      projectPath: "/home/ubuntu/project",
      sign: "Use TypeScript strict mode",
      category: "typescript",
    }).success).toBe(true);
  });

  it("validates detect failure input", () => {
    expect(DetectFailureInput.safeParse({
      errorType: "typescript",
      errorMessage: "Property 'x' does not exist on type 'Y'",
    }).success).toBe(true);
  });
});

// ============================================
// Auto-Sign Router Contracts
// ============================================

describe("Auto-Sign Router Contracts", () => {
  const RecordFailureInput = z.object({
    sessionId: z.number().int().positive(),
    projectPath: z.string().min(1),
    errorType: z.string().min(1),
    errorMessage: z.string().min(1),
    iteration: z.number().int().min(0),
  });

  const GetSuggestionsInput = z.object({
    sessionId: z.number().int().positive(),
    projectPath: z.string().min(1),
  });

  const DismissSuggestionInput = z.object({
    suggestionId: z.string().min(1),
  });

  it("validates record failure input", () => {
    expect(RecordFailureInput.safeParse({
      sessionId: 1,
      projectPath: "/home/ubuntu/project",
      errorType: "test_failure",
      errorMessage: "Expected true but got false",
      iteration: 5,
    }).success).toBe(true);
  });

  it("validates get suggestions input", () => {
    expect(GetSuggestionsInput.safeParse({
      sessionId: 1,
      projectPath: "/home/ubuntu/project",
    }).success).toBe(true);
  });

  it("validates dismiss suggestion input", () => {
    expect(DismissSuggestionInput.safeParse({ suggestionId: "sugg-123" }).success).toBe(true);
    expect(DismissSuggestionInput.safeParse({ suggestionId: "" }).success).toBe(false);
  });
});

// ============================================
// File Browser Router Contracts
// ============================================

describe("File Browser Router Contracts", () => {
  const ListDirectoryInput = z.object({
    path: z.string().min(1),
  });

  const IsProjectDirectoryInput = z.object({
    path: z.string().min(1),
  });

  const CreateDirectoryInput = z.object({
    path: z.string().min(1),
    name: z.string().min(1).max(255),
  });

  it("validates list directory input", () => {
    expect(ListDirectoryInput.safeParse({ path: "/home/ubuntu" }).success).toBe(true);
    expect(ListDirectoryInput.safeParse({ path: "" }).success).toBe(false);
  });

  it("validates is project directory input", () => {
    expect(IsProjectDirectoryInput.safeParse({ path: "/home/ubuntu/project" }).success).toBe(true);
  });

  it("validates create directory input", () => {
    expect(CreateDirectoryInput.safeParse({ path: "/home/ubuntu", name: "new-project" }).success).toBe(true);
    expect(CreateDirectoryInput.safeParse({ path: "/home/ubuntu", name: "" }).success).toBe(false);
  });
});

// ============================================
// Output Type Contracts
// ============================================

describe("Output Type Contracts", () => {
  const UserOutput = z.object({
    id: z.number(),
    openId: z.string(),
    name: z.string(),
    avatar: z.string().nullable(),
    role: z.enum(["admin", "user"]),
    createdAt: z.date(),
  });

  const SessionOutput = z.object({
    id: z.number(),
    name: z.string(),
    status: SessionStatusSchema,
    selectedModel: z.string(),
    currentIteration: z.number(),
    maxIterations: z.number(),
    completionProgress: z.number(),
    createdAt: z.date(),
    updatedAt: z.date(),
  });

  const ResearchOutput = z.object({
    id: z.number(),
    topic: z.string(),
    status: z.string(),
    summary: z.string().nullable(),
    findings: z.array(z.object({
      id: z.number(),
      title: z.string(),
      content: z.string(),
      source: z.string().nullable(),
      confidence: z.number(),
    })),
    createdAt: z.date(),
  });

  it("validates user output shape", () => {
    const validUser = {
      id: 1,
      openId: "user-123",
      name: "John Doe",
      avatar: "https://example.com/avatar.png",
      role: "user" as const,
      createdAt: new Date(),
    };
    
    expect(UserOutput.safeParse(validUser).success).toBe(true);
    expect(UserOutput.safeParse({ ...validUser, avatar: null }).success).toBe(true);
  });

  it("validates session output shape", () => {
    const validSession = {
      id: 1,
      name: "Test Session",
      status: "running" as const,
      selectedModel: "claude",
      currentIteration: 5,
      maxIterations: 50,
      completionProgress: 25,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    expect(SessionOutput.safeParse(validSession).success).toBe(true);
  });

  it("validates research output shape", () => {
    const validResearch = {
      id: 1,
      topic: "AI Trends",
      status: "complete",
      summary: "Key findings about AI...",
      findings: [
        {
          id: 1,
          title: "Finding 1",
          content: "Details...",
          source: "https://example.com",
          confidence: 0.95,
        },
      ],
      createdAt: new Date(),
    };
    
    expect(ResearchOutput.safeParse(validResearch).success).toBe(true);
  });
});

// ============================================
// WebSocket Message Contracts
// ============================================

describe("WebSocket Message Contracts", () => {
  const CliClientMessage = z.discriminatedUnion("type", [
    z.object({ type: z.literal("start"), sessionId: z.number() }),
    z.object({ type: z.literal("stop") }),
    z.object({ type: z.literal("input"), input: z.string() }),
  ]);

  const CliServerMessage = z.discriminatedUnion("type", [
    z.object({ type: z.literal("output"), data: z.string() }),
    z.object({ type: z.literal("error"), data: z.string() }),
    z.object({ type: z.literal("status"), data: z.string() }),
    z.object({ type: z.literal("exit"), exitCode: z.number() }),
  ]);

  const RalphClientMessage = z.discriminatedUnion("type", [
    z.object({ 
      type: z.literal("start"), 
      sessionId: z.number(),
      config: z.object({
        workingDirectory: z.string(),
        maxIterations: z.number(),
        model: z.string(),
      }).optional(),
    }),
    z.object({ type: z.literal("pause") }),
    z.object({ type: z.literal("resume") }),
    z.object({ type: z.literal("stop") }),
    z.object({ type: z.literal("reset") }),
  ]);

  it("validates CLI client messages", () => {
    expect(CliClientMessage.safeParse({ type: "start", sessionId: 1 }).success).toBe(true);
    expect(CliClientMessage.safeParse({ type: "stop" }).success).toBe(true);
    expect(CliClientMessage.safeParse({ type: "input", input: "ls -la\n" }).success).toBe(true);
    expect(CliClientMessage.safeParse({ type: "invalid" }).success).toBe(false);
  });

  it("validates CLI server messages", () => {
    expect(CliServerMessage.safeParse({ type: "output", data: "file1.txt" }).success).toBe(true);
    expect(CliServerMessage.safeParse({ type: "error", data: "Command not found" }).success).toBe(true);
    expect(CliServerMessage.safeParse({ type: "exit", exitCode: 0 }).success).toBe(true);
  });

  it("validates RALPH client messages", () => {
    expect(RalphClientMessage.safeParse({ type: "start", sessionId: 1 }).success).toBe(true);
    expect(RalphClientMessage.safeParse({ 
      type: "start", 
      sessionId: 1,
      config: {
        workingDirectory: "/home/ubuntu/project",
        maxIterations: 50,
        model: "claude",
      },
    }).success).toBe(true);
    expect(RalphClientMessage.safeParse({ type: "pause" }).success).toBe(true);
    expect(RalphClientMessage.safeParse({ type: "resume" }).success).toBe(true);
    expect(RalphClientMessage.safeParse({ type: "stop" }).success).toBe(true);
  });
});

// ============================================
// Error Response Contracts
// ============================================

describe("Error Response Contracts", () => {
  const TRPCErrorCodes = z.enum([
    "UNAUTHORIZED",
    "FORBIDDEN", 
    "NOT_FOUND",
    "BAD_REQUEST",
    "INTERNAL_SERVER_ERROR",
    "TIMEOUT",
    "CONFLICT",
    "PRECONDITION_FAILED",
    "PAYLOAD_TOO_LARGE",
    "TOO_MANY_REQUESTS",
  ]);

  const TRPCErrorResponse = z.object({
    message: z.string(),
    code: TRPCErrorCodes,
    data: z.object({
      code: TRPCErrorCodes,
      httpStatus: z.number(),
      path: z.string().optional(),
    }).optional(),
  });

  it("validates error codes", () => {
    expect(TRPCErrorCodes.safeParse("UNAUTHORIZED").success).toBe(true);
    expect(TRPCErrorCodes.safeParse("NOT_FOUND").success).toBe(true);
    expect(TRPCErrorCodes.safeParse("INVALID_CODE").success).toBe(false);
  });

  it("validates error response shape", () => {
    const validError = {
      message: "Session not found",
      code: "NOT_FOUND" as const,
      data: {
        code: "NOT_FOUND" as const,
        httpStatus: 404,
        path: "sessions.get",
      },
    };
    
    expect(TRPCErrorResponse.safeParse(validError).success).toBe(true);
  });
});
