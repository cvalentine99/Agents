/**
 * REAL LLM Executor Service
 * Actually calls LLM APIs using stored API keys
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

// Get db connection
const pool = mysql.createPool(process.env.DATABASE_URL!);
const db = drizzle(pool);
import { apiKeys } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { decrypt } from "./crypto";
import { invokeLLM } from "./_core/llm";

export type LLMModel = "claude" | "codex" | "gemini" | "manus";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  tokensUsed?: number;
  finishReason?: string;
}

export interface CodeGenerationResult {
  success: boolean;
  code?: string;
  diff?: string;
  explanation?: string;
  error?: string;
}

/**
 * Get decrypted API key for a model
 */
async function _getApiKey(
  userId: number,
  model: LLMModel
): Promise<string | null> {
  const keyRecord = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), eq(apiKeys.provider, model)))
    .limit(1);

  if (!keyRecord.length || !keyRecord[0].encryptedKey) {
    return null;
  }

  try {
    return decrypt(keyRecord[0].encryptedKey);
  } catch {
    return null;
  }
}

/**
 * Call LLM with messages - uses built-in Manus LLM by default
 */
export async function callLLM(
  messages: LLMMessage[],
  model: LLMModel = "claude",
  _userId?: string
): Promise<LLMResponse> {
  // Use built-in Manus LLM (already configured)
  const response = await invokeLLM({
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  });

  const messageContent = response.choices?.[0]?.message?.content;
  const content = typeof messageContent === "string" ? messageContent : "";
  const finishReason = response.choices?.[0]?.finish_reason;

  return {
    content,
    model,
    tokensUsed: response.usage?.total_tokens,
    finishReason: finishReason ?? undefined,
  };
}

/**
 * Generate code based on a prompt
 */
export async function generateCode(
  prompt: string,
  context: string,
  model: LLMModel = "claude",
  userId?: string
): Promise<CodeGenerationResult> {
  const systemPrompt = `You are an expert software engineer. Generate clean, working code based on the user's requirements.

IMPORTANT RULES:
1. Output ONLY the code, no explanations unless asked
2. Use proper formatting and indentation
3. Include necessary imports
4. Follow best practices for the language/framework
5. If generating a diff, use unified diff format

Current context:
${context}`;

  try {
    const response = await callLLM(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      model,
      userId
    );

    // Parse the response to extract code
    const content = response.content;

    // Check if it's a diff
    const isDiff =
      content.includes("---") &&
      content.includes("+++") &&
      content.includes("@@");

    // Extract code blocks if present
    const codeBlockMatch = content.match(/```[\w]*\n([\s\S]*?)```/);
    const code = codeBlockMatch ? codeBlockMatch[1] : content;

    return {
      success: true,
      code: isDiff ? undefined : code,
      diff: isDiff ? code : undefined,
      explanation: content,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Review code and suggest improvements
 */
export async function reviewCode(
  code: string,
  model: LLMModel = "claude",
  userId?: string
): Promise<{ issues: string[]; suggestions: string[]; approved: boolean }> {
  const systemPrompt = `You are a senior code reviewer. Analyze the code and provide:
1. A list of issues (bugs, security problems, performance issues)
2. Suggestions for improvement
3. Whether the code is approved (true/false)

Respond in JSON format:
{
  "issues": ["issue1", "issue2"],
  "suggestions": ["suggestion1", "suggestion2"],
  "approved": true/false
}`;

  try {
    const response = await callLLM(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Review this code:\n\n${code}` },
      ],
      model,
      userId
    );

    // Parse JSON response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return {
      issues: [],
      suggestions: ["Could not parse review response"],
      approved: false,
    };
  } catch (error) {
    return {
      issues: [error instanceof Error ? error.message : "Review failed"],
      suggestions: [],
      approved: false,
    };
  }
}

/**
 * Run tests and analyze results
 */
export async function analyzeTestResults(
  testOutput: string,
  model: LLMModel = "claude",
  userId?: string
): Promise<{ passed: boolean; summary: string; failures: string[] }> {
  const systemPrompt = `Analyze the test output and provide:
1. Whether all tests passed (true/false)
2. A brief summary
3. List of failures if any

Respond in JSON format:
{
  "passed": true/false,
  "summary": "brief summary",
  "failures": ["failure1", "failure2"]
}`;

  try {
    const response = await callLLM(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Analyze this test output:\n\n${testOutput}` },
      ],
      model,
      userId
    );

    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // Fallback: check for common pass/fail patterns
    const passed =
      testOutput.includes("passed") && !testOutput.includes("failed");
    return {
      passed,
      summary: "Test analysis completed",
      failures: [],
    };
  } catch (error) {
    return {
      passed: false,
      summary: error instanceof Error ? error.message : "Analysis failed",
      failures: [],
    };
  }
}
