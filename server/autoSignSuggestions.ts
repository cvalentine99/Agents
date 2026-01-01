/**
 * Auto-Sign Suggestions Service
 * 
 * Automatically detects repeated failure patterns and suggests
 * specific signs to add to PROMPT.md to tune the AI's behavior.
 * 
 * Based on the Ralph Loop principle: "Each time Ralph does something bad,
 * Ralph gets tuned - like a guitar."
 */

import { invokeLLM } from "./_core/llm";

// Extended failure patterns with more specific detection
export const FAILURE_PATTERNS = {
  // Test failures
  test_assertion: {
    patterns: ["expect(", "toEqual", "toBe", "assertion failed", "expected", "received"],
    signs: [
      "ALWAYS verify the expected behavior before writing assertions",
      "When assertions fail, check if the test expectation is correct first",
      "Use descriptive test names that explain what should happen",
    ],
    severity: "high",
  },
  test_timeout: {
    patterns: ["timeout", "exceeded", "async", "did not complete"],
    signs: [
      "Add proper async/await handling for asynchronous tests",
      "Increase timeout for slow operations or mock them",
      "Check for unresolved promises or missing done() callbacks",
    ],
    severity: "medium",
  },
  test_setup_failure: {
    patterns: ["beforeeach", "beforeall", "setup", "initialization failed"],
    signs: [
      "Verify test setup completes before running tests",
      "Check database connections and mock configurations",
      "Ensure test fixtures are properly initialized",
    ],
    severity: "high",
  },

  // TypeScript errors
  ts_type_mismatch: {
    patterns: ["type '", "is not assignable to", "argument of type"],
    signs: [
      "Check the expected type signature before passing arguments",
      "Use type guards or assertions when narrowing types",
      "Verify imported types match their source definitions",
    ],
    severity: "high",
  },
  ts_missing_property: {
    patterns: ["property '", "does not exist on type", "missing in type"],
    signs: [
      "Verify object shape matches the expected interface",
      "Check if the property was renamed or removed",
      "Use optional chaining (?.) for potentially undefined properties",
    ],
    severity: "medium",
  },
  ts_import_error: {
    patterns: ["cannot find module", "has no exported member", "module not found"],
    signs: [
      "Check the import path is correct and file exists",
      "Verify the export name matches exactly (case-sensitive)",
      "Run 'pnpm install' if a dependency is missing",
    ],
    severity: "high",
  },

  // Build errors
  build_syntax: {
    patterns: ["syntaxerror", "unexpected token", "parsing error"],
    signs: [
      "Check for missing brackets, quotes, or semicolons",
      "Validate JSON/YAML files with a linter",
      "Look for unclosed template literals or JSX tags",
    ],
    severity: "high",
  },
  build_dependency: {
    patterns: ["peer dependency", "version mismatch", "could not resolve"],
    signs: [
      "Check package.json for version conflicts",
      "Run 'pnpm install' to update dependencies",
      "Use 'pnpm why <package>' to debug dependency issues",
    ],
    severity: "medium",
  },

  // Runtime errors
  null_undefined: {
    patterns: ["cannot read property", "undefined is not", "null is not", "typeerror"],
    signs: [
      "Add null checks before accessing object properties",
      "Use optional chaining (?.) and nullish coalescing (??)",
      "Verify data is loaded before rendering components",
    ],
    severity: "high",
  },
  network_error: {
    patterns: ["fetch failed", "network error", "econnrefused", "timeout"],
    signs: [
      "Check if the API server is running",
      "Verify the URL and port are correct",
      "Add error handling for network requests",
    ],
    severity: "medium",
  },
  database_error: {
    patterns: ["database", "sql", "query failed", "connection refused", "deadlock"],
    signs: [
      "Check database connection string and credentials",
      "Verify the table/column names match the schema",
      "Add proper error handling for database operations",
    ],
    severity: "high",
  },

  // Loop-specific patterns
  same_error_repeated: {
    patterns: [], // Detected by tracking, not pattern matching
    signs: [
      "STOP - This error has occurred multiple times. Try a completely different approach.",
      "Read the FULL error message and stack trace before attempting another fix",
      "Consider if the root cause is elsewhere in the code",
    ],
    severity: "critical",
  },
  infinite_changes: {
    patterns: [], // Detected by tracking file changes
    signs: [
      "STOP modifying the same file repeatedly without progress",
      "Verify the change actually addresses the error",
      "Consider if a different file needs to be modified",
    ],
    severity: "critical",
  },
  regression: {
    patterns: [], // Detected by tracking test results
    signs: [
      "A previously passing test is now failing - revert the last change",
      "Check if the fix broke existing functionality",
      "Run the full test suite before considering a change complete",
    ],
    severity: "critical",
  },
};

// Track failure history per session
interface FailureRecord {
  timestamp: number;
  errorOutput: string;
  pattern: string;
  iteration: number;
}

interface SessionFailureHistory {
  failures: FailureRecord[];
  lastSuggestionTime: number;
  dismissedPatterns: Set<string>;
  consecutiveFailures: number;
}

const sessionFailures = new Map<number, SessionFailureHistory>();

/**
 * Record a failure for a session
 */
export function recordFailure(
  sessionId: number,
  errorOutput: string,
  iteration: number
): void {
  if (!sessionFailures.has(sessionId)) {
    sessionFailures.set(sessionId, {
      failures: [],
      lastSuggestionTime: 0,
      dismissedPatterns: new Set(),
      consecutiveFailures: 0,
    });
  }

  const history = sessionFailures.get(sessionId)!;
  const pattern = detectDetailedPattern(errorOutput);

  history.failures.push({
    timestamp: Date.now(),
    errorOutput,
    pattern,
    iteration,
  });

  // Keep only last 50 failures
  if (history.failures.length > 50) {
    history.failures = history.failures.slice(-50);
  }

  history.consecutiveFailures++;
}

/**
 * Record a success (resets consecutive failure count)
 */
export function recordSuccess(sessionId: number): void {
  const history = sessionFailures.get(sessionId);
  if (history) {
    history.consecutiveFailures = 0;
  }
}

/**
 * Detect detailed failure pattern from error output
 */
export function detectDetailedPattern(errorOutput: string): string {
  const lowerError = errorOutput.toLowerCase();

  for (const [patternName, config] of Object.entries(FAILURE_PATTERNS)) {
    if (config.patterns.length === 0) continue; // Skip tracking-based patterns

    for (const pattern of config.patterns) {
      if (lowerError.includes(pattern.toLowerCase())) {
        return patternName;
      }
    }
  }

  return "unknown";
}

/**
 * Check if the same error is repeating
 */
export function isRepeatedError(sessionId: number): boolean {
  const history = sessionFailures.get(sessionId);
  if (!history || history.failures.length < 2) return false;

  const recent = history.failures.slice(-3);
  if (recent.length < 2) return false;

  // Check if the last 2-3 failures have the same pattern
  const patterns = recent.map((f) => f.pattern);
  return patterns.every((p) => p === patterns[0]);
}

/**
 * Get the number of consecutive failures
 */
export function getConsecutiveFailures(sessionId: number): number {
  return sessionFailures.get(sessionId)?.consecutiveFailures || 0;
}

/**
 * Get auto-suggested signs based on failure history
 */
export interface SignSuggestion {
  sign: string;
  pattern: string;
  confidence: number; // 0-100
  reason: string;
  severity: "low" | "medium" | "high" | "critical";
}

export function getAutoSuggestions(sessionId: number): SignSuggestion[] {
  const history = sessionFailures.get(sessionId);
  if (!history || history.failures.length === 0) return [];

  const suggestions: SignSuggestion[] = [];
  const recentFailures = history.failures.slice(-5);

  // Count pattern occurrences
  const patternCounts = new Map<string, number>();
  for (const failure of recentFailures) {
    patternCounts.set(failure.pattern, (patternCounts.get(failure.pattern) || 0) + 1);
  }

  // Check for repeated errors (highest priority)
  if (isRepeatedError(sessionId)) {
    const config = FAILURE_PATTERNS.same_error_repeated;
    for (const sign of config.signs) {
      if (!history.dismissedPatterns.has(`same_error_repeated:${sign}`)) {
        suggestions.push({
          sign,
          pattern: "same_error_repeated",
          confidence: 95,
          reason: `The same error has occurred ${history.consecutiveFailures} times in a row`,
          severity: "critical",
        });
      }
    }
  }

  // Add suggestions for detected patterns
  patternCounts.forEach((count, pattern) => {
    if (pattern === "unknown") return;

    const config = FAILURE_PATTERNS[pattern as keyof typeof FAILURE_PATTERNS];
    if (!config) return;

    const confidence = Math.min(50 + count * 15, 90);

    for (const sign of config.signs) {
      const key = `${pattern}:${sign}`;
      if (!history.dismissedPatterns.has(key)) {
        suggestions.push({
          sign,
          pattern,
          confidence,
          reason: `Detected ${count} ${pattern.replace(/_/g, " ")} error(s) in recent iterations`,
          severity: config.severity as "low" | "medium" | "high" | "critical",
        });
      }
    }
  });

  // Sort by confidence and severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  suggestions.sort((a, b) => {
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return b.confidence - a.confidence;
  });

  // Return top 5 suggestions
  return suggestions.slice(0, 5);
}

/**
 * Dismiss a suggestion so it won't be shown again
 */
export function dismissSuggestion(sessionId: number, pattern: string, sign: string): void {
  const history = sessionFailures.get(sessionId);
  if (history) {
    history.dismissedPatterns.add(`${pattern}:${sign}`);
  }
}

/**
 * Generate a custom sign using LLM based on the error
 */
export async function generateCustomSign(errorOutput: string): Promise<string | null> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are an expert at analyzing code errors and creating guidance rules.
Given an error message, generate a single, specific "sign" (guidance rule) that would help prevent this error in the future.

The sign should:
- Be actionable and specific
- Start with a verb (ALWAYS, NEVER, CHECK, VERIFY, etc.)
- Be concise (one sentence)
- Address the root cause, not just the symptom

Respond with ONLY the sign text, nothing else.`,
        },
        {
          role: "user",
          content: `Error:\n${errorOutput.slice(0, 1000)}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (content && typeof content === 'string' && content.length > 10 && content.length < 200) {
      return content.trim();
    }
    return null;
  } catch (error) {
    console.error("Failed to generate custom sign:", error);
    return null;
  }
}

/**
 * Get failure statistics for a session
 */
export function getFailureStats(sessionId: number): {
  totalFailures: number;
  consecutiveFailures: number;
  topPatterns: { pattern: string; count: number }[];
  lastFailure: FailureRecord | null;
} {
  const history = sessionFailures.get(sessionId);
  if (!history) {
    return {
      totalFailures: 0,
      consecutiveFailures: 0,
      topPatterns: [],
      lastFailure: null,
    };
  }

  const patternCounts = new Map<string, number>();
  for (const failure of history.failures) {
    patternCounts.set(failure.pattern, (patternCounts.get(failure.pattern) || 0) + 1);
  }

  const topPatterns: { pattern: string; count: number }[] = [];
  patternCounts.forEach((count, pattern) => {
    topPatterns.push({ pattern, count });
  });
  topPatterns.sort((a, b) => b.count - a.count);
  const topPatternsSliced = topPatterns.slice(0, 5);

  return {
    totalFailures: history.failures.length,
    consecutiveFailures: history.consecutiveFailures,
    topPatterns: topPatternsSliced,
    lastFailure: history.failures[history.failures.length - 1] || null,
  };
}

/**
 * Clear failure history for a session
 */
export function clearFailureHistory(sessionId: number): void {
  sessionFailures.delete(sessionId);
}
