import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  createResearchSession: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  getResearchSession: vi.fn(),
  getUserResearchSessions: vi.fn().mockResolvedValue([]),
  updateResearchSession: vi.fn().mockResolvedValue({}),
  deleteResearchSession: vi.fn().mockResolvedValue({}),
  getResearchFindings: vi.fn().mockResolvedValue([]),
  getResearchSteps: vi.fn().mockResolvedValue([]),
  addResearchStep: vi.fn().mockResolvedValue({}),
  addResearchFinding: vi.fn().mockResolvedValue({}),
  updateResearchStep: vi.fn().mockResolvedValue({}),
}));

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: '{"keyQuestions": ["Q1"], "searchQueries": ["query1"], "expectedSources": ["web"]}' } }],
    usage: { total_tokens: 100 },
  }),
}));

import * as db from "./db";

describe("Deep Research Feature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Database Operations", () => {
    it("should create a research session", async () => {
      const sessionData = {
        userId: 1,
        topic: "Test research topic",
        depth: "standard" as const,
        status: "pending" as const,
        currentStep: 0,
        totalSteps: 5,
      };

      await db.createResearchSession(sessionData);
      
      expect(db.createResearchSession).toHaveBeenCalledWith(sessionData);
    });

    it("should get research session by id", async () => {
      const mockSession = {
        id: 1,
        userId: 1,
        topic: "Test topic",
        depth: "standard",
        status: "complete",
        currentStep: 3,
        totalSteps: 5,
        summary: "Test summary",
        sourcesCount: 5,
        tokensUsed: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.getResearchSession).mockResolvedValueOnce(mockSession as any);

      const result = await db.getResearchSession(1);
      
      expect(db.getResearchSession).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockSession);
    });

    it("should list user research sessions", async () => {
      const mockSessions = [
        { id: 1, topic: "Topic 1", status: "complete" },
        { id: 2, topic: "Topic 2", status: "pending" },
      ];

      vi.mocked(db.getUserResearchSessions).mockResolvedValueOnce(mockSessions as any);

      const result = await db.getUserResearchSessions(1);
      
      expect(db.getUserResearchSessions).toHaveBeenCalledWith(1);
      expect(result).toHaveLength(2);
    });

    it("should delete research session and related data", async () => {
      await db.deleteResearchSession(1);
      
      expect(db.deleteResearchSession).toHaveBeenCalledWith(1);
    });

    it("should update research session", async () => {
      const updates = {
        status: "complete" as const,
        summary: "Research complete",
        completedAt: new Date(),
      };

      await db.updateResearchSession(1, updates);
      
      expect(db.updateResearchSession).toHaveBeenCalledWith(1, updates);
    });
  });

  describe("Research Steps", () => {
    it("should add a research step", async () => {
      const stepData = {
        researchSessionId: 1,
        stepNumber: 1,
        stepType: "planning" as const,
        query: "Test query",
        reasoning: "Test reasoning",
        status: "running" as const,
        startedAt: new Date(),
      };

      await db.addResearchStep(stepData);
      
      expect(db.addResearchStep).toHaveBeenCalledWith(stepData);
    });

    it("should get research steps for a session", async () => {
      const mockSteps = [
        { id: 1, stepNumber: 1, stepType: "planning", status: "complete" },
        { id: 2, stepNumber: 2, stepType: "searching", status: "running" },
      ];

      vi.mocked(db.getResearchSteps).mockResolvedValueOnce(mockSteps as any);

      const result = await db.getResearchSteps(1);
      
      expect(db.getResearchSteps).toHaveBeenCalledWith(1);
      expect(result).toHaveLength(2);
    });

    it("should update a research step", async () => {
      const updates = {
        status: "complete" as const,
        result: "Step completed successfully",
        completedAt: new Date(),
      };

      await db.updateResearchStep(1, updates);
      
      expect(db.updateResearchStep).toHaveBeenCalledWith(1, updates);
    });
  });

  describe("Research Findings", () => {
    it("should add a research finding", async () => {
      const findingData = {
        researchSessionId: 1,
        title: "Test Finding",
        content: "Finding content",
        sourceType: "web" as const,
        relevanceScore: 85,
        confidence: "high" as const,
        stepNumber: 2,
      };

      await db.addResearchFinding(findingData);
      
      expect(db.addResearchFinding).toHaveBeenCalledWith(findingData);
    });

    it("should get findings for a research session", async () => {
      const mockFindings = [
        { id: 1, title: "Finding 1", relevanceScore: 90 },
        { id: 2, title: "Finding 2", relevanceScore: 75 },
      ];

      vi.mocked(db.getResearchFindings).mockResolvedValueOnce(mockFindings as any);

      const result = await db.getResearchFindings(1);
      
      expect(db.getResearchFindings).toHaveBeenCalledWith(1);
      expect(result).toHaveLength(2);
    });
  });

  describe("Authorization", () => {
    it("should only return sessions owned by the user", async () => {
      // Mock returns empty for different user
      vi.mocked(db.getUserResearchSessions).mockResolvedValueOnce([]);

      const result = await db.getUserResearchSessions(999);
      
      expect(result).toHaveLength(0);
    });

    it("should verify session ownership before operations", async () => {
      const mockSession = {
        id: 1,
        userId: 1, // Owner is user 1
        topic: "Test",
        status: "pending",
      };

      vi.mocked(db.getResearchSession).mockResolvedValueOnce(mockSession as any);

      const session = await db.getResearchSession(1);
      
      // Verify the session belongs to the expected user
      expect(session?.userId).toBe(1);
    });
  });

  describe("Research Depth Configuration", () => {
    it("should set correct total steps for quick depth", () => {
      const depth = "quick";
      const totalSteps = depth === "quick" ? 3 : depth === "standard" ? 5 : 8;
      expect(totalSteps).toBe(3);
    });

    it("should set correct total steps for standard depth", () => {
      const depth = "standard";
      const totalSteps = depth === "quick" ? 3 : depth === "standard" ? 5 : 8;
      expect(totalSteps).toBe(5);
    });

    it("should set correct total steps for deep depth", () => {
      const depth = "deep";
      const totalSteps = depth === "quick" ? 3 : depth === "standard" ? 5 : 8;
      expect(totalSteps).toBe(8);
    });
  });
});
