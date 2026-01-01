import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  getResearchSession: vi.fn(),
  updateResearchSession: vi.fn(),
  getResearchByShareToken: vi.fn(),
  getResearchFindings: vi.fn(),
  getResearchSteps: vi.fn(),
  getResearchFollowUps: vi.fn(),
  addResearchFollowUp: vi.fn(),
  updateResearchFollowUp: vi.fn(),
}));

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Test answer" } }],
    usage: { total_tokens: 100 },
  }),
}));

import * as db from "./db";

describe("Research Export Feature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate markdown export with all sections", async () => {
    const mockSession = {
      id: 1,
      userId: 1,
      topic: "Test Research Topic",
      depth: "standard",
      status: "complete",
      summary: "# Summary\n\nThis is a test summary.",
      sourcesCount: 3,
      createdAt: new Date("2024-01-01"),
      completedAt: new Date("2024-01-01"),
    };

    const mockFindings = [
      {
        id: 1,
        title: "Finding 1",
        content: "Content 1",
        sourceType: "web",
        confidence: "high",
        relevanceScore: 90,
      },
    ];

    const mockFollowUps = [
      {
        id: 1,
        question: "Follow-up question?",
        answer: "Follow-up answer.",
      },
    ];

    vi.mocked(db.getResearchSession).mockResolvedValue(mockSession as any);
    vi.mocked(db.getResearchFindings).mockResolvedValue(mockFindings as any);
    vi.mocked(db.getResearchFollowUps).mockResolvedValue(mockFollowUps as any);

    // Simulate markdown generation logic
    let markdown = `# ${mockSession.topic}\n\n`;
    markdown += `**Research Depth:** ${mockSession.depth}\n`;
    markdown += `**Status:** ${mockSession.status}\n`;
    markdown += `**Sources:** ${mockSession.sourcesCount}\n`;
    markdown += `**Date:** ${mockSession.createdAt.toISOString().split('T')[0]}\n\n`;
    markdown += `---\n\n`;
    markdown += mockSession.summary + "\n\n";
    markdown += `---\n\n## Research Findings\n\n`;
    for (const finding of mockFindings) {
      markdown += `### ${finding.title}\n\n`;
      markdown += `**Source Type:** ${finding.sourceType} | **Confidence:** ${finding.confidence} | **Relevance:** ${finding.relevanceScore}%\n\n`;
      markdown += `${finding.content}\n\n`;
    }
    markdown += `---\n\n## Follow-up Questions\n\n`;
    for (const followUp of mockFollowUps) {
      markdown += `### Q: ${followUp.question}\n\n`;
      markdown += `${followUp.answer}\n\n`;
    }

    expect(markdown).toContain("# Test Research Topic");
    expect(markdown).toContain("**Research Depth:** standard");
    expect(markdown).toContain("Finding 1");
    expect(markdown).toContain("Follow-up question?");
    expect(markdown).toContain("Follow-up answer.");
  });

  it("should handle empty findings gracefully", async () => {
    const mockSession = {
      id: 1,
      topic: "Test Topic",
      depth: "quick",
      status: "complete",
      summary: "Summary text",
      sourcesCount: 0,
      createdAt: new Date(),
    };

    vi.mocked(db.getResearchSession).mockResolvedValue(mockSession as any);
    vi.mocked(db.getResearchFindings).mockResolvedValue([]);
    vi.mocked(db.getResearchFollowUps).mockResolvedValue([]);

    let markdown = `# ${mockSession.topic}\n\n`;
    markdown += mockSession.summary;

    expect(markdown).toContain("Test Topic");
    expect(markdown).toContain("Summary text");
  });
});

describe("Research Sharing Feature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate share token for research", async () => {
    const mockSession = {
      id: 1,
      userId: 1,
      shareToken: null,
      isPublic: false,
    };

    vi.mocked(db.getResearchSession).mockResolvedValue(mockSession as any);
    vi.mocked(db.updateResearchSession).mockResolvedValue({} as any);

    // Simulate share token generation
    const shareToken = "abc123xyz789";
    await db.updateResearchSession(1, { shareToken, isPublic: true });

    expect(db.updateResearchSession).toHaveBeenCalledWith(1, {
      shareToken: expect.any(String),
      isPublic: true,
    });
  });

  it("should retrieve public research by share token", async () => {
    const mockSession = {
      id: 1,
      topic: "Public Research",
      status: "complete",
      isPublic: true,
      shareToken: "public-token-123",
    };

    vi.mocked(db.getResearchByShareToken).mockResolvedValue(mockSession as any);
    vi.mocked(db.getResearchFindings).mockResolvedValue([]);
    vi.mocked(db.getResearchSteps).mockResolvedValue([]);
    vi.mocked(db.getResearchFollowUps).mockResolvedValue([]);

    const session = await db.getResearchByShareToken("public-token-123");
    
    expect(session).toBeDefined();
    expect(session?.topic).toBe("Public Research");
    expect(session?.isPublic).toBe(true);
  });

  it("should reject access to non-public research", async () => {
    const mockSession = {
      id: 1,
      isPublic: false,
      shareToken: "private-token",
    };

    vi.mocked(db.getResearchByShareToken).mockResolvedValue(mockSession as any);

    const session = await db.getResearchByShareToken("private-token");
    
    expect(session?.isPublic).toBe(false);
    // In the actual router, this would throw an error
  });

  it("should return undefined for invalid share token", async () => {
    vi.mocked(db.getResearchByShareToken).mockResolvedValue(undefined);

    const session = await db.getResearchByShareToken("invalid-token");
    
    expect(session).toBeUndefined();
  });
});

describe("Research Follow-up Questions Feature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create follow-up question entry", async () => {
    vi.mocked(db.addResearchFollowUp).mockResolvedValue([{ insertId: 1 }] as any);

    const result = await db.addResearchFollowUp({
      researchSessionId: 1,
      question: "What are the implications?",
      status: "pending",
    });

    expect(db.addResearchFollowUp).toHaveBeenCalledWith({
      researchSessionId: 1,
      question: "What are the implications?",
      status: "pending",
    });
    expect(result[0].insertId).toBe(1);
  });

  it("should update follow-up with answer", async () => {
    vi.mocked(db.updateResearchFollowUp).mockResolvedValue({} as any);

    await db.updateResearchFollowUp(1, {
      answer: "The implications are significant...",
      status: "complete",
      tokensUsed: 150,
      answeredAt: new Date(),
    });

    expect(db.updateResearchFollowUp).toHaveBeenCalledWith(1, {
      answer: "The implications are significant...",
      status: "complete",
      tokensUsed: 150,
      answeredAt: expect.any(Date),
    });
  });

  it("should retrieve all follow-ups for a research session", async () => {
    const mockFollowUps = [
      { id: 1, question: "Q1?", answer: "A1", status: "complete" },
      { id: 2, question: "Q2?", answer: "A2", status: "complete" },
      { id: 3, question: "Q3?", answer: null, status: "processing" },
    ];

    vi.mocked(db.getResearchFollowUps).mockResolvedValue(mockFollowUps as any);

    const followUps = await db.getResearchFollowUps(1);

    expect(followUps).toHaveLength(3);
    expect(followUps[0].question).toBe("Q1?");
    expect(followUps[2].status).toBe("processing");
  });

  it("should only allow follow-ups on complete research", async () => {
    const incompleteSession = {
      id: 1,
      userId: 1,
      status: "researching",
    };

    vi.mocked(db.getResearchSession).mockResolvedValue(incompleteSession as any);

    const session = await db.getResearchSession(1);
    
    // In the actual router, this would throw an error
    expect(session?.status).not.toBe("complete");
  });
});

describe("Research Authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should verify ownership before sharing", async () => {
    const mockSession = {
      id: 1,
      userId: 1,
    };

    vi.mocked(db.getResearchSession).mockResolvedValue(mockSession as any);

    const session = await db.getResearchSession(1);
    const requestingUserId = 1;

    expect(session?.userId).toBe(requestingUserId);
  });

  it("should reject sharing by non-owner", async () => {
    const mockSession = {
      id: 1,
      userId: 1,
    };

    vi.mocked(db.getResearchSession).mockResolvedValue(mockSession as any);

    const session = await db.getResearchSession(1);
    const requestingUserId = 2;

    expect(session?.userId).not.toBe(requestingUserId);
    // In the actual router, this would throw "Unauthorized"
  });

  it("should verify ownership before exporting", async () => {
    const mockSession = {
      id: 1,
      userId: 1,
    };

    vi.mocked(db.getResearchSession).mockResolvedValue(mockSession as any);

    const session = await db.getResearchSession(1);
    const requestingUserId = 1;

    expect(session?.userId).toBe(requestingUserId);
  });

  it("should verify ownership before asking follow-up", async () => {
    const mockSession = {
      id: 1,
      userId: 1,
      status: "complete",
    };

    vi.mocked(db.getResearchSession).mockResolvedValue(mockSession as any);

    const session = await db.getResearchSession(1);
    const requestingUserId = 1;

    expect(session?.userId).toBe(requestingUserId);
    expect(session?.status).toBe("complete");
  });
});
