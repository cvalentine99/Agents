/**
 * PROMPT.md Service
 * 
 * This implements the core Ralph Loop technique - storing and managing
 * the PROMPT.md file that guides the AI through iterations.
 * 
 * Key concepts from Geoffrey Huntley:
 * - "Ralph is a technique. In its purest form, Ralph is a Bash loop."
 * - "Each time Ralph does something bad, Ralph gets tuned - like a guitar."
 * - The PROMPT.md contains all the "signs" that guide the AI
 */

import { getDb } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import { projectPrompts, promptSigns } from "../drizzle/schema";

// Default PROMPT.md template based on Ralph Loop best practices
export const DEFAULT_PROMPT_TEMPLATE = `# PROMPT.md - Ralph Loop Configuration

## Goal
[Describe what you want to build or accomplish]

## Context
[Provide relevant background information, tech stack, constraints]

## Signs (Guidance Rules)
<!-- Add "signs" here when failures occur - these guide the AI -->
<!-- Example: "ALWAYS run tests before committing" -->
<!-- Example: "NEVER modify files outside the src/ directory" -->

- Follow existing code patterns and conventions
- Write tests for new functionality
- Keep changes focused and atomic

## Done When
- All tests pass
- No TypeScript errors
- Build succeeds
- [Add your specific completion criteria]

## Do Not
- Break existing functionality
- Skip tests
- Introduce security vulnerabilities
- [Add your specific constraints]

---
*This file is read by the RALPH Loop before each iteration.*
*Add "signs" when you notice repeated failures to tune the AI's behavior.*
`;

// Suggested signs for common failure patterns
export const FAILURE_SIGNS: Record<string, string[]> = {
  "test_failure": [
    "ALWAYS run the full test suite before considering a change complete",
    "When tests fail, read the error message carefully and fix the root cause",
    "Do not modify test assertions to make tests pass - fix the actual code",
  ],
  "typescript_error": [
    "Check TypeScript errors with 'pnpm tsc --noEmit' before proceeding",
    "Use proper type annotations - avoid 'any' type",
    "Import types from their source files, not from index files",
  ],
  "build_failure": [
    "Run 'pnpm build' to verify the build succeeds before completing",
    "Check for missing dependencies and add them with 'pnpm add'",
    "Ensure all imports resolve correctly",
  ],
  "same_error_repeated": [
    "STOP and analyze why the same error keeps occurring",
    "Try a different approach instead of repeating the same fix",
    "Read the full error stack trace, not just the first line",
  ],
  "infinite_loop": [
    "Set a clear exit condition for loops",
    "Add logging to track iteration progress",
    "Break down the task into smaller, verifiable steps",
  ],
  "file_not_found": [
    "Verify file paths are correct before reading/writing",
    "Use absolute paths or paths relative to project root",
    "Check if the file exists before attempting to modify it",
  ],
  "permission_denied": [
    "Check file permissions before writing",
    "Do not attempt to modify system files",
    "Stay within the project directory",
  ],
  "syntax_error": [
    "Validate JSON/YAML syntax before saving",
    "Check for missing brackets, quotes, or semicolons",
    "Use a linter to catch syntax issues early",
  ],
};

export interface ProjectPrompt {
  id: number;
  userId: number;
  projectPath: string;
  content: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromptSign {
  id: number;
  promptId: number;
  signText: string;
  failurePattern: string | null;
  addedAt: Date;
}

/**
 * Get the current PROMPT.md for a project
 */
export async function getPrompt(userId: number, projectPath: string): Promise<ProjectPrompt | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(projectPrompts)
    .where(and(
      eq(projectPrompts.userId, userId),
      eq(projectPrompts.projectPath, projectPath)
    ))
    .orderBy(desc(projectPrompts.version))
    .limit(1);
  
  if (result.length === 0) return null;
  
  const row = result[0];
  return {
    id: row.id,
    userId: row.userId,
    projectPath: row.projectPath,
    content: row.content,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Get all versions of PROMPT.md for a project (history)
 */
export async function getPromptHistory(userId: number, projectPath: string): Promise<ProjectPrompt[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select().from(projectPrompts)
    .where(and(
      eq(projectPrompts.userId, userId),
      eq(projectPrompts.projectPath, projectPath)
    ))
    .orderBy(desc(projectPrompts.version))
    .limit(50);
  
  return result.map(row => ({
    id: row.id,
    userId: row.userId,
    projectPath: row.projectPath,
    content: row.content,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

/**
 * Save/update PROMPT.md for a project (creates new version)
 */
export async function savePrompt(userId: number, projectPath: string, content: string): Promise<ProjectPrompt> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  // Get current version
  const current = await getPrompt(userId, projectPath);
  const newVersion = current ? current.version + 1 : 1;
  
  // Insert new version
  await db.insert(projectPrompts).values({
    userId,
    projectPath,
    content,
    version: newVersion,
  });
  
  // Return the new prompt
  const result = await getPrompt(userId, projectPath);
  return result!;
}

/**
 * Initialize PROMPT.md with default template if it doesn't exist
 */
export async function initializePrompt(userId: number, projectPath: string): Promise<ProjectPrompt> {
  const existing = await getPrompt(userId, projectPath);
  if (existing) return existing;
  
  return savePrompt(userId, projectPath, DEFAULT_PROMPT_TEMPLATE);
}

/**
 * Add a "sign" to the PROMPT.md based on a failure pattern
 */
export async function addSign(
  userId: number, 
  projectPath: string, 
  signText: string, 
  failurePattern?: string
): Promise<ProjectPrompt> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  // Get current prompt
  let current = await getPrompt(userId, projectPath);
  if (!current) {
    current = await initializePrompt(userId, projectPath);
  }
  
  // Find the "Signs" section and add the new sign
  let content = current.content;
  const signsMarker = "## Signs (Guidance Rules)";
  const signsIndex = content.indexOf(signsMarker);
  
  if (signsIndex !== -1) {
    // Find the end of the signs section (next ## or end of file)
    const afterSigns = content.substring(signsIndex + signsMarker.length);
    const nextSectionMatch = afterSigns.match(/\n## /);
    const insertPosition = nextSectionMatch 
      ? signsIndex + signsMarker.length + nextSectionMatch.index!
      : content.length;
    
    // Insert the new sign before the next section
    const newSign = `\n- ${signText}`;
    content = content.substring(0, insertPosition) + newSign + content.substring(insertPosition);
  } else {
    // No signs section found, add one
    content += `\n\n${signsMarker}\n- ${signText}\n`;
  }
  
  // Save the updated prompt
  const updated = await savePrompt(userId, projectPath, content);
  
  // Also record the sign in the prompt_signs table for analytics
  await db.insert(promptSigns).values({
    promptId: updated.id,
    signText,
    failurePattern: failurePattern || null,
  });
  
  return updated;
}

/**
 * Get suggested signs based on a failure pattern
 */
export function getSuggestedSigns(failurePattern: string): string[] {
  // Check for exact match
  if (FAILURE_SIGNS[failurePattern]) {
    return FAILURE_SIGNS[failurePattern];
  }
  
  // Check for partial matches
  const suggestions: string[] = [];
  for (const [pattern, signs] of Object.entries(FAILURE_SIGNS)) {
    if (failurePattern.toLowerCase().includes(pattern.toLowerCase()) ||
        pattern.toLowerCase().includes(failurePattern.toLowerCase())) {
      suggestions.push(...signs);
    }
  }
  
  // Default suggestions if no match
  if (suggestions.length === 0) {
    return [
      "Analyze the error carefully before attempting a fix",
      "Try a different approach if the current one isn't working",
      "Break down the problem into smaller steps",
    ];
  }
  
  return Array.from(new Set(suggestions)); // Remove duplicates
}

/**
 * Get all signs added to a prompt
 */
export async function getPromptSigns(promptId: number): Promise<PromptSign[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select().from(promptSigns)
    .where(eq(promptSigns.promptId, promptId))
    .orderBy(desc(promptSigns.addedAt));
  
  return result.map(row => ({
    id: row.id,
    promptId: row.promptId,
    signText: row.signText,
    failurePattern: row.failurePattern,
    addedAt: row.addedAt,
  }));
}

/**
 * Detect failure pattern from error output
 */
export function detectFailurePattern(errorOutput: string): string {
  const lowerError = errorOutput.toLowerCase();
  
  if (lowerError.includes("test") && (lowerError.includes("fail") || lowerError.includes("error"))) {
    return "test_failure";
  }
  if (lowerError.includes("typescript") || lowerError.includes("ts(") || lowerError.includes("type error")) {
    return "typescript_error";
  }
  if (lowerError.includes("build") && lowerError.includes("fail")) {
    return "build_failure";
  }
  if (lowerError.includes("enoent") || lowerError.includes("no such file")) {
    return "file_not_found";
  }
  if (lowerError.includes("permission denied") || lowerError.includes("eacces")) {
    return "permission_denied";
  }
  if (lowerError.includes("syntaxerror") || lowerError.includes("unexpected token")) {
    return "syntax_error";
  }
  
  return "unknown";
}

/**
 * Format PROMPT.md content for LLM consumption
 * This is what gets piped to the LLM at each iteration
 */
export function formatPromptForLLM(prompt: ProjectPrompt, iterationNumber: number, lastError?: string): string {
  let formatted = prompt.content;
  
  // Add iteration context
  formatted = `<!-- RALPH Loop Iteration ${iterationNumber} -->\n\n${formatted}`;
  
  // Add last error context if available
  if (lastError) {
    formatted += `\n\n## Last Error (Iteration ${iterationNumber - 1})\n\`\`\`\n${lastError}\n\`\`\`\n`;
    formatted += `\n**Important:** Address this error before proceeding. If you've seen this error before, try a different approach.\n`;
  }
  
  return formatted;
}

/**
 * List all projects with PROMPT.md for a user
 */
export async function listUserProjects(userId: number): Promise<{ projectPath: string; version: number; updatedAt: Date }[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Get the latest version for each project
  const result = await db.select({
    projectPath: projectPrompts.projectPath,
    version: sql<number>`MAX(${projectPrompts.version})`.as('version'),
    updatedAt: sql<Date>`MAX(${projectPrompts.updatedAt})`.as('updatedAt'),
  })
    .from(projectPrompts)
    .where(eq(projectPrompts.userId, userId))
    .groupBy(projectPrompts.projectPath)
    .orderBy(desc(sql`MAX(${projectPrompts.updatedAt})`));
  
  return result.map(row => ({
    projectPath: row.projectPath,
    version: row.version,
    updatedAt: row.updatedAt,
  }));
}
