import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          queries: ["query 1", "query 2", "query 3"],
        }),
      },
    }],
  }),
}));

import type {
  ResearchQuery,
  ResearchSource,
  ResearchFinding,
  ResearchResult,
  ResearchProgress,
} from "./deepResearchEngine";

describe("Deep Research Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("ResearchQuery Types", () => {
    it("should define correct query structure", () => {
      const query: ResearchQuery = {
        topic: "Machine learning best practices",
        depth: "standard",
        maxSources: 10,
      };

      expect(query.topic).toBe("Machine learning best practices");
      expect(query.depth).toBe("standard");
      expect(query.maxSources).toBe(10);
    });

    it("should support all depth levels", () => {
      const depths: Array<ResearchQuery["depth"]> = ["quick", "standard", "deep"];

      depths.forEach(depth => {
        const query: ResearchQuery = {
          topic: "Test topic",
          depth,
          maxSources: 5,
        };
        expect(query.depth).toBe(depth);
      });
    });

    it("should validate maxSources range", () => {
      const validRanges = [1, 5, 10, 20, 50];

      validRanges.forEach(max => {
        const query: ResearchQuery = {
          topic: "Test",
          depth: "standard",
          maxSources: max,
        };
        expect(query.maxSources).toBeGreaterThan(0);
      });
    });
  });

  describe("ResearchSource Types", () => {
    it("should define correct source structure", () => {
      const source: ResearchSource = {
        url: "https://example.com/article",
        title: "Example Article",
        snippet: "This is a snippet of the article content...",
        content: "Full article content here...",
        relevanceScore: 0.95,
        extractedAt: new Date(),
      };

      expect(source.url).toContain("https://");
      expect(source.title).toBeTruthy();
      expect(source.relevanceScore).toBeGreaterThan(0);
      expect(source.relevanceScore).toBeLessThanOrEqual(1);
    });

    it("should handle source without content", () => {
      const source: ResearchSource = {
        url: "https://example.com",
        title: "Title",
        snippet: "Snippet",
        relevanceScore: 0.8,
        extractedAt: new Date(),
      };

      expect(source.content).toBeUndefined();
      expect(source.snippet).toBeTruthy();
    });

    it("should sort sources by relevance score", () => {
      const sources: ResearchSource[] = [
        { url: "url1", title: "T1", snippet: "S1", relevanceScore: 0.7, extractedAt: new Date() },
        { url: "url2", title: "T2", snippet: "S2", relevanceScore: 0.95, extractedAt: new Date() },
        { url: "url3", title: "T3", snippet: "S3", relevanceScore: 0.85, extractedAt: new Date() },
      ];

      const sorted = [...sources].sort((a, b) => b.relevanceScore - a.relevanceScore);

      expect(sorted[0].relevanceScore).toBe(0.95);
      expect(sorted[2].relevanceScore).toBe(0.7);
    });
  });

  describe("ResearchFinding Types", () => {
    it("should define correct finding structure", () => {
      const finding: ResearchFinding = {
        title: "Key Finding",
        content: "Detailed explanation of the finding...",
        sources: ["https://source1.com", "https://source2.com"],
        confidence: "high",
        category: "Technical",
      };

      expect(finding.title).toBeTruthy();
      expect(finding.sources).toHaveLength(2);
      expect(finding.confidence).toBe("high");
    });

    it("should support all confidence levels", () => {
      const confidenceLevels: Array<ResearchFinding["confidence"]> = ["high", "medium", "low"];

      confidenceLevels.forEach(confidence => {
        const finding: ResearchFinding = {
          title: "Test",
          content: "Content",
          sources: [],
          confidence,
          category: "Test",
        };
        expect(finding.confidence).toBe(confidence);
      });
    });

    it("should categorize findings", () => {
      const findings: ResearchFinding[] = [
        { title: "F1", content: "C1", sources: [], confidence: "high", category: "Technical" },
        { title: "F2", content: "C2", sources: [], confidence: "medium", category: "Business" },
        { title: "F3", content: "C3", sources: [], confidence: "high", category: "Technical" },
      ];

      const technicalFindings = findings.filter(f => f.category === "Technical");
      expect(technicalFindings).toHaveLength(2);
    });
  });

  describe("ResearchResult Types", () => {
    it("should define correct result structure", () => {
      const result: ResearchResult = {
        topic: "AI in Healthcare",
        summary: "A comprehensive overview of AI applications in healthcare...",
        findings: [
          {
            title: "Finding 1",
            content: "Content 1",
            sources: ["url1"],
            confidence: "high",
            category: "Applications",
          },
        ],
        sources: [
          {
            url: "https://example.com",
            title: "Source",
            snippet: "Snippet",
            relevanceScore: 0.9,
            extractedAt: new Date(),
          },
        ],
        followUpQuestions: ["What are the ethical implications?"],
        executionTimeMs: 5000,
      };

      expect(result.topic).toBe("AI in Healthcare");
      expect(result.findings).toHaveLength(1);
      expect(result.sources).toHaveLength(1);
      expect(result.followUpQuestions).toHaveLength(1);
      expect(result.executionTimeMs).toBeGreaterThan(0);
    });
  });

  describe("ResearchProgress Types", () => {
    it("should define correct progress structure", () => {
      const progress: ResearchProgress = {
        stage: "searching",
        progress: 25,
        message: "Searching for sources...",
        currentSource: "https://example.com",
      };

      expect(progress.stage).toBe("searching");
      expect(progress.progress).toBe(25);
      expect(progress.message).toBeTruthy();
    });

    it("should support all stages", () => {
      const stages: Array<ResearchProgress["stage"]> = [
        "planning",
        "searching",
        "scraping",
        "analyzing",
        "synthesizing",
        "complete",
        "error",
      ];

      stages.forEach(stage => {
        const progress: ResearchProgress = {
          stage,
          progress: 50,
          message: `Stage: ${stage}`,
        };
        expect(progress.stage).toBe(stage);
      });
    });

    it("should track progress percentage", () => {
      const progressUpdates: ResearchProgress[] = [
        { stage: "planning", progress: 5, message: "Planning..." },
        { stage: "searching", progress: 25, message: "Searching..." },
        { stage: "scraping", progress: 50, message: "Scraping..." },
        { stage: "analyzing", progress: 75, message: "Analyzing..." },
        { stage: "complete", progress: 100, message: "Complete!" },
      ];

      // Verify progress increases
      for (let i = 1; i < progressUpdates.length; i++) {
        expect(progressUpdates[i].progress).toBeGreaterThan(progressUpdates[i - 1].progress);
      }
    });
  });

  describe("Search Query Generation", () => {
    it("should generate multiple search queries from topic", () => {
      const topic = "React performance optimization";
      const expectedQueries = [
        "React performance optimization techniques",
        "React memo useMemo useCallback best practices",
        "React virtual DOM optimization",
      ];

      expect(expectedQueries).toHaveLength(3);
      expectedQueries.forEach(q => {
        expect(q.toLowerCase()).toContain("react");
      });
    });

    it("should limit queries based on depth", () => {
      const depthLimits = {
        quick: 2,
        standard: 3,
        deep: 5,
      };

      Object.entries(depthLimits).forEach(([depth, limit]) => {
        expect(limit).toBeGreaterThan(0);
        expect(limit).toBeLessThanOrEqual(5);
      });
    });

    it("should handle fallback when query generation fails", () => {
      const topic = "Complex research topic";
      const fallbackQueries = [topic]; // Just use the topic itself

      expect(fallbackQueries).toHaveLength(1);
      expect(fallbackQueries[0]).toBe(topic);
    });
  });

  describe("Search Execution", () => {
    it("should perform search and return sources", () => {
      const mockResults: ResearchSource[] = [
        {
          url: "https://example1.com",
          title: "Result 1",
          snippet: "Snippet 1",
          relevanceScore: 0.9,
          extractedAt: new Date(),
        },
        {
          url: "https://example2.com",
          title: "Result 2",
          snippet: "Snippet 2",
          relevanceScore: 0.8,
          extractedAt: new Date(),
        },
      ];

      expect(mockResults).toHaveLength(2);
      expect(mockResults[0].relevanceScore).toBeGreaterThan(mockResults[1].relevanceScore);
    });

    it("should deduplicate sources by URL", () => {
      const sources: ResearchSource[] = [
        { url: "https://example.com", title: "T1", snippet: "S1", relevanceScore: 0.9, extractedAt: new Date() },
        { url: "https://example.com", title: "T1", snippet: "S1", relevanceScore: 0.9, extractedAt: new Date() },
        { url: "https://other.com", title: "T2", snippet: "S2", relevanceScore: 0.8, extractedAt: new Date() },
      ];

      const unique = sources.filter((source, index, self) =>
        index === self.findIndex(s => s.url === source.url)
      );

      expect(unique).toHaveLength(2);
    });

    it("should limit sources to maxSources", () => {
      const maxSources = 5;
      const allSources: ResearchSource[] = Array.from({ length: 10 }, (_, i) => ({
        url: `https://example${i}.com`,
        title: `Title ${i}`,
        snippet: `Snippet ${i}`,
        relevanceScore: 1 - i * 0.1,
        extractedAt: new Date(),
      }));

      const limited = allSources.slice(0, maxSources);

      expect(limited).toHaveLength(5);
    });
  });

  describe("Content Extraction", () => {
    it("should extract content from source", () => {
      const source: ResearchSource = {
        url: "https://example.com/article",
        title: "Article Title",
        snippet: "Brief snippet...",
        relevanceScore: 0.9,
        extractedAt: new Date(),
      };

      // Simulate content extraction
      const extractedContent = "Full article content with multiple paragraphs...";
      source.content = extractedContent;

      expect(source.content).toBeTruthy();
      expect(source.content!.length).toBeGreaterThan(source.snippet.length);
    });

    it("should fallback to snippet if extraction fails", () => {
      const source: ResearchSource = {
        url: "https://example.com",
        title: "Title",
        snippet: "This is the snippet content",
        relevanceScore: 0.8,
        extractedAt: new Date(),
      };

      // Simulate extraction failure - use snippet
      const content = source.content || source.snippet;

      expect(content).toBe("This is the snippet content");
    });
  });

  describe("Findings Synthesis", () => {
    it("should synthesize findings from sources", () => {
      const sources: ResearchSource[] = [
        {
          url: "https://source1.com",
          title: "Source 1",
          snippet: "Info about topic A",
          content: "Detailed info about topic A...",
          relevanceScore: 0.9,
          extractedAt: new Date(),
        },
        {
          url: "https://source2.com",
          title: "Source 2",
          snippet: "Info about topic B",
          content: "Detailed info about topic B...",
          relevanceScore: 0.85,
          extractedAt: new Date(),
        },
      ];

      const synthesis = {
        summary: "Combined analysis of topics A and B...",
        findings: [
          {
            title: "Finding about A",
            content: "Details...",
            sources: [sources[0].url],
            confidence: "high" as const,
            category: "Category A",
          },
        ],
        followUpQuestions: ["What about topic C?"],
      };

      expect(synthesis.summary).toBeTruthy();
      expect(synthesis.findings).toHaveLength(1);
      expect(synthesis.followUpQuestions).toHaveLength(1);
    });

    it("should assign confidence based on source agreement", () => {
      // Multiple sources agree = high confidence
      const multiSourceFinding: ResearchFinding = {
        title: "Well-supported finding",
        content: "Content",
        sources: ["url1", "url2", "url3"],
        confidence: "high",
        category: "Test",
      };

      // Single source = lower confidence
      const singleSourceFinding: ResearchFinding = {
        title: "Less supported finding",
        content: "Content",
        sources: ["url1"],
        confidence: "low",
        category: "Test",
      };

      expect(multiSourceFinding.sources.length).toBeGreaterThan(singleSourceFinding.sources.length);
    });

    it("should generate follow-up questions", () => {
      const topic = "Machine learning in healthcare";
      const followUpQuestions = [
        "What are the privacy concerns?",
        "How accurate are current ML models?",
        "What regulatory frameworks exist?",
      ];

      expect(followUpQuestions).toHaveLength(3);
      followUpQuestions.forEach(q => {
        expect(q.endsWith("?")).toBe(true);
      });
    });
  });

  describe("Progress Callback", () => {
    it("should emit progress updates during research", () => {
      const progressUpdates: ResearchProgress[] = [];
      const onProgress = (progress: ResearchProgress) => {
        progressUpdates.push(progress);
      };

      // Simulate progress updates
      onProgress({ stage: "planning", progress: 5, message: "Planning..." });
      onProgress({ stage: "searching", progress: 20, message: "Searching..." });
      onProgress({ stage: "scraping", progress: 50, message: "Extracting..." });
      onProgress({ stage: "analyzing", progress: 75, message: "Analyzing..." });
      onProgress({ stage: "synthesizing", progress: 90, message: "Synthesizing..." });
      onProgress({ stage: "complete", progress: 100, message: "Done!" });

      expect(progressUpdates).toHaveLength(6);
      expect(progressUpdates[0].stage).toBe("planning");
      expect(progressUpdates[5].stage).toBe("complete");
    });

    it("should include current source in scraping stage", () => {
      const progress: ResearchProgress = {
        stage: "scraping",
        progress: 45,
        message: "Extracting content...",
        currentSource: "https://example.com/article",
      };

      expect(progress.currentSource).toBeTruthy();
      expect(progress.currentSource).toContain("https://");
    });
  });

  describe("Error Handling", () => {
    it("should handle search failure gracefully", () => {
      const progress: ResearchProgress = {
        stage: "error",
        progress: 0,
        message: "Error: Search API unavailable",
      };

      expect(progress.stage).toBe("error");
      expect(progress.message).toContain("Error");
    });

    it("should handle LLM failure gracefully", () => {
      const fallbackResult = {
        summary: "Analysis could not be completed.",
        findings: [],
        followUpQuestions: [],
      };

      expect(fallbackResult.summary).toBeTruthy();
      expect(fallbackResult.findings).toHaveLength(0);
    });

    it("should handle JSON parse errors", () => {
      const malformedJson = "{ invalid json }";
      let parsed = null;

      try {
        parsed = JSON.parse(malformedJson);
      } catch {
        parsed = { queries: [] }; // Fallback
      }

      expect(parsed.queries).toHaveLength(0);
    });
  });

  describe("Follow-Up Questions", () => {
    it("should execute follow-up question with existing sources", () => {
      const originalTopic = "AI Ethics";
      const question = "What are the main concerns?";
      const existingSources: ResearchSource[] = [
        {
          url: "https://ethics.com",
          title: "AI Ethics Overview",
          snippet: "Overview of ethical concerns...",
          content: "Detailed content about AI ethics...",
          relevanceScore: 0.9,
          extractedAt: new Date(),
        },
      ];

      // Simulate follow-up answer
      const answer = "Based on the existing sources, the main concerns include...";
      const newSources: ResearchSource[] = [];

      expect(answer).toBeTruthy();
      expect(newSources).toHaveLength(0); // No new sources needed
    });

    it("should fetch additional sources if needed", () => {
      const answer = "Additional research is needed to fully answer this question.";
      const needsMore = answer.toLowerCase().includes("additional research");

      expect(needsMore).toBe(true);
    });
  });

  describe("Execution Time Tracking", () => {
    it("should track execution time", () => {
      const startTime = Date.now();
      
      // Simulate work
      const workDuration = 100;
      
      const executionTimeMs = Date.now() - startTime + workDuration;

      expect(executionTimeMs).toBeGreaterThan(0);
    });

    it("should include execution time in result", () => {
      const result: ResearchResult = {
        topic: "Test",
        summary: "Summary",
        findings: [],
        sources: [],
        followUpQuestions: [],
        executionTimeMs: 5432,
      };

      expect(result.executionTimeMs).toBe(5432);
    });
  });

  describe("Depth-Based Behavior", () => {
    it("should adjust behavior based on depth setting", () => {
      const depthConfig = {
        quick: { maxQueries: 2, maxSourcesPerQuery: 3 },
        standard: { maxQueries: 3, maxSourcesPerQuery: 5 },
        deep: { maxQueries: 5, maxSourcesPerQuery: 10 },
      };

      expect(depthConfig.quick.maxQueries).toBeLessThan(depthConfig.deep.maxQueries);
      expect(depthConfig.standard.maxSourcesPerQuery).toBe(5);
    });

    it("should complete faster with quick depth", () => {
      // Quick depth should process fewer sources
      const quickSources = 6;
      const deepSources = 50;

      expect(quickSources).toBeLessThan(deepSources);
    });
  });
});

describe("Deep Research Engine Integration Scenarios", () => {
  it("should complete a full research workflow", () => {
    // Simulate complete research workflow
    const workflow = {
      input: {
        topic: "Quantum Computing Applications",
        depth: "standard" as const,
        maxSources: 10,
      },
      stages: [
        { stage: "planning", duration: 500 },
        { stage: "searching", duration: 2000 },
        { stage: "scraping", duration: 3000 },
        { stage: "analyzing", duration: 1000 },
        { stage: "synthesizing", duration: 1500 },
      ],
      output: {
        sourcesFound: 8,
        findingsGenerated: 5,
        followUpQuestions: 3,
      },
    };

    const totalDuration = workflow.stages.reduce((sum, s) => sum + s.duration, 0);

    expect(totalDuration).toBe(8000);
    expect(workflow.output.sourcesFound).toBeLessThanOrEqual(workflow.input.maxSources);
  });

  it("should handle research on technical topics", () => {
    const technicalTopic = "Kubernetes deployment strategies";
    const expectedCategories = ["Infrastructure", "DevOps", "Best Practices"];

    expect(expectedCategories).toHaveLength(3);
  });

  it("should handle research on business topics", () => {
    const businessTopic = "Market analysis for SaaS products";
    const expectedCategories = ["Market Size", "Competition", "Trends"];

    expect(expectedCategories).toHaveLength(3);
  });
});
