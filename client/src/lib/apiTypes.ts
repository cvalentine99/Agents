/**
 * API Type Exports and Validation Helpers
 * 
 * This module provides type-safe access to all API types and validation utilities
 * for frontend components to use when interacting with the tRPC API.
 */

import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";

// ============================================
// Router Type Inference
// ============================================

export type RouterInput = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;

// ============================================
// Auth Types
// ============================================

export type User = NonNullable<RouterOutput["auth"]["me"]>;
export type UserRole = User["role"];

// ============================================
// API Keys Types
// ============================================

export type ApiKeyProvider = "codex" | "claude" | "gemini" | "manus";
export type SaveApiKeyInput = RouterInput["apiKeys"]["save"];
export type ApiKeyListItem = RouterOutput["apiKeys"]["list"][number];

// ============================================
// Sessions Types
// ============================================

export type SessionStatus = "idle" | "running" | "paused" | "complete" | "failed";
export type CircuitBreakerState = "CLOSED" | "HALF_OPEN" | "OPEN";

export type CreateSessionInput = RouterInput["sessions"]["create"];
export type UpdateSessionInput = RouterInput["sessions"]["update"];
export type Session = NonNullable<RouterOutput["sessions"]["get"]>;
export type SessionListItem = RouterOutput["sessions"]["list"][number];

// ============================================
// Criteria Types
// ============================================

export type AddCriterionInput = RouterInput["criteria"]["add"];
export type Criterion = RouterOutput["criteria"]["list"][number];

// ============================================
// Research Types
// ============================================

export type ResearchDepth = "quick" | "standard" | "deep";
export type ResearchStatus = "pending" | "researching" | "synthesizing" | "complete" | "failed";
export type CreateResearchInput = RouterInput["research"]["create"];
export type Research = NonNullable<RouterOutput["research"]["get"]>;
export type ResearchFinding = Research["findings"][number];

// ============================================
// RAG Types
// ============================================

export type IngestDocumentInput = RouterInput["rag"]["ingestDocument"];
export type SearchInput = RouterInput["rag"]["search"];
export type ChatInput = RouterInput["rag"]["chat"];
export type RagDocument = RouterOutput["rag"]["listDocuments"][number];
export type RagConversation = RouterOutput["rag"]["listConversations"][number];
export type SearchResult = RouterOutput["rag"]["search"];

// ============================================
// Agent Profiles Types
// ============================================

export type OutputStyle = "concise" | "detailed" | "balanced";
export type CodeGeneration = "full" | "diffs" | "none";
export type TestingApproach = "tdd" | "test-after" | "no-tests";

export type CreateProfileInput = RouterInput["agentProfiles"]["create"];
export type AgentProfilesList = RouterOutput["agentProfiles"]["list"];
export type CustomAgentProfile = AgentProfilesList["custom"][number];
export type BuiltInProfile = AgentProfilesList["builtIn"][number];
export type ProfileTemplatesList = RouterOutput["agentProfiles"]["listTemplates"];
export type ProfileTemplate = ProfileTemplatesList["templates"][number];

// ============================================
// PROMPT.md Types
// ============================================

export type PromptMdContent = RouterOutput["promptMd"]["get"];
export type SavePromptInput = RouterInput["promptMd"]["save"];
export type AddSignInput = RouterInput["promptMd"]["addSign"];
export type SuggestedSign = RouterOutput["promptMd"]["getSuggestedSigns"][number];

// ============================================
// Auto-Sign Types
// ============================================

export type RecordFailureInput = RouterInput["autoSign"]["recordFailure"];
export type AutoSignSuggestion = RouterOutput["autoSign"]["getSuggestions"][number];

// ============================================
// File Browser Types
// ============================================

export type DirectoryEntry = RouterOutput["fileBrowser"]["listDirectory"]["entries"][number];
export type ProjectDetection = RouterOutput["fileBrowser"]["isProjectDirectory"];

// ============================================
// Templates Types
// ============================================

export type ResearchTemplate = RouterOutput["templates"]["list"][number];
export type CreateTemplateInput = RouterInput["templates"]["create"];
export type TemplateCategory = RouterOutput["templates"]["listCategories"][number];

// ============================================
// Session Templates Types
// ============================================

export type SessionTemplate = RouterOutput["sessionTemplates"]["list"][number];
export type CreateSessionTemplateInput = RouterInput["sessionTemplates"]["create"];

// ============================================
// Validation Helpers
// ============================================

/**
 * Validates an API key provider string
 */
export function isValidProvider(provider: string): provider is ApiKeyProvider {
  return ["codex", "claude", "gemini", "manus"].includes(provider);
}

/**
 * Validates a session status string
 */
export function isValidSessionStatus(status: string): status is SessionStatus {
  return ["idle", "running", "paused", "complete", "failed"].includes(status);
}

/**
 * Validates a circuit breaker state string
 */
export function isValidCircuitBreakerState(state: string): state is CircuitBreakerState {
  return ["CLOSED", "HALF_OPEN", "OPEN"].includes(state);
}

/**
 * Validates a research depth string
 */
export function isValidResearchDepth(depth: string): depth is ResearchDepth {
  return ["quick", "standard", "deep"].includes(depth);
}

/**
 * Validates a hex color string
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Validates an output style string
 */
export function isValidOutputStyle(style: string): style is OutputStyle {
  return ["concise", "detailed", "balanced"].includes(style);
}

/**
 * Validates a code generation mode string
 */
export function isValidCodeGeneration(mode: string): mode is CodeGeneration {
  return ["full", "diffs", "none"].includes(mode);
}

/**
 * Validates a testing approach string
 */
export function isValidTestingApproach(approach: string): approach is TestingApproach {
  return ["tdd", "test-after", "no-tests"].includes(approach);
}

// ============================================
// Type Guards
// ============================================

/**
 * Type guard for checking if a session is active
 */
export function isActiveSession(session: SessionListItem): boolean {
  return session.status === "running" || session.status === "paused";
}

/**
 * Type guard for checking if a session is complete
 */
export function isCompletedSession(session: SessionListItem): boolean {
  return session.status === "complete" || session.status === "failed";
}

/**
 * Type guard for checking if circuit breaker is tripped
 */
export function isCircuitBreakerTripped(state: CircuitBreakerState): boolean {
  return state === "OPEN" || state === "HALF_OPEN";
}

/**
 * Type guard for checking if research is in progress
 */
export function isResearchInProgress(status: ResearchStatus): boolean {
  return status === "pending" || status === "researching" || status === "synthesizing";
}

// ============================================
// Utility Types
// ============================================

/**
 * Extract the success response type from a mutation
 */
export type MutationSuccess<T> = T extends { success: true } ? T : never;

/**
 * Make all properties of T optional except those in K
 */
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/**
 * Extract array element type
 */
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

// ============================================
// Constants
// ============================================

export const API_KEY_PROVIDERS: ApiKeyProvider[] = ["codex", "claude", "gemini", "manus"];

export const SESSION_STATUSES: SessionStatus[] = ["idle", "running", "paused", "complete", "failed"];

export const CIRCUIT_BREAKER_STATES: CircuitBreakerState[] = ["CLOSED", "HALF_OPEN", "OPEN"];

export const RESEARCH_DEPTHS: ResearchDepth[] = ["quick", "standard", "deep"];

export const OUTPUT_STYLES: OutputStyle[] = ["concise", "detailed", "balanced"];

export const CODE_GENERATION_MODES: CodeGeneration[] = ["full", "diffs", "none"];

export const TESTING_APPROACHES: TestingApproach[] = ["tdd", "test-after", "no-tests"];

// ============================================
// Default Values
// ============================================

export const DEFAULT_SESSION_CONFIG = {
  maxIterations: 50,
  noProgressThreshold: 5,
  selectedModel: "claude" as ApiKeyProvider,
  selectedProfile: "patch_goblin",
} as const;

export const DEFAULT_RESEARCH_CONFIG = {
  depth: "standard" as ResearchDepth,
} as const;

export const DEFAULT_PROFILE_CONFIG = {
  outputStyle: "balanced" as OutputStyle,
  codeGeneration: "full" as CodeGeneration,
  testingApproach: "test-after" as TestingApproach,
} as const;
