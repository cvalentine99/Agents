/**
 * Auto-Sign Suggestions Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  recordFailure,
  recordSuccess,
  getAutoSuggestions,
  dismissSuggestion,
  getFailureStats,
  clearFailureHistory,
  isRepeatedError,
  getConsecutiveFailures,
  detectDetailedPattern,
  FAILURE_PATTERNS,
} from "./autoSignSuggestions";

describe("Auto-Sign Suggestions", () => {
  const testSessionId = 99999;

  beforeEach(() => {
    // Clear any existing history before each test
    clearFailureHistory(testSessionId);
  });

  describe("recordFailure", () => {
    it("should record a failure for a session", () => {
      recordFailure(testSessionId, "TypeError: Cannot read property 'foo' of undefined", 1);
      
      const stats = getFailureStats(testSessionId);
      expect(stats.totalFailures).toBe(1);
      expect(stats.consecutiveFailures).toBe(1);
    });

    it("should increment consecutive failures", () => {
      recordFailure(testSessionId, "Error 1", 1);
      recordFailure(testSessionId, "Error 2", 2);
      recordFailure(testSessionId, "Error 3", 3);
      
      const stats = getFailureStats(testSessionId);
      expect(stats.consecutiveFailures).toBe(3);
    });

    it("should keep only last 50 failures", () => {
      for (let i = 0; i < 60; i++) {
        recordFailure(testSessionId, `Error ${i}`, i);
      }
      
      const stats = getFailureStats(testSessionId);
      expect(stats.totalFailures).toBe(50);
    });
  });

  describe("recordSuccess", () => {
    it("should reset consecutive failures on success", () => {
      recordFailure(testSessionId, "Error 1", 1);
      recordFailure(testSessionId, "Error 2", 2);
      expect(getConsecutiveFailures(testSessionId)).toBe(2);
      
      recordSuccess(testSessionId);
      expect(getConsecutiveFailures(testSessionId)).toBe(0);
    });
  });

  describe("detectDetailedPattern", () => {
    it("should detect TypeScript type mismatch errors", () => {
      const error = "Type 'string' is not assignable to type 'number'";
      expect(detectDetailedPattern(error)).toBe("ts_type_mismatch");
    });

    it("should detect null/undefined errors", () => {
      const error = "TypeError: undefined is not a function";
      expect(detectDetailedPattern(error)).toBe("null_undefined");
    });

    it("should detect test assertion failures", () => {
      const error = "expect(received).toEqual(expected)";
      expect(detectDetailedPattern(error)).toBe("test_assertion");
    });

    it("should detect import errors", () => {
      const error = "Cannot find module './missing'";
      expect(detectDetailedPattern(error)).toBe("ts_import_error");
    });

    it("should detect database errors", () => {
      const error = "Database connection refused";
      expect(detectDetailedPattern(error)).toBe("database_error");
    });

    it("should return unknown for unrecognized patterns", () => {
      const error = "Some random error message";
      expect(detectDetailedPattern(error)).toBe("unknown");
    });
  });

  describe("isRepeatedError", () => {
    it("should return false with no failures", () => {
      expect(isRepeatedError(testSessionId)).toBe(false);
    });

    it("should return false with only one failure", () => {
      recordFailure(testSessionId, "TypeError: Cannot read property", 1);
      expect(isRepeatedError(testSessionId)).toBe(false);
    });

    it("should return true when same pattern repeats", () => {
      recordFailure(testSessionId, "TypeError: Cannot read property 'a' of undefined", 1);
      recordFailure(testSessionId, "TypeError: Cannot read property 'b' of undefined", 2);
      recordFailure(testSessionId, "TypeError: Cannot read property 'c' of undefined", 3);
      
      expect(isRepeatedError(testSessionId)).toBe(true);
    });

    it("should return false when patterns differ", () => {
      recordFailure(testSessionId, "TypeError: Cannot read property", 1);
      recordFailure(testSessionId, "Type 'string' is not assignable to type 'number'", 2);
      
      expect(isRepeatedError(testSessionId)).toBe(false);
    });
  });

  describe("getAutoSuggestions", () => {
    it("should return empty array with no failures", () => {
      const suggestions = getAutoSuggestions(testSessionId);
      expect(suggestions).toEqual([]);
    });

    it("should return suggestions based on failure patterns", () => {
      recordFailure(testSessionId, "TypeError: undefined is not a function", 1);
      recordFailure(testSessionId, "TypeError: null is not an object", 2);
      
      const suggestions = getAutoSuggestions(testSessionId);
      expect(suggestions.length).toBeGreaterThan(0);
      // First suggestion should be critical (same_error_repeated) or pattern-based
      expect(["null_undefined", "same_error_repeated"]).toContain(suggestions[0].pattern);
    });

    it("should include critical suggestions for repeated errors", () => {
      recordFailure(testSessionId, "Same error", 1);
      recordFailure(testSessionId, "Same error", 2);
      recordFailure(testSessionId, "Same error", 3);
      
      const suggestions = getAutoSuggestions(testSessionId);
      const criticalSuggestion = suggestions.find(s => s.severity === "critical");
      expect(criticalSuggestion).toBeDefined();
    });

    it("should limit suggestions to top 5", () => {
      // Generate many different errors
      recordFailure(testSessionId, "TypeError: Cannot read property", 1);
      recordFailure(testSessionId, "Type 'string' is not assignable", 2);
      recordFailure(testSessionId, "Cannot find module", 3);
      recordFailure(testSessionId, "Database connection refused", 4);
      recordFailure(testSessionId, "expect(received).toEqual(expected)", 5);
      
      const suggestions = getAutoSuggestions(testSessionId);
      expect(suggestions.length).toBeLessThanOrEqual(5);
    });
  });

  describe("dismissSuggestion", () => {
    it("should prevent dismissed suggestions from appearing again", () => {
      recordFailure(testSessionId, "TypeError: Cannot read property 'foo' of undefined", 1);
      recordFailure(testSessionId, "TypeError: Cannot read property 'bar' of undefined", 2);
      
      let suggestions = getAutoSuggestions(testSessionId);
      const firstSuggestion = suggestions[0];
      
      dismissSuggestion(testSessionId, firstSuggestion.pattern, firstSuggestion.sign);
      
      suggestions = getAutoSuggestions(testSessionId);
      const dismissed = suggestions.find(
        s => s.pattern === firstSuggestion.pattern && s.sign === firstSuggestion.sign
      );
      expect(dismissed).toBeUndefined();
    });
  });

  describe("getFailureStats", () => {
    it("should return zero stats for new session", () => {
      const stats = getFailureStats(testSessionId);
      expect(stats.totalFailures).toBe(0);
      expect(stats.consecutiveFailures).toBe(0);
      expect(stats.topPatterns).toEqual([]);
      expect(stats.lastFailure).toBeNull();
    });

    it("should track top patterns correctly", () => {
      recordFailure(testSessionId, "TypeError: Cannot read property", 1);
      recordFailure(testSessionId, "TypeError: Cannot read property", 2);
      recordFailure(testSessionId, "Type 'string' is not assignable", 3);
      
      const stats = getFailureStats(testSessionId);
      expect(stats.topPatterns.length).toBeGreaterThan(0);
      expect(stats.topPatterns[0].pattern).toBe("null_undefined");
      expect(stats.topPatterns[0].count).toBe(2);
    });

    it("should track last failure", () => {
      recordFailure(testSessionId, "First error", 1);
      recordFailure(testSessionId, "Last error", 2);
      
      const stats = getFailureStats(testSessionId);
      expect(stats.lastFailure).not.toBeNull();
      expect(stats.lastFailure?.errorOutput).toBe("Last error");
      expect(stats.lastFailure?.iteration).toBe(2);
    });
  });

  describe("clearFailureHistory", () => {
    it("should clear all failure history for a session", () => {
      recordFailure(testSessionId, "Error 1", 1);
      recordFailure(testSessionId, "Error 2", 2);
      
      clearFailureHistory(testSessionId);
      
      const stats = getFailureStats(testSessionId);
      expect(stats.totalFailures).toBe(0);
      expect(stats.consecutiveFailures).toBe(0);
    });
  });

  describe("FAILURE_PATTERNS", () => {
    it("should have patterns for common error types", () => {
      expect(FAILURE_PATTERNS.ts_type_mismatch).toBeDefined();
      expect(FAILURE_PATTERNS.null_undefined).toBeDefined();
      expect(FAILURE_PATTERNS.test_assertion).toBeDefined();
      expect(FAILURE_PATTERNS.database_error).toBeDefined();
    });

    it("should have signs for each pattern", () => {
      Object.values(FAILURE_PATTERNS).forEach(config => {
        expect(config.signs.length).toBeGreaterThan(0);
      });
    });

    it("should have severity levels for each pattern", () => {
      Object.values(FAILURE_PATTERNS).forEach(config => {
        expect(["low", "medium", "high", "critical"]).toContain(config.severity);
      });
    });
  });
});
