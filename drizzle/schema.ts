import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean, index } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * RALPH Loop Sessions - tracks autonomous coding sessions
 */
export const sessions = mysqlTable("sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sessionId: varchar("sessionId", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  
  // Configuration
  ralphMode: boolean("ralphMode").default(true).notNull(),
  maxIterations: int("maxIterations").default(50).notNull(),
  noProgressThreshold: int("noProgressThreshold").default(3).notNull(),
  autoAskHuman: boolean("autoAskHuman").default(true).notNull(),
  safetyMode: mysqlEnum("safetyMode", ["standard", "strict", "permissive"]).default("standard").notNull(),
  
  // Model selections
  selectedModel: mysqlEnum("selectedModel", ["codex", "claude", "gemini", "manus"]).default("claude").notNull(),
  selectedProfile: varchar("selectedProfile", { length: 100 }).default("patch_goblin").notNull(), // Built-in or custom_<id>
  
  // Status
  status: mysqlEnum("status", ["idle", "running", "paused", "complete", "failed"]).default("idle").notNull(),
  currentIteration: int("currentIteration").default(0).notNull(),
  completionProgress: int("completionProgress").default(0).notNull(),
  circuitBreakerState: mysqlEnum("circuitBreakerState", ["CLOSED", "HALF_OPEN", "OPEN"]).default("CLOSED").notNull(),
  noProgressCount: int("noProgressCount").default(0).notNull(),
  
  // Timestamps
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  // PERFORMANCE: Indexes for frequently queried columns
  userIdIdx: index("sessions_user_id_idx").on(table.userId),
  statusIdx: index("sessions_status_idx").on(table.status),
  userStatusIdx: index("sessions_user_status_idx").on(table.userId, table.status),
}));

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;

/**
 * Completion Criteria - the "promise" items for RALPH
 */
export const completionCriteria = mysqlTable("completion_criteria", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  text: text("text").notNull(),
  checked: boolean("checked").default(false).notNull(),
  checkedAt: timestamp("checkedAt"),
  orderIndex: int("orderIndex").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  // PERFORMANCE: Index for session lookups
  sessionIdIdx: index("criteria_session_id_idx").on(table.sessionId),
}));

export type CompletionCriterion = typeof completionCriteria.$inferSelect;
export type InsertCompletionCriterion = typeof completionCriteria.$inferInsert;

/**
 * Loop Metrics - telemetry data per iteration
 */
export const loopMetrics = mysqlTable("loop_metrics", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  iteration: int("iteration").notNull(),
  
  // Metrics
  diffLines: int("diffLines").default(0).notNull(),
  testsRun: int("testsRun").default(0).notNull(),
  testsPassed: int("testsPassed").default(0).notNull(),
  errorsDetected: int("errorsDetected").default(0).notNull(),
  duration: int("duration").default(0).notNull(), // seconds
  
  // Model used
  model: mysqlEnum("model", ["codex", "claude", "gemini", "manus"]).notNull(),
  
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type LoopMetric = typeof loopMetrics.$inferSelect;
export type InsertLoopMetric = typeof loopMetrics.$inferInsert;

/**
 * File Changes - tracks files modified during sessions
 */
export const fileChanges = mysqlTable("file_changes", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  iteration: int("iteration").notNull(),
  
  path: varchar("path", { length: 512 }).notNull(),
  changeType: mysqlEnum("changeType", ["added", "modified", "deleted"]).notNull(),
  linesAdded: int("linesAdded").default(0).notNull(),
  linesRemoved: int("linesRemoved").default(0).notNull(),
  
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type FileChange = typeof fileChanges.$inferSelect;
export type InsertFileChange = typeof fileChanges.$inferInsert;

/**
 * Saved Prompts - user's prompt library
 */
export const savedPrompts = mysqlTable("saved_prompts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  name: varchar("name", { length: 255 }).notNull(),
  goal: text("goal").notNull(),
  context: text("context"),
  doneWhen: text("doneWhen"),
  doNot: text("doNot"),
  
  // Generated outputs
  expandedPrompt: text("expandedPrompt"),
  completionPromise: text("completionPromise"),
  
  // Metadata
  targetModel: mysqlEnum("targetModel", ["codex", "claude", "gemini", "manus"]),
  packId: varchar("packId", { length: 64 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SavedPrompt = typeof savedPrompts.$inferSelect;
export type InsertSavedPrompt = typeof savedPrompts.$inferInsert;

/**
 * Assembly Line Runs - multi-agent pipeline executions
 */
export const assemblyLineRuns = mysqlTable("assembly_line_runs", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  
  // Stage configuration (JSON array of stage configs)
  stageConfig: text("stageConfig").notNull(), // JSON
  
  // Status
  status: mysqlEnum("status", ["pending", "running", "complete", "failed"]).default("pending").notNull(),
  currentStage: varchar("currentStage", { length: 64 }),
  
  // Results
  output: text("output"),
  
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AssemblyLineRun = typeof assemblyLineRuns.$inferSelect;
export type InsertAssemblyLineRun = typeof assemblyLineRuns.$inferInsert;

/**
 * Diff Hunks - for diff approval workflow
 */
export const diffHunks = mysqlTable("diff_hunks", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  iteration: int("iteration").notNull(),
  
  filePath: varchar("filePath", { length: 512 }).notNull(),
  hunkHeader: varchar("hunkHeader", { length: 255 }).notNull(),
  content: text("content").notNull(),
  
  // Approval status
  approved: boolean("approved"), // null = pending
  approvedAt: timestamp("approvedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DiffHunk = typeof diffHunks.$inferSelect;
export type InsertDiffHunk = typeof diffHunks.$inferInsert;

/**
 * Checkpoints - for rollback functionality
 */
export const checkpoints = mysqlTable("checkpoints", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  iteration: int("iteration").notNull(),
  
  name: varchar("name", { length: 255 }),
  description: text("description"),
  
  // Snapshot data (could be file hashes, git commit, etc.)
  snapshotData: text("snapshotData"), // JSON
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Checkpoint = typeof checkpoints.$inferSelect;
export type InsertCheckpoint = typeof checkpoints.$inferInsert;


/**
 * API Keys - securely stored provider credentials
 */
export const apiKeys = mysqlTable("api_keys", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  provider: mysqlEnum("provider", ["codex", "claude", "gemini", "manus"]).notNull(),
  
  // Encrypted API key (we'll use AES encryption)
  encryptedKey: text("encryptedKey").notNull(),
  
  // Key metadata
  keyHint: varchar("keyHint", { length: 16 }), // Last 4 chars for display
  isValid: boolean("isValid").default(true).notNull(),
  lastValidated: timestamp("lastValidated"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

/**
 * CLI Execution Logs - tracks CLI process runs
 */
export const cliExecutions = mysqlTable("cli_executions", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  iteration: int("iteration").notNull(),
  
  // Command info
  command: text("command").notNull(),
  workingDirectory: varchar("workingDirectory", { length: 512 }),
  
  // Process info
  pid: int("pid"),
  exitCode: int("exitCode"),
  
  // Output (stored for history)
  stdout: text("stdout"),
  stderr: text("stderr"),
  
  // Status
  status: mysqlEnum("status", ["running", "completed", "failed", "killed"]).default("running").notNull(),
  
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type CliExecution = typeof cliExecutions.$inferSelect;
export type InsertCliExecution = typeof cliExecutions.$inferInsert;


/**
 * Session Templates - reusable session configurations
 * Stores entire session setup including model, agent, prompt, and criteria
 */
export const sessionTemplates = mysqlTable("session_templates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Template metadata
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  tags: text("tags"), // JSON array of tags
  
  // Model & Agent configuration
  selectedModel: mysqlEnum("selectedModel", ["codex", "claude", "gemini", "manus"]).default("claude").notNull(),
  selectedProfile: varchar("selectedProfile", { length: 100 }).default("patch_goblin").notNull(), // Built-in or custom_<id>
  
  // RALPH configuration
  ralphMode: boolean("ralphMode").default(true).notNull(),
  maxIterations: int("maxIterations").default(50).notNull(),
  noProgressThreshold: int("noProgressThreshold").default(3).notNull(),
  autoAskHuman: boolean("autoAskHuman").default(true).notNull(),
  safetyMode: mysqlEnum("safetyMode", ["standard", "strict", "permissive"]).default("standard").notNull(),
  
  // Prompt fields
  promptGoal: text("promptGoal"),
  promptContext: text("promptContext"),
  promptDoneWhen: text("promptDoneWhen"),
  promptDoNot: text("promptDoNot"),
  
  // Completion criteria (JSON array of strings)
  completionCriteria: text("completionCriteria"), // JSON array
  
  // Usage tracking
  usageCount: int("usageCount").default(0).notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SessionTemplate = typeof sessionTemplates.$inferSelect;
export type InsertSessionTemplate = typeof sessionTemplates.$inferInsert;


/**
 * Research Sessions - Deep Research feature
 * Tracks AI-powered research sessions with multi-step reasoning
 */
export const researchSessions = mysqlTable("research_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Research topic/question
  topic: text("topic").notNull(),
  
  // Research configuration
  depth: mysqlEnum("depth", ["quick", "standard", "deep"]).default("standard").notNull(),
  
  // Status tracking
  status: mysqlEnum("status", ["pending", "researching", "synthesizing", "complete", "failed"]).default("pending").notNull(),
  currentStep: int("currentStep").default(0).notNull(),
  totalSteps: int("totalSteps").default(5).notNull(),
  
  // Final synthesized result
  summary: text("summary"),
  
  // Research metadata
  sourcesCount: int("sourcesCount").default(0).notNull(),
  tokensUsed: int("tokensUsed").default(0).notNull(),
  
  // Sharing
  shareToken: varchar("shareToken", { length: 64 }),
  isPublic: boolean("isPublic").default(false).notNull(),
  
  // Timestamps
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("research_user_id_idx").on(table.userId),
  statusIdx: index("research_status_idx").on(table.status),
}));

export type ResearchSession = typeof researchSessions.$inferSelect;
export type InsertResearchSession = typeof researchSessions.$inferInsert;

/**
 * Research Findings - Individual findings/sources from research
 */
export const researchFindings = mysqlTable("research_findings", {
  id: int("id").autoincrement().primaryKey(),
  researchSessionId: int("researchSessionId").notNull(),
  
  // Finding details
  title: varchar("title", { length: 512 }).notNull(),
  content: text("content").notNull(),
  
  // Source information
  sourceType: mysqlEnum("sourceType", ["web", "paper", "documentation", "code", "analysis"]).default("web").notNull(),
  sourceUrl: text("sourceUrl"),
  sourceTitle: varchar("sourceTitle", { length: 512 }),
  
  // Relevance and confidence
  relevanceScore: int("relevanceScore").default(50).notNull(), // 0-100
  confidence: mysqlEnum("confidence", ["low", "medium", "high"]).default("medium").notNull(),
  
  // Step in research process
  stepNumber: int("stepNumber").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  sessionIdIdx: index("findings_session_id_idx").on(table.researchSessionId),
}));

export type ResearchFinding = typeof researchFindings.$inferSelect;
export type InsertResearchFinding = typeof researchFindings.$inferInsert;

/**
 * Research Steps - Tracks the reasoning steps in research
 */
export const researchSteps = mysqlTable("research_steps", {
  id: int("id").autoincrement().primaryKey(),
  researchSessionId: int("researchSessionId").notNull(),
  
  stepNumber: int("stepNumber").notNull(),
  stepType: mysqlEnum("stepType", ["planning", "searching", "analyzing", "synthesizing", "verifying"]).notNull(),
  
  // Step details
  query: text("query"), // What was searched/analyzed
  reasoning: text("reasoning"), // Why this step was taken
  result: text("result"), // What was found
  
  // Status
  status: mysqlEnum("status", ["pending", "running", "complete", "failed"]).default("pending").notNull(),
  
  // Timing
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  sessionIdIdx: index("steps_session_id_idx").on(table.researchSessionId),
}));

export type ResearchStep = typeof researchSteps.$inferSelect;
export type InsertResearchStep = typeof researchSteps.$inferInsert;


/**
 * Research Follow-up Questions - Q&A for diving deeper into research
 */
export const researchFollowUps = mysqlTable("research_follow_ups", {
  id: int("id").autoincrement().primaryKey(),
  researchSessionId: int("researchSessionId").notNull(),
  
  // Question and answer
  question: text("question").notNull(),
  answer: text("answer"),
  
  // Status
  status: mysqlEnum("status", ["pending", "processing", "complete", "failed"]).default("pending").notNull(),
  
  // Metadata
  tokensUsed: int("tokensUsed").default(0).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  answeredAt: timestamp("answeredAt"),
}, (table) => ({
  sessionIdIdx: index("followups_session_id_idx").on(table.researchSessionId),
}));

export type ResearchFollowUp = typeof researchFollowUps.$inferSelect;
export type InsertResearchFollowUp = typeof researchFollowUps.$inferInsert;


/**
 * Custom Research Templates - User-created templates for frequently researched topics
 */
export const customTemplates = mysqlTable("custom_templates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Template details
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  topic: text("topic").notNull(),
  category: varchar("category", { length: 100 }).default("custom").notNull(),
  categoryId: int("categoryId"), // Reference to user_template_categories
  depth: mysqlEnum("depth", ["quick", "standard", "deep"]).default("standard").notNull(),
  tags: json("tags").$type<string[]>(),
  
  // Visibility
  isPublic: boolean("isPublic").default(false).notNull(),
  
  // Metadata
  usageCount: int("usageCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("custom_templates_user_id_idx").on(table.userId),
  categoryIdx: index("custom_templates_category_idx").on(table.category),
}));

export type CustomTemplate = typeof customTemplates.$inferSelect;
export type InsertCustomTemplate = typeof customTemplates.$inferInsert;


/**
 * Template Favorites - User's favorite templates (both built-in and custom)
 */
export const templateFavorites = mysqlTable("template_favorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Template reference (either built-in ID or custom template ID)
  templateId: varchar("templateId", { length: 100 }).notNull(), // Built-in template ID string
  customTemplateId: int("customTemplateId"), // Custom template ID (if applicable)
  templateType: mysqlEnum("templateType", ["builtin", "custom"]).default("builtin").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("template_favorites_user_id_idx").on(table.userId),
  uniqueFavorite: index("template_favorites_unique_idx").on(table.userId, table.templateId, table.templateType),
}));

export type TemplateFavorite = typeof templateFavorites.$inferSelect;
export type InsertTemplateFavorite = typeof templateFavorites.$inferInsert;


/**
 * Template Usage Analytics - Track template usage for popularity metrics
 */
export const templateUsage = mysqlTable("template_usage", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Template reference
  templateId: varchar("templateId", { length: 100 }).notNull(),
  customTemplateId: int("customTemplateId"),
  templateType: mysqlEnum("templateType", ["builtin", "custom"]).default("builtin").notNull(),
  
  // Research session created from this template
  researchSessionId: int("researchSessionId"),
  
  usedAt: timestamp("usedAt").defaultNow().notNull(),
}, (table) => ({
  templateIdIdx: index("template_usage_template_id_idx").on(table.templateId),
  userIdIdx: index("template_usage_user_id_idx").on(table.userId),
  usedAtIdx: index("template_usage_used_at_idx").on(table.usedAt),
}));

export type TemplateUsage = typeof templateUsage.$inferSelect;
export type InsertTemplateUsage = typeof templateUsage.$inferInsert;


/**
 * User Template Categories - Custom categories for organizing user's templates
 */
export const userTemplateCategories = mysqlTable("user_template_categories", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }).default("#8b5cf6"), // Hex color for UI
  icon: varchar("icon", { length: 50 }).default("folder"), // Icon name
  sortOrder: int("sortOrder").default(0).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("user_template_categories_user_id_idx").on(table.userId),
  uniqueNamePerUser: index("user_template_categories_unique_name_idx").on(table.userId, table.name),
}));

export type UserTemplateCategory = typeof userTemplateCategories.$inferSelect;
export type InsertUserTemplateCategory = typeof userTemplateCategories.$inferInsert;


// ============================================
// RAG (Retrieval-Augmented Generation) System
// ============================================

/**
 * RAG Documents - Source documents ingested into the knowledge base
 */
export const ragDocuments = mysqlTable("rag_documents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Document metadata
  title: varchar("title", { length: 255 }).notNull(),
  source: varchar("source", { length: 512 }).notNull(), // file path, URL, or identifier
  sourceType: mysqlEnum("sourceType", ["file", "url", "text", "code", "documentation"]).default("file").notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  
  // Content
  content: text("content").notNull(), // Full document content
  contentHash: varchar("contentHash", { length: 64 }).notNull(), // SHA-256 for deduplication
  
  // Processing status
  status: mysqlEnum("status", ["pending", "processing", "indexed", "failed"]).default("pending").notNull(),
  chunkCount: int("chunkCount").default(0).notNull(),
  errorMessage: text("errorMessage"),
  
  // Metadata
  metadata: json("metadata").$type<Record<string, unknown>>(),
  tags: json("tags").$type<string[]>(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  indexedAt: timestamp("indexedAt"),
}, (table) => ({
  userIdIdx: index("rag_documents_user_id_idx").on(table.userId),
  statusIdx: index("rag_documents_status_idx").on(table.status),
  contentHashIdx: index("rag_documents_content_hash_idx").on(table.contentHash),
}));

export type RagDocument = typeof ragDocuments.$inferSelect;
export type InsertRagDocument = typeof ragDocuments.$inferInsert;


/**
 * RAG Chunks - Document chunks with embeddings for semantic search
 */
export const ragChunks = mysqlTable("rag_chunks", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  
  // Chunk content
  content: text("content").notNull(),
  chunkIndex: int("chunkIndex").notNull(), // Position in document
  
  // Embedding vector (stored as JSON array of floats)
  // Using text for compatibility - will parse to float array for similarity search
  embedding: text("embedding").notNull(), // JSON array of 1536 floats (OpenAI ada-002 dimension)
  
  // Context for better retrieval
  previousChunkSummary: text("previousChunkSummary"), // Summary of previous chunk for context
  nextChunkSummary: text("nextChunkSummary"), // Summary of next chunk for context
  
  // Metadata
  tokenCount: int("tokenCount").default(0).notNull(),
  startChar: int("startChar").notNull(), // Character offset in original document
  endChar: int("endChar").notNull(),
  
  // Section info (if available)
  sectionTitle: varchar("sectionTitle", { length: 255 }),
  sectionLevel: int("sectionLevel"), // Heading level (1-6)
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  documentIdIdx: index("rag_chunks_document_id_idx").on(table.documentId),
  chunkIndexIdx: index("rag_chunks_chunk_index_idx").on(table.documentId, table.chunkIndex),
}));

export type RagChunk = typeof ragChunks.$inferSelect;
export type InsertRagChunk = typeof ragChunks.$inferInsert;


/**
 * RAG Conversations - Chat sessions with the RAG system
 */
export const ragConversations = mysqlTable("rag_conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Conversation metadata
  title: varchar("title", { length: 255 }),
  
  // Configuration
  systemPrompt: text("systemPrompt"), // Custom system prompt for this conversation
  temperature: int("temperature").default(70).notNull(), // 0-100, stored as int (divide by 100 for actual value)
  maxTokens: int("maxTokens").default(2048).notNull(),
  
  // Stats
  messageCount: int("messageCount").default(0).notNull(),
  totalTokensUsed: int("totalTokensUsed").default(0).notNull(),
  
  // Status
  isArchived: boolean("isArchived").default(false).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("rag_conversations_user_id_idx").on(table.userId),
  updatedAtIdx: index("rag_conversations_updated_at_idx").on(table.updatedAt),
}));

export type RagConversation = typeof ragConversations.$inferSelect;
export type InsertRagConversation = typeof ragConversations.$inferInsert;


/**
 * RAG Messages - Individual messages in RAG conversations
 */
export const ragMessages = mysqlTable("rag_messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  
  // Message content
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  
  // Retrieved context (for assistant messages)
  retrievedChunks: json("retrievedChunks").$type<{
    chunkId: number;
    documentId: number;
    documentTitle: string;
    content: string;
    similarity: number;
  }[]>(),
  
  // Token usage
  promptTokens: int("promptTokens").default(0).notNull(),
  completionTokens: int("completionTokens").default(0).notNull(),
  
  // Feedback
  feedback: mysqlEnum("feedback", ["positive", "negative"]),
  feedbackComment: text("feedbackComment"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  conversationIdIdx: index("rag_messages_conversation_id_idx").on(table.conversationId),
  roleIdx: index("rag_messages_role_idx").on(table.role),
}));

export type RagMessage = typeof ragMessages.$inferSelect;
export type InsertRagMessage = typeof ragMessages.$inferInsert;


/**
 * RAG Search History - Track searches for analytics and suggestions
 */
export const ragSearchHistory = mysqlTable("rag_search_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Search query
  query: text("query").notNull(),
  queryEmbedding: text("queryEmbedding"), // Cached embedding for the query
  
  // Results
  resultCount: int("resultCount").default(0).notNull(),
  topChunkIds: json("topChunkIds").$type<number[]>(),
  
  // Context
  conversationId: int("conversationId"), // If search was part of a conversation
  
  // Performance
  searchDurationMs: int("searchDurationMs"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("rag_search_history_user_id_idx").on(table.userId),
  createdAtIdx: index("rag_search_history_created_at_idx").on(table.createdAt),
}));

export type RagSearchHistory = typeof ragSearchHistory.$inferSelect;
export type InsertRagSearchHistory = typeof ragSearchHistory.$inferInsert;


// ============================================
// Custom Agent Profiles
// ============================================

/**
 * Custom Agent Profiles - User-created agent personas for RALPH Loop
 */
export const customAgentProfiles = mysqlTable("custom_agent_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Profile identity
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull(), // URL-safe identifier
  description: text("description").notNull(),
  
  // Visual customization
  icon: varchar("icon", { length: 50 }).default("Bot").notNull(), // Lucide icon name
  color: varchar("color", { length: 20 }).default("purple").notNull(), // Tailwind color name
  
  // Behavior configuration
  systemPrompt: text("systemPrompt").notNull(), // The core instruction for the agent
  outputStyle: mysqlEnum("outputStyle", ["concise", "detailed", "balanced"]).default("balanced").notNull(),
  codeGeneration: mysqlEnum("codeGeneration", ["full", "diffs", "none"]).default("diffs").notNull(),
  testingApproach: mysqlEnum("testingApproach", ["test_first", "test_after", "no_tests"]).default("test_after").notNull(),
  
  // Advanced settings (JSON for flexibility)
  settings: json("settings").$type<{
    maxResponseLength?: number;
    preferredLanguages?: string[];
    avoidPatterns?: string[];
    focusAreas?: string[];
  }>(),
  
  // Usage tracking
  usageCount: int("usageCount").default(0).notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
  
  // Metadata
  isPublic: boolean("isPublic").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("custom_agent_profiles_user_id_idx").on(table.userId),
  slugIdx: index("custom_agent_profiles_slug_idx").on(table.slug),
}));

export type CustomAgentProfile = typeof customAgentProfiles.$inferSelect;
export type InsertCustomAgentProfile = typeof customAgentProfiles.$inferInsert;


/**
 * Project Prompts - stores PROMPT.md content for each project
 * This is the core of the Ralph Loop technique
 */
export const projectPrompts = mysqlTable("project_prompts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  projectPath: varchar("project_path", { length: 500 }).notNull(),
  content: text("content").notNull(),
  version: int("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ProjectPrompt = typeof projectPrompts.$inferSelect;
export type InsertProjectPrompt = typeof projectPrompts.$inferInsert;

/**
 * Prompt Signs - tracks "signs" added to prompts based on failures
 * These are the tuning adjustments that make Ralph work
 */
export const promptSigns = mysqlTable("prompt_signs", {
  id: int("id").autoincrement().primaryKey(),
  promptId: int("prompt_id").notNull(),
  signText: text("sign_text").notNull(),
  failurePattern: varchar("failure_pattern", { length: 500 }),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export type PromptSign = typeof promptSigns.$inferSelect;
export type InsertPromptSign = typeof promptSigns.$inferInsert;
