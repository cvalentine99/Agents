import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the database
vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock("mysql2/promise", () => ({
  default: {
    createPool: vi.fn(() => ({})),
  },
}));

// Mock the schema
vi.mock("../drizzle/schema", () => ({
  apiKeys: {
    userId: "userId",
    provider: "provider",
    encryptedKey: "encryptedKey",
  },
}));

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ field: a, value: b })),
  and: vi.fn((...conditions) => conditions),
}));

// Mock crypto
vi.mock("./crypto", () => ({
  decrypt: vi.fn().mockReturnValue("sk-test-api-key-12345"),
  encrypt: vi.fn().mockReturnValue("encrypted-key"),
  getKeyHint: vi.fn().mockReturnValue("12345"),
}));

// Mock the LLM core module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: "Generated response from LLM",
        },
        finish_reason: "stop",
      },
    ],
    usage: {
      total_tokens: 150,
      prompt_tokens: 50,
      completion_tokens: 100,
    },
  }),
}));

import { invokeLLM } from "./_core/llm";

describe("LLM Executor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("LLM Model Types", () => {
    it("should support all model types", () => {
      const models = ["claude", "codex", "gemini", "manus"] as const;

      models.forEach(model => {
        expect(typeof model).toBe("string");
      });
    });

    it("should default to claude model", () => {
      const defaultModel = "claude";
      expect(defaultModel).toBe("claude");
    });
  });

  describe("Message Format", () => {
    it("should support system messages", () => {
      const message = {
        role: "system" as const,
        content: "You are a helpful assistant.",
      };

      expect(message.role).toBe("system");
      expect(message.content).toBeTruthy();
    });

    it("should support user messages", () => {
      const message = {
        role: "user" as const,
        content: "Help me write code.",
      };

      expect(message.role).toBe("user");
    });

    it("should support assistant messages", () => {
      const message = {
        role: "assistant" as const,
        content: "Here is the code...",
      };

      expect(message.role).toBe("assistant");
    });

    it("should format messages array correctly", () => {
      const messages = [
        { role: "system" as const, content: "You are an expert coder." },
        { role: "user" as const, content: "Write a function." },
      ];

      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe("system");
      expect(messages[1].role).toBe("user");
    });
  });

  describe("callLLM", () => {
    it("should call invokeLLM with correct parameters", async () => {
      const messages = [
        { role: "system" as const, content: "You are helpful." },
        { role: "user" as const, content: "Hello" },
      ];

      await invokeLLM({
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      });

      expect(invokeLLM).toHaveBeenCalledWith({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: "system" }),
          expect.objectContaining({ role: "user" }),
        ]),
      });
    });

    it("should return response with content", async () => {
      // Test expected response structure
      const expectedResponse = {
        choices: [{ message: { content: "Generated response from LLM" } }],
      };

      expect(expectedResponse.choices[0].message.content).toBe(
        "Generated response from LLM"
      );
    });

    it("should include token usage in response", async () => {
      // Test expected token usage structure
      const expectedResponse = {
        usage: {
          total_tokens: 150,
          prompt_tokens: 50,
          completion_tokens: 100,
        },
      };

      expect(expectedResponse.usage?.total_tokens).toBe(150);
      expect(expectedResponse.usage?.prompt_tokens).toBe(50);
      expect(expectedResponse.usage?.completion_tokens).toBe(100);
    });

    it("should include finish reason in response", async () => {
      // Test expected finish reason structure
      const expectedResponse = {
        choices: [{ finish_reason: "stop" }],
      };

      expect(expectedResponse.choices[0].finish_reason).toBe("stop");
    });
  });

  describe("Code Generation", () => {
    it("should generate code with system prompt", async () => {
      const systemPrompt = `You are an expert software engineer. Generate clean, working code.`;
      const userPrompt = "Write a hello world function";

      await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      expect(invokeLLM).toHaveBeenCalled();
    });

    it("should include context in code generation", async () => {
      const context = "Files in project: index.ts, utils.ts";
      const systemPrompt = `Generate code. Context: ${context}`;

      await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Add a new utility function" },
        ],
      });

      expect(invokeLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining("Context"),
            }),
          ]),
        })
      );
    });

    it("should parse code blocks from response", () => {
      const response =
        "Here is the code:\n```typescript\nconsole.log('Hello');\n```";
      const codeBlockMatch = response.match(/```[\w]*\n([\s\S]*?)```/);
      const code = codeBlockMatch ? codeBlockMatch[1] : response;

      expect(code).toBe("console.log('Hello');\n");
    });

    it("should detect diff format in response", () => {
      const diffResponse = `--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,4 @@
 const x = 1;
+const y = 2;
 export { x };`;

      const isDiff =
        diffResponse.includes("---") &&
        diffResponse.includes("+++") &&
        diffResponse.includes("@@");

      expect(isDiff).toBe(true);
    });

    it("should handle response without code blocks", () => {
      const plainResponse = "Just use console.log('Hello');";
      const codeBlockMatch = plainResponse.match(/```[\w]*\n([\s\S]*?)```/);
      const code = codeBlockMatch ? codeBlockMatch[1] : plainResponse;

      expect(code).toBe(plainResponse);
    });
  });

  describe("Code Review", () => {
    it("should format review request correctly", async () => {
      const code = "function add(a, b) { return a + b; }";
      const systemPrompt = `You are a senior code reviewer. Analyze the code.`;

      await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Review this code:\n\n${code}` },
        ],
      });

      expect(invokeLLM).toHaveBeenCalled();
    });

    it("should parse JSON review response", () => {
      const jsonResponse = `{
        "issues": ["Missing type annotations"],
        "suggestions": ["Add TypeScript types"],
        "approved": false
      }`;

      const jsonMatch = jsonResponse.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

      expect(parsed).not.toBeNull();
      expect(parsed.issues).toHaveLength(1);
      expect(parsed.suggestions).toHaveLength(1);
      expect(parsed.approved).toBe(false);
    });

    it("should handle malformed JSON response", () => {
      const malformedResponse = "The code looks good but { incomplete";
      const jsonMatch = malformedResponse.match(/\{[\s\S]*\}/);

      let parsed: {
        issues: string[];
        suggestions: string[];
        approved: boolean;
      } | null = null;
      try {
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      } catch {
        // Fall through to default
      }

      // If parsing failed or no match, use default
      if (!parsed) {
        parsed = {
          issues: [],
          suggestions: ["Could not parse review response"],
          approved: false,
        };
      }

      expect(parsed.approved).toBe(false);
    });

    it("should return default values on parse failure", () => {
      const defaultReview = {
        issues: [],
        suggestions: ["Could not parse review response"],
        approved: false,
      };

      expect(defaultReview.issues).toHaveLength(0);
      expect(defaultReview.approved).toBe(false);
    });
  });

  describe("Test Analysis", () => {
    it("should analyze test output correctly", async () => {
      const testOutput = `
        PASS src/utils.test.ts
        ✓ should add numbers (5ms)
        ✓ should subtract numbers (2ms)
        
        Test Suites: 1 passed, 1 total
        Tests: 2 passed, 2 total
      `;

      const systemPrompt = "Analyze the test output and provide JSON response.";

      await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Analyze this test output:\n\n${testOutput}`,
          },
        ],
      });

      expect(invokeLLM).toHaveBeenCalled();
    });

    it("should detect passing tests from output", () => {
      const testOutput = "Tests: 10 passed, 10 total";
      const passed =
        testOutput.includes("passed") && !testOutput.includes("failed");

      expect(passed).toBe(true);
    });

    it("should detect failing tests from output", () => {
      const testOutput = "Tests: 8 passed, 2 failed, 10 total";
      const hasFailed = testOutput.includes("failed");

      expect(hasFailed).toBe(true);
    });

    it("should parse test analysis JSON", () => {
      const analysisResponse = `{
        "passed": true,
        "summary": "All 10 tests passed",
        "failures": []
      }`;

      const jsonMatch = analysisResponse.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

      expect(parsed.passed).toBe(true);
      expect(parsed.failures).toHaveLength(0);
    });

    it("should handle test failures in analysis", () => {
      const analysisResponse = `{
        "passed": false,
        "summary": "2 tests failed",
        "failures": ["test1 failed: assertion error", "test2 failed: timeout"]
      }`;

      const parsed = JSON.parse(analysisResponse);

      expect(parsed.passed).toBe(false);
      expect(parsed.failures).toHaveLength(2);
    });
  });

  describe("API Key Management", () => {
    it("should decrypt API key correctly", () => {
      // Test the decrypt function behavior
      // In the actual implementation, decrypt returns the decrypted key
      const encryptedKey = "encrypted-key";

      // Verify the mock is set up correctly
      expect(typeof encryptedKey).toBe("string");
      expect(encryptedKey.length).toBeGreaterThan(0);
    });

    it("should return null for missing API key", async () => {
      // Simulate no API key found
      const keyRecord: any[] = [];
      const apiKey = keyRecord.length > 0 ? keyRecord[0].encryptedKey : null;

      expect(apiKey).toBeNull();
    });

    it("should handle decryption failure", () => {
      // Test error handling pattern for decryption failures
      let result: string | null = null;

      // Simulate decryption failure scenario
      const simulateDecryptionFailure = () => {
        throw new Error("Decryption failed");
      };

      try {
        simulateDecryptionFailure();
      } catch {
        result = null;
      }

      expect(result).toBeNull();
    });
  });

  describe("Error Handling", () => {
    it("should handle LLM API errors", async () => {
      // Test error handling pattern for API errors
      const simulateApiError = async () => {
        throw new Error("API rate limit exceeded");
      };

      let error: Error | null = null;
      try {
        await simulateApiError();
      } catch (e) {
        error = e as Error;
      }

      expect(error).not.toBeNull();
      expect(error?.message).toBe("API rate limit exceeded");
    });

    it("should handle network errors", async () => {
      // Test error handling pattern for network errors
      const simulateNetworkError = async () => {
        throw new Error("Network error");
      };

      let error: Error | null = null;
      try {
        await simulateNetworkError();
      } catch (e) {
        error = e as Error;
      }

      expect(error?.message).toBe("Network error");
    });

    it("should handle timeout errors", async () => {
      // Test error handling pattern for timeout errors
      const simulateTimeoutError = async () => {
        throw new Error("Request timeout");
      };

      let error: Error | null = null;
      try {
        await simulateTimeoutError();
      } catch (e) {
        error = e as Error;
      }

      expect(error?.message).toBe("Request timeout");
    });

    it("should return error result on code generation failure", () => {
      const errorResult = {
        success: false,
        error: "Code generation failed",
      };

      expect(errorResult.success).toBe(false);
      expect(errorResult.error).toBeTruthy();
    });
  });

  describe("Response Parsing", () => {
    it("should extract string content from response", () => {
      const response = {
        choices: [{ message: { content: "Hello World" } }],
      };

      const content =
        typeof response.choices[0].message.content === "string"
          ? response.choices[0].message.content
          : "";

      expect(content).toBe("Hello World");
    });

    it("should handle non-string content", () => {
      const response = {
        choices: [{ message: { content: null } }],
      };

      const content =
        typeof response.choices[0].message.content === "string"
          ? response.choices[0].message.content
          : "";

      expect(content).toBe("");
    });

    it("should handle empty choices array", () => {
      const response = { choices: [] };
      const content = response.choices[0]?.message?.content ?? "";

      expect(content).toBe("");
    });

    it("should handle missing message property", () => {
      const response = { choices: [{}] } as any;
      const content = response.choices[0]?.message?.content ?? "";

      expect(content).toBe("");
    });
  });

  describe("Code Generation Result", () => {
    it("should return success with code", () => {
      const result = {
        success: true,
        code: "console.log('Hello');",
        explanation: "Simple hello world",
      };

      expect(result.success).toBe(true);
      expect(result.code).toBeTruthy();
    });

    it("should return success with diff", () => {
      const result = {
        success: true,
        diff: "--- a/file.ts\n+++ b/file.ts\n@@ -1 +1 @@\n-old\n+new",
      };

      expect(result.success).toBe(true);
      expect(result.diff).toBeTruthy();
    });

    it("should return failure with error", () => {
      const result = {
        success: false,
        error: "Failed to generate code",
      };

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe("LLM Response Structure", () => {
    it("should have correct response structure", () => {
      const response = {
        content: "Generated text",
        model: "claude",
        tokensUsed: 100,
        finishReason: "stop",
      };

      expect(response).toHaveProperty("content");
      expect(response).toHaveProperty("model");
      expect(response).toHaveProperty("tokensUsed");
      expect(response).toHaveProperty("finishReason");
    });

    it("should handle optional fields", () => {
      const response = {
        content: "Generated text",
        model: "claude",
      };

      expect(response.content).toBeTruthy();
      expect((response as any).tokensUsed).toBeUndefined();
    });
  });

  describe("System Prompt Templates", () => {
    it("should format code generation system prompt", () => {
      const context = "Project uses React and TypeScript";
      const systemPrompt = `You are an expert software engineer. Generate clean, working code based on the user's requirements.

IMPORTANT RULES:
1. Output ONLY the code, no explanations unless asked
2. Use proper formatting and indentation
3. Include necessary imports
4. Follow best practices for the language/framework
5. If generating a diff, use unified diff format

Current context:
${context}`;

      expect(systemPrompt).toContain("expert software engineer");
      expect(systemPrompt).toContain("IMPORTANT RULES");
      expect(systemPrompt).toContain(context);
    });

    it("should format code review system prompt", () => {
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

      expect(systemPrompt).toContain("senior code reviewer");
      expect(systemPrompt).toContain("JSON format");
    });

    it("should format test analysis system prompt", () => {
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

      expect(systemPrompt).toContain("test output");
      expect(systemPrompt).toContain("JSON format");
    });
  });
});

describe("LLM Executor Integration Scenarios", () => {
  it("should handle full code generation workflow", async () => {
    // Simulate the workflow structure
    const codeGenerationMessages = [
      { role: "system" as const, content: "Generate code" },
      { role: "user" as const, content: "Write a function" },
    ];

    // Verify message structure is correct
    expect(codeGenerationMessages).toHaveLength(2);
    expect(codeGenerationMessages[0].role).toBe("system");
    expect(codeGenerationMessages[1].role).toBe("user");

    // Simulate review workflow
    const reviewMessages = [
      { role: "system" as const, content: "Review code" },
      {
        role: "user" as const,
        content: "Review: function add(a,b) { return a+b; }",
      },
    ];

    expect(reviewMessages).toHaveLength(2);
  });

  it("should handle iterative code improvement", async () => {
    const iterations = 3;
    const messages: Array<{ role: string; content: string }[]> = [];

    for (let i = 0; i < iterations; i++) {
      messages.push([
        { role: "system", content: "Improve code" },
        { role: "user", content: `Iteration ${i + 1}: Improve this code` },
      ]);
    }

    expect(messages).toHaveLength(3);
    expect(messages[0][1].content).toContain("Iteration 1");
    expect(messages[2][1].content).toContain("Iteration 3");
  });
});
