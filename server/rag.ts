/**
 * RAG (Retrieval-Augmented Generation) Service
 * 
 * Provides document ingestion, chunking, embedding generation,
 * semantic search, and context-aware response generation.
 */

import { drizzle } from "drizzle-orm/mysql2";
import { invokeLLM } from "./_core/llm";
import { 
  ragDocuments, 
  ragChunks, 
  ragConversations, 
  ragMessages,
  ragSearchHistory,
  type RagDocument,
  type RagChunk,
  type RagConversation,
  type RagMessage
} from "../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import crypto from "crypto";

// ============================================
// Types
// ============================================

export interface ChunkMetadata {
  chunkId: number;
  documentId: number;
  documentTitle: string;
  content: string;
  similarity: number;
  sectionTitle?: string;
}

export interface RAGSearchResult {
  chunks: ChunkMetadata[];
  query: string;
  searchDurationMs: number;
}

export interface RAGChatResponse {
  content: string;
  retrievedChunks: ChunkMetadata[];
  promptTokens: number;
  completionTokens: number;
}

// ============================================
// Configuration
// ============================================

const CHUNK_SIZE = 1000; // Characters per chunk
const CHUNK_OVERLAP = 200; // Overlap between chunks
const TOP_K_RESULTS = 5; // Number of chunks to retrieve
const EMBEDDING_DIMENSION = 1536; // OpenAI ada-002 dimension

// ============================================
// Database Helper
// ============================================

let _db: ReturnType<typeof drizzle> | null = null;

async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[RAG] Failed to connect to database:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Generate SHA-256 hash of content for deduplication
 */
export function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Estimate token count (rough approximation: ~4 chars per token)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Split text into overlapping chunks
 */
export function chunkText(
  text: string, 
  chunkSize: number = CHUNK_SIZE, 
  overlap: number = CHUNK_OVERLAP
): { content: string; startChar: number; endChar: number }[] {
  const chunks: { content: string; startChar: number; endChar: number }[] = [];
  
  // Split by paragraphs first to maintain semantic boundaries
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = "";
  let startChar = 0;
  let currentStart = 0;
  
  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
      // Save current chunk
      chunks.push({
        content: currentChunk.trim(),
        startChar: currentStart,
        endChar: startChar - 1
      });
      
      // Start new chunk with overlap
      const overlapText = currentChunk.slice(-overlap);
      currentChunk = overlapText + "\n\n" + paragraph;
      currentStart = startChar - overlap;
    } else {
      if (currentChunk.length > 0) {
        currentChunk += "\n\n";
      }
      currentChunk += paragraph;
    }
    startChar += paragraph.length + 2; // +2 for \n\n
  }
  
  // Add final chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      startChar: currentStart,
      endChar: text.length
    });
  }
  
  return chunks;
}

/**
 * Extract section information from markdown content
 */
export function extractSectionInfo(content: string): { title?: string; level?: number } {
  const headingMatch = content.match(/^(#{1,6})\s+(.+)$/m);
  if (headingMatch) {
    return {
      level: headingMatch[1].length,
      title: headingMatch[2].trim()
    };
  }
  return {};
}

/**
 * Generate embedding for text using LLM
 * Uses a simple approach: generate a semantic summary and use it as a pseudo-embedding
 * For production, you'd use a proper embedding API
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Generate a semantic representation using LLM
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an embedding generator. Given text, output a JSON array of exactly ${EMBEDDING_DIMENSION} floating point numbers between -1 and 1 that represent the semantic meaning of the text. Focus on key concepts, entities, and relationships. Output ONLY the JSON array, nothing else.`
      },
      {
        role: "user",
        content: `Generate embedding for: "${text.slice(0, 500)}"`
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "embedding",
        strict: true,
        schema: {
          type: "object",
          properties: {
            vector: {
              type: "array",
              items: { type: "number" },
              description: "Embedding vector"
            }
          },
          required: ["vector"],
          additionalProperties: false
        }
      }
    }
  });
  
  try {
    const msgContent = response.choices[0].message.content;
    const contentStr = typeof msgContent === 'string' ? msgContent : '{}';
    const parsed = JSON.parse(contentStr);
    let vector = parsed.vector || [];
    
    // Ensure correct dimension
    if (vector.length < EMBEDDING_DIMENSION) {
      // Pad with zeros
      vector = [...vector, ...new Array(EMBEDDING_DIMENSION - vector.length).fill(0)];
    } else if (vector.length > EMBEDDING_DIMENSION) {
      vector = vector.slice(0, EMBEDDING_DIMENSION);
    }
    
    // Normalize
    const magnitude = Math.sqrt(vector.reduce((sum: number, v: number) => sum + v * v, 0));
    if (magnitude > 0) {
      vector = vector.map((v: number) => v / magnitude);
    }
    
    return vector;
  } catch {
    // Fallback: generate random normalized vector (not ideal but prevents failures)
    const vector = Array.from({ length: EMBEDDING_DIMENSION }, () => Math.random() * 2 - 1);
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    return vector.map(v => v / magnitude);
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }
  
  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);
  
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  
  return dotProduct / (magnitudeA * magnitudeB);
}

// ============================================
// Document Management
// ============================================

/**
 * Ingest a document into the RAG system
 */
export async function ingestDocument(
  userId: number,
  title: string,
  content: string,
  source: string,
  sourceType: "file" | "url" | "text" | "code" | "documentation" = "text",
  tags?: string[],
  metadata?: Record<string, unknown>
): Promise<{ documentId: number; chunkCount: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const contentHash = hashContent(content);
  
  // Check for duplicate
  const existing = await db.select().from(ragDocuments)
    .where(and(
      eq(ragDocuments.userId, userId),
      eq(ragDocuments.contentHash, contentHash)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    return { documentId: existing[0].id, chunkCount: existing[0].chunkCount };
  }
  
  // Create document record
  const [doc] = await db.insert(ragDocuments).values({
    userId,
    title,
    source,
    sourceType,
    content,
    contentHash,
    status: "processing",
    tags: tags || [],
    metadata: metadata || {}
  });
  
  const documentId = doc.insertId;
  
  try {
    // Chunk the document
    const chunks = chunkText(content);
    
    // Generate embeddings and store chunks
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const sectionInfo = extractSectionInfo(chunk.content);
      
      // Generate embedding
      const embedding = await generateEmbedding(chunk.content);
      
      await db.insert(ragChunks).values({
        documentId,
        content: chunk.content,
        chunkIndex: i,
        embedding: JSON.stringify(embedding),
        tokenCount: estimateTokens(chunk.content),
        startChar: chunk.startChar,
        endChar: chunk.endChar,
        sectionTitle: sectionInfo.title,
        sectionLevel: sectionInfo.level
      });
    }
    
    // Update document status
    await db.update(ragDocuments)
      .set({ 
        status: "indexed", 
        chunkCount: chunks.length,
        indexedAt: new Date()
      })
      .where(eq(ragDocuments.id, documentId));
    
    return { documentId, chunkCount: chunks.length };
  } catch (error) {
    // Mark as failed
    await db.update(ragDocuments)
      .set({ 
        status: "failed", 
        errorMessage: error instanceof Error ? error.message : "Unknown error"
      })
      .where(eq(ragDocuments.id, documentId));
    
    throw error;
  }
}

/**
 * Delete a document and its chunks
 */
export async function deleteDocument(documentId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verify ownership
  const docs = await db.select().from(ragDocuments)
    .where(and(
      eq(ragDocuments.id, documentId),
      eq(ragDocuments.userId, userId)
    ))
    .limit(1);
  
  if (docs.length === 0) return false;
  
  // Delete chunks first
  await db.delete(ragChunks).where(eq(ragChunks.documentId, documentId));
  
  // Delete document
  await db.delete(ragDocuments).where(eq(ragDocuments.id, documentId));
  
  return true;
}

/**
 * List documents for a user
 */
export async function listDocuments(userId: number): Promise<RagDocument[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(ragDocuments)
    .where(eq(ragDocuments.userId, userId))
    .orderBy(desc(ragDocuments.createdAt));
}

// ============================================
// Semantic Search
// ============================================

/**
 * Search for relevant chunks using semantic similarity
 */
export async function semanticSearch(
  userId: number,
  query: string,
  topK: number = TOP_K_RESULTS,
  conversationId?: number
): Promise<RAGSearchResult> {
  const db = await getDb();
  if (!db) return { chunks: [], query, searchDurationMs: 0 };
  
  const startTime = Date.now();
  
  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);
  
  // Get all documents for user that are indexed
  const userDocs = await db.select({ id: ragDocuments.id, title: ragDocuments.title })
    .from(ragDocuments)
    .where(and(
      eq(ragDocuments.userId, userId),
      eq(ragDocuments.status, "indexed")
    ));
  
  const docIds = userDocs.map((d) => d.id);
  const docTitles = new Map(userDocs.map((d) => [d.id, d.title]));
  
  if (docIds.length === 0) {
    return { chunks: [], query, searchDurationMs: Date.now() - startTime };
  }
  
  // Get all chunks for these documents
  const allChunks = await db.select().from(ragChunks)
    .where(sql`${ragChunks.documentId} IN (${sql.join(docIds.map((id) => sql`${id}`), sql`, `)})`);
  
  // Calculate similarities
  const chunksWithSimilarity: ChunkMetadata[] = allChunks.map((chunk) => {
    const chunkEmbedding = JSON.parse(chunk.embedding) as number[];
    const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);
    
    return {
      chunkId: chunk.id,
      documentId: chunk.documentId,
      documentTitle: docTitles.get(chunk.documentId) || "Unknown",
      content: chunk.content,
      similarity,
      sectionTitle: chunk.sectionTitle || undefined
    };
  });
  
  // Sort by similarity and take top K
  const topChunks = chunksWithSimilarity
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
  
  const searchDurationMs = Date.now() - startTime;
  
  // Log search history
  await db.insert(ragSearchHistory).values({
    userId,
    query,
    queryEmbedding: JSON.stringify(queryEmbedding),
    resultCount: topChunks.length,
    topChunkIds: topChunks.map((c) => c.chunkId),
    conversationId,
    searchDurationMs
  });
  
  return {
    chunks: topChunks,
    query,
    searchDurationMs
  };
}

// ============================================
// Conversation Management
// ============================================

/**
 * Create a new RAG conversation
 */
export async function createConversation(
  userId: number,
  title?: string,
  systemPrompt?: string
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(ragConversations).values({
    userId,
    title: title || "New Conversation",
    systemPrompt
  });
  
  return result.insertId;
}

/**
 * Get conversation with messages
 */
export async function getConversation(conversationId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const conversations = await db.select().from(ragConversations)
    .where(and(
      eq(ragConversations.id, conversationId),
      eq(ragConversations.userId, userId)
    ))
    .limit(1);
  
  if (conversations.length === 0) return null;
  
  const conversation = conversations[0];
  
  const messages = await db.select().from(ragMessages)
    .where(eq(ragMessages.conversationId, conversationId))
    .orderBy(ragMessages.createdAt);
  
  return { ...conversation, messages };
}

/**
 * List conversations for a user
 */
export async function listConversations(userId: number, includeArchived = false): Promise<RagConversation[]> {
  const db = await getDb();
  if (!db) return [];
  
  if (includeArchived) {
    return db.select().from(ragConversations)
      .where(eq(ragConversations.userId, userId))
      .orderBy(desc(ragConversations.updatedAt));
  }
  
  return db.select().from(ragConversations)
    .where(and(
      eq(ragConversations.userId, userId),
      eq(ragConversations.isArchived, false)
    ))
    .orderBy(desc(ragConversations.updatedAt));
}

/**
 * Archive a conversation
 */
export async function archiveConversation(conversationId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db.update(ragConversations)
    .set({ isArchived: true })
    .where(and(
      eq(ragConversations.id, conversationId),
      eq(ragConversations.userId, userId)
    ));
  
  return (result as unknown as { affectedRows: number }).affectedRows > 0;
}

/**
 * Delete a conversation and its messages
 */
export async function deleteConversation(conversationId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  // Verify ownership
  const convs = await db.select().from(ragConversations)
    .where(and(
      eq(ragConversations.id, conversationId),
      eq(ragConversations.userId, userId)
    ))
    .limit(1);
  
  if (convs.length === 0) return false;
  
  // Delete messages first
  await db.delete(ragMessages).where(eq(ragMessages.conversationId, conversationId));
  
  // Delete conversation
  await db.delete(ragConversations).where(eq(ragConversations.id, conversationId));
  
  return true;
}

// ============================================
// RAG Chat
// ============================================

/**
 * Generate a response using RAG
 */
export async function ragChat(
  userId: number,
  conversationId: number,
  userMessage: string
): Promise<RAGChatResponse> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get conversation
  const conversations = await db.select().from(ragConversations)
    .where(and(
      eq(ragConversations.id, conversationId),
      eq(ragConversations.userId, userId)
    ))
    .limit(1);
  
  if (conversations.length === 0) {
    throw new Error("Conversation not found");
  }
  
  const conversation = conversations[0];
  
  // Save user message
  await db.insert(ragMessages).values({
    conversationId,
    role: "user",
    content: userMessage
  });
  
  // Retrieve relevant context
  const searchResult = await semanticSearch(userId, userMessage, TOP_K_RESULTS, conversationId);
  
  // Build context from retrieved chunks
  const contextParts = searchResult.chunks.map((chunk, i) => 
    `[Source ${i + 1}: ${chunk.documentTitle}${chunk.sectionTitle ? ` - ${chunk.sectionTitle}` : ""}]\n${chunk.content}`
  );
  const context = contextParts.join("\n\n---\n\n");
  
  // Get conversation history (last 10 messages)
  const history = await db.select().from(ragMessages)
    .where(eq(ragMessages.conversationId, conversationId))
    .orderBy(desc(ragMessages.createdAt))
    .limit(10);
  
  const historyMessages = history.reverse().map((m) => ({
    role: m.role as "user" | "assistant" | "system",
    content: m.content
  }));
  
  // Build system prompt
  const systemPrompt = conversation.systemPrompt || `You are a helpful AI assistant for the Agents by Valentine RF platform. You help users understand the system's workflows, architecture, and features.

When answering questions:
1. Use the provided context to give accurate, specific answers
2. Cite sources by referencing [Source N] when using information from the context
3. If the context doesn't contain relevant information, say so clearly
4. Be concise but thorough
5. Use markdown formatting for code, lists, and emphasis

Available context from the knowledge base:
${context}`;

  // Generate response
  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      ...historyMessages.slice(0, -1), // Exclude the just-added user message from history
      { role: "user", content: userMessage }
    ]
  });
  
  const messageContent = response.choices[0].message.content;
  const assistantContent = typeof messageContent === 'string' ? messageContent : "I apologize, but I couldn't generate a response.";
  const promptTokens = response.usage?.prompt_tokens || 0;
  const completionTokens = response.usage?.completion_tokens || 0;
  
  // Save assistant message
  await db.insert(ragMessages).values({
    conversationId,
    role: "assistant",
    content: assistantContent,
    retrievedChunks: searchResult.chunks,
    promptTokens,
    completionTokens
  });
  
  // Update conversation stats
  await db.update(ragConversations)
    .set({
      messageCount: sql`${ragConversations.messageCount} + 2`,
      totalTokensUsed: sql`${ragConversations.totalTokensUsed} + ${promptTokens + completionTokens}`,
      updatedAt: new Date()
    })
    .where(eq(ragConversations.id, conversationId));
  
  // Auto-generate title if first message
  if (conversation.messageCount === 0) {
    const titleResponse = await invokeLLM({
      messages: [
        { role: "system", content: "Generate a short, descriptive title (max 50 chars) for this conversation based on the user's question. Output only the title, no quotes or punctuation." },
        { role: "user", content: userMessage }
      ]
    });
    
    const titleContent = titleResponse.choices[0].message.content;
    const title = (typeof titleContent === 'string' ? titleContent : "New Conversation").slice(0, 50);
    await db.update(ragConversations)
      .set({ title })
      .where(eq(ragConversations.id, conversationId));
  }
  
  return {
    content: assistantContent,
    retrievedChunks: searchResult.chunks,
    promptTokens,
    completionTokens
  };
}

/**
 * Provide feedback on a message
 */
export async function provideFeedback(
  messageId: number,
  visitorUserId: number,
  feedback: "positive" | "negative",
  comment?: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  // Get message
  const messages = await db.select().from(ragMessages)
    .where(eq(ragMessages.id, messageId))
    .limit(1);
  
  if (messages.length === 0) return false;
  
  const message = messages[0];
  
  // Verify ownership through conversation
  const convs = await db.select().from(ragConversations)
    .where(and(
      eq(ragConversations.id, message.conversationId),
      eq(ragConversations.userId, visitorUserId)
    ))
    .limit(1);
  
  if (convs.length === 0) return false;
  
  await db.update(ragMessages)
    .set({ feedback, feedbackComment: comment })
    .where(eq(ragMessages.id, messageId));
  
  return true;
}

// ============================================
// Pre-built Knowledge Base Ingestion
// ============================================

/**
 * Ingest system documentation into the RAG knowledge base
 */
export async function ingestSystemDocumentation(userId: number): Promise<{
  documentsIngested: number;
  totalChunks: number;
}> {
  const systemDocs = [
    {
      title: "RALPH Loop+ Workflow - Complete Guide",
      content: `# RALPH Loop+ Workflow Documentation

## Overview
RALPH Loop+ is the core autonomous coding workflow that powers the Agents by Valentine RF platform. It enables AI-driven software development with human oversight.

## Key Components

### Session Management
- Sessions track the state of autonomous coding tasks
- Each session has a unique ID, selected model, and agent profile
- Sessions can be in states: idle, running, paused, complete, or failed

### Iteration Execution
- Each iteration represents one cycle of AI code generation
- The loop spawns a CLI process (claude) with specific flags
- Progress is tracked through diff lines, tests run, and errors detected

### Circuit Breaker Pattern
The circuit breaker prevents infinite loops when the AI gets stuck:
- CLOSED: Normal operation, loop continues
- OPEN: Stuck detected, awaiting human intervention
- HALF_OPEN: Testing recovery after resume

### Completion Criteria
- Users define "done when" conditions as completion promises
- Each criterion can be checked off as the AI completes tasks
- Session completes when all criteria are met

## Configuration Options
- maxIterations: Maximum number of iterations (default: 50)
- noProgressThreshold: Iterations without progress before circuit opens (default: 3)
- autoAskHuman: Whether to pause for human input when stuck
- safetyMode: standard, strict, or permissive`,
      source: "system://ralph-loop",
      sourceType: "documentation" as const,
      tags: ["ralph", "workflow", "core", "sessions"]
    },
    {
      title: "Deep Research System",
      content: `# Deep Research System Documentation

## Overview
The Deep Research system provides AI-powered research capabilities with multi-step analysis and synthesis.

## Research Depths
- Quick: Fast overview, 2-3 sources
- Standard: Balanced depth, 5-7 sources
- Deep: Comprehensive analysis, 10+ sources

## Research Pipeline

### 1. Planning Phase
- LLM generates a research plan based on the topic
- Creates search queries and analysis strategy
- Stores planning steps for transparency

### 2. Research Phase
- Executes searches using generated queries
- LLM analyzes each source for relevance
- Extracts key findings and stores them

### 3. Synthesis Phase
- Compiles all findings into coherent summary
- Generates recommendations based on analysis
- Creates executive summary for quick review

## Output Options
- Markdown export with full formatting
- PDF with cover page and table of contents
- Public share links with unique tokens
- Follow-up Q&A for deeper exploration

## Templates
18 built-in templates covering:
- Technology research
- Market analysis
- Competitive intelligence
- Academic research
- And more...`,
      source: "system://deep-research",
      sourceType: "documentation" as const,
      tags: ["research", "ai", "analysis", "templates"]
    },
    {
      title: "System Architecture",
      content: `# System Architecture Documentation

## Three-Tier Architecture

### Client Layer (React SPA)
- React 19 with TypeScript
- TailwindCSS for styling
- React Query for server state
- Wouter for routing

Key Pages:
- Home: Landing page with feature overview
- Dashboard: Main control center
- Settings: Configuration and API keys
- Research: Deep Research interface
- Analytics: Usage metrics and insights

### Server Layer (Express + tRPC)
- Express.js HTTP server
- tRPC for type-safe API
- 15 routers with 80+ procedures
- WebSocket for real-time CLI streaming

Key Services:
- Authentication (OAuth)
- Session management
- Research orchestration
- Template management
- CLI process spawning

### Data Layer
- MySQL/TiDB database
- 18 tables with indexed queries
- S3 for file storage
- External API integrations

## Security
- AES-256 encryption for API keys
- JWT session tokens
- OAuth authentication
- Role-based access control`,
      source: "system://architecture",
      sourceType: "documentation" as const,
      tags: ["architecture", "technical", "infrastructure"]
    },
    {
      title: "API Keys and Security",
      content: `# API Keys and Security Documentation

## API Key Management
Users can store API keys for multiple AI providers:
- Codex (OpenAI)
- Claude (Anthropic)
- Gemini (Google)
- Manus (Internal)

## Encryption
- Keys are encrypted using AES-256-GCM
- Encryption key derived from environment secret
- Only encrypted values stored in database
- Key hints (last 4 chars) shown for identification

## Validation
- Keys are validated on save
- Periodic re-validation checks
- Invalid keys marked and user notified

## Best Practices
- Never expose raw API keys in logs
- Use environment variables for secrets
- Rotate keys periodically
- Monitor usage for anomalies`,
      source: "system://security",
      sourceType: "documentation" as const,
      tags: ["security", "api-keys", "encryption"]
    },
    {
      title: "Agent Profiles",
      content: `# Agent Profiles Documentation

## Available Profiles

### Patch Goblin
- Focus: Quick fixes and patches
- Best for: Bug fixes, small changes
- Style: Fast, targeted modifications

### Architect Owl
- Focus: System design and structure
- Best for: New features, refactoring
- Style: Thoughtful, comprehensive planning

### Test Gremlin
- Focus: Testing and quality
- Best for: Test coverage, validation
- Style: Thorough, edge-case focused

### Refactor Surgeon
- Focus: Code improvement
- Best for: Technical debt, optimization
- Style: Precise, surgical changes

## Profile Selection
- Choose based on task type
- Profiles affect AI behavior and prompts
- Can be changed between sessions`,
      source: "system://agent-profiles",
      sourceType: "documentation" as const,
      tags: ["agents", "profiles", "ai"]
    },
    {
      title: "Template Management System",
      content: `# Template Management Documentation

## Overview
The template system provides reusable configurations for research sessions and prompts.

## Template Types

### Built-in Templates
18 pre-configured templates covering:
- Technology Deep Dives
- Market Analysis
- Competitive Intelligence
- Academic Research
- Product Comparison
- Industry Trends

### Custom Templates
Users can create their own templates with:
- Custom name and description
- Topic configuration
- Category assignment
- Depth setting (quick/standard/deep)
- Tags for organization

## Categories
- Users can create custom categories
- Categories have colors and icons
- Templates can be organized by category

## Features
- Favorites: Mark frequently used templates
- Usage tracking: See most popular templates
- Import/Export: Share templates as JSON
- Public sharing: Make templates available to others`,
      source: "system://templates",
      sourceType: "documentation" as const,
      tags: ["templates", "research", "configuration"]
    },
    {
      title: "Database Schema Reference",
      content: `# Database Schema Documentation

## Core Tables

### users
- Stores user accounts from OAuth
- Fields: id, openId, name, email, role, timestamps

### sessions
- Tracks RALPH Loop sessions
- Fields: id, userId, name, status, model, profile, config

### session_iterations
- Records each iteration of a session
- Fields: id, sessionId, iteration, metrics, timestamps

### api_keys
- Encrypted API key storage
- Fields: id, userId, provider, encryptedKey, keyHint, isValid

## Research Tables

### research_sessions
- Deep Research session records
- Fields: id, userId, topic, depth, status, results

### research_steps
- Individual steps in research pipeline
- Fields: id, sessionId, stepType, content, status

### research_findings
- Extracted findings from sources
- Fields: id, sessionId, source, content, relevance

## Template Tables

### custom_templates
- User-created research templates
- Fields: id, userId, name, topic, category, depth

### user_categories
- Custom category definitions
- Fields: id, userId, name, color, icon

### template_favorites
- User's favorited templates
- Fields: id, userId, templateId, templateType`,
      source: "system://database",
      sourceType: "documentation" as const,
      tags: ["database", "schema", "technical"]
    },
    {
      title: "Frontend Components Guide",
      content: `# Frontend Components Documentation

## Core Components

### ModelWheel
Circular selector for AI models with smooth animations.
- Props: selectedModel, onSelectModel, disabled
- Models: codex, claude, gemini, manus

### FlightComputer
Real-time telemetry dashboard showing:
- Completion progress
- Circuit breaker state
- Current iteration
- Session metrics

### PowerPromptor
Dyslexia-friendly 4-field form:
- Goal (required)
- Context (optional)
- Done When (optional)
- Do Not (optional)

### CircuitBreakerViz
Visual state machine display:
- CLOSED: Green, normal operation
- OPEN: Red, stuck detected
- HALF_OPEN: Yellow, testing recovery

### AssemblyLine
Multi-agent pipeline visualization:
- Spec stage
- Implement stage
- Review stage
- Verify stage

### DiffViewer
Code diff display with:
- Hunk-level approval
- Syntax highlighting
- Expand/collapse files

## Layout Components

### DashboardLayout
Sidebar navigation with:
- Section navigation
- Quick links
- User profile
- Logout button`,
      source: "system://components",
      sourceType: "documentation" as const,
      tags: ["frontend", "components", "react"]
    },
    {
      title: "tRPC API Reference",
      content: `# tRPC API Documentation

## Router Structure

### auth
- me: Get current user
- logout: End session

### apiKeys
- save: Store encrypted API key
- list: Get user's keys (metadata only)
- delete: Remove an API key
- validate: Test key validity

### sessions
- create: Start new session
- list: Get user's sessions
- get: Get session details
- update: Modify session config
- delete: Remove session
- start/pause/stop: Control session

### research
- create: Start research session
- list: Get research history
- get: Get research details
- generatePlan: Create research plan
- executeStep: Run research step
- synthesize: Generate final report
- export: Create PDF/Markdown
- share: Generate public link

### templates
- create: New custom template
- list: Get user's templates
- update: Modify template
- delete: Remove template
- toggleFavorite: Mark as favorite
- import/export: Bulk operations

### rag
- ingestDocument: Add to knowledge base
- search: Semantic search
- chat: RAG-powered conversation
- createConversation: New chat thread`,
      source: "system://api",
      sourceType: "documentation" as const,
      tags: ["api", "trpc", "backend"]
    },
    {
      title: "Error Handling Patterns",
      content: `# Error Handling Documentation

## Frontend Error Handling

### React Error Boundary
- Catches rendering errors
- Shows fallback UI
- Logs errors for debugging

### tRPC Error Handling
- Typed error responses
- Automatic retry logic
- Toast notifications for user feedback

### Form Validation
- Zod schema validation
- Inline error messages
- Disabled submit on invalid

## Backend Error Handling

### tRPC Errors
- TRPCError with codes:
  - UNAUTHORIZED: Not logged in
  - FORBIDDEN: No permission
  - NOT_FOUND: Resource missing
  - BAD_REQUEST: Invalid input

### Database Errors
- Connection retry logic
- Transaction rollback
- Constraint violation handling

### External API Errors
- Timeout handling
- Rate limit detection
- Fallback responses

## Circuit Breaker Error Recovery
- Automatic stuck detection
- Human intervention prompt
- Graceful degradation
- Session state preservation`,
      source: "system://errors",
      sourceType: "documentation" as const,
      tags: ["errors", "debugging", "reliability"]
    },
    {
      title: "Analytics and Metrics",
      content: `# Analytics Documentation

## Session Metrics

### Per-Iteration Metrics
- testsRun: Number of tests executed
- testsPassed: Successful tests
- errors: Detected errors
- diffLines: Lines of code changed
- duration: Iteration time in ms

### Session Aggregates
- totalIterations: Loop count
- successRate: Tests passed / run
- avgIterationTime: Mean duration
- totalDiffLines: Code changes

## Research Metrics

### Per-Session
- sourcesAnalyzed: URLs processed
- findingsExtracted: Key insights
- synthesisQuality: AI confidence
- completionTime: Total duration

### User Analytics
- sessionsCreated: Total sessions
- researchCompleted: Finished research
- templatesUsed: Template usage
- avgSessionDuration: Time spent

## Dashboard Displays

### Live Monitor
- Real-time iteration metrics
- File change tracking
- Progress visualization

### Analytics Page
- Historical trends
- Usage patterns
- Performance insights`,
      source: "system://analytics",
      sourceType: "documentation" as const,
      tags: ["analytics", "metrics", "monitoring"]
    }
  ];
  
  let totalChunks = 0;
  
  for (const doc of systemDocs) {
    const result = await ingestDocument(
      userId,
      doc.title,
      doc.content,
      doc.source,
      doc.sourceType,
      doc.tags
    );
    totalChunks += result.chunkCount;
  }
  
  return {
    documentsIngested: systemDocs.length,
    totalChunks
  };
}

// ============================================
// Helper Functions for Streaming
// ============================================

/**
 * Save a message to a conversation
 */
export async function saveMessage(
  conversationId: number,
  role: "user" | "assistant",
  content: string,
  metadata?: { retrievedChunks?: number[] }
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(ragMessages).values({
    conversationId,
    role,
    content,
    // retrievedChunks is handled separately if needed
  });
  
  // Update conversation timestamp
  await db.update(ragConversations)
    .set({ updatedAt: new Date() })
    .where(eq(ragConversations.id, conversationId));
  
  return Number(result[0].insertId);
}

/**
 * Log a search query for analytics
 */
export async function logSearch(
  userId: number,
  query: string,
  resultsCount: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.insert(ragSearchHistory).values({
    userId,
    query,
    resultCount: resultsCount,
  });
}

// ============================================
// Conversation Search
// ============================================

/**
 * Search conversations and messages
 */
export async function searchConversations(
  userId: number,
  query: string,
  limit: number = 20
): Promise<{
  conversations: Array<{
    id: number;
    title: string | null;
    matchedMessages: Array<{
      id: number;
      role: string;
      content: string;
      createdAt: Date;
    }>;
    updatedAt: Date;
  }>;
  totalMatches: number;
}> {
  const db = await getDb();
  if (!db) {
    return { conversations: [], totalMatches: 0 };
  }
  
  // Search messages containing the query
  const searchPattern = `%${query}%`;
  
  const matchedMessages = await db.select({
    messageId: ragMessages.id,
    conversationId: ragMessages.conversationId,
    role: ragMessages.role,
    content: ragMessages.content,
    messageCreatedAt: ragMessages.createdAt,
    convTitle: ragConversations.title,
    convUpdatedAt: ragConversations.updatedAt,
  })
    .from(ragMessages)
    .innerJoin(ragConversations, eq(ragMessages.conversationId, ragConversations.id))
    .where(and(
      eq(ragConversations.userId, userId),
      eq(ragConversations.isArchived, false),
      sql`${ragMessages.content} LIKE ${searchPattern}`
    ))
    .orderBy(desc(ragMessages.createdAt))
    .limit(limit * 3); // Get more messages to group by conversation
  
  // Group by conversation
  const conversationMap = new Map<number, {
    id: number;
    title: string | null;
    matchedMessages: Array<{
      id: number;
      role: string;
      content: string;
      createdAt: Date;
    }>;
    updatedAt: Date;
  }>();
  
  for (const msg of matchedMessages) {
    if (!conversationMap.has(msg.conversationId)) {
      conversationMap.set(msg.conversationId, {
        id: msg.conversationId,
        title: msg.convTitle,
        matchedMessages: [],
        updatedAt: msg.convUpdatedAt,
      });
    }
    
    const conv = conversationMap.get(msg.conversationId)!;
    if (conv.matchedMessages.length < 3) { // Limit messages per conversation
      conv.matchedMessages.push({
        id: msg.messageId,
        role: msg.role,
        content: msg.content.length > 200 ? msg.content.slice(0, 200) + "..." : msg.content,
        createdAt: msg.messageCreatedAt,
      });
    }
  }
  
  const conversations = Array.from(conversationMap.values())
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, limit);
  
  return {
    conversations,
    totalMatches: matchedMessages.length,
  };
}
