import { describe, it, expect } from "vitest";
import {
  RESEARCH_TEMPLATES,
  RESEARCH_CATEGORIES,
  searchTemplates,
  getTemplatesByCategory,
} from "../client/src/data/researchTemplates";

describe("Research Templates", () => {
  describe("RESEARCH_TEMPLATES", () => {
    it("should have at least 15 templates", () => {
      expect(RESEARCH_TEMPLATES.length).toBeGreaterThanOrEqual(15);
    });

    it("should have all required fields for each template", () => {
      RESEARCH_TEMPLATES.forEach(template => {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.topic).toBeDefined();
        expect(template.category).toBeDefined();
        expect(template.depth).toBeDefined();
        expect(template.tags).toBeDefined();
        expect(template.icon).toBeDefined();
      });
    });

    it("should have unique IDs for all templates", () => {
      const ids = RESEARCH_TEMPLATES.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should have valid depth values", () => {
      const validDepths = ["quick", "standard", "deep"];
      RESEARCH_TEMPLATES.forEach(template => {
        expect(validDepths).toContain(template.depth);
      });
    });

    it("should have valid category values", () => {
      const validCategories = Object.keys(RESEARCH_CATEGORIES);
      RESEARCH_TEMPLATES.forEach(template => {
        expect(validCategories).toContain(template.category);
      });
    });

    it("should have at least one tag per template", () => {
      RESEARCH_TEMPLATES.forEach(template => {
        expect(template.tags.length).toBeGreaterThan(0);
      });
    });
  });

  describe("RESEARCH_CATEGORIES", () => {
    it("should have all 5 categories", () => {
      expect(Object.keys(RESEARCH_CATEGORIES)).toHaveLength(5);
    });

    it("should have nvidia-hardware category", () => {
      expect(RESEARCH_CATEGORIES["nvidia-hardware"]).toBeDefined();
      expect(RESEARCH_CATEGORIES["nvidia-hardware"].name).toBe(
        "NVIDIA Hardware"
      );
    });

    it("should have ai-pipelines category", () => {
      expect(RESEARCH_CATEGORIES["ai-pipelines"]).toBeDefined();
      expect(RESEARCH_CATEGORIES["ai-pipelines"].name).toBe("AI/ML Pipelines");
    });

    it("should have all required fields for each category", () => {
      Object.values(RESEARCH_CATEGORIES).forEach(category => {
        expect(category.name).toBeDefined();
        expect(category.description).toBeDefined();
        expect(category.icon).toBeDefined();
      });
    });
  });

  describe("searchTemplates", () => {
    it("should find templates by name", () => {
      const results = searchTemplates("DGX SPARK");
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(t => t.name.includes("DGX SPARK"))).toBe(true);
    });

    it("should find templates by tag", () => {
      const results = searchTemplates("RTX 4090");
      expect(results.length).toBeGreaterThan(0);
    });

    it("should find templates by description", () => {
      const results = searchTemplates("personal AI supercomputer");
      expect(results.length).toBeGreaterThan(0);
    });

    it("should be case insensitive", () => {
      const results1 = searchTemplates("nvidia");
      const results2 = searchTemplates("NVIDIA");
      expect(results1.length).toBe(results2.length);
    });

    it("should return empty array for no matches", () => {
      const results = searchTemplates("xyznonexistent123");
      expect(results).toHaveLength(0);
    });
  });

  describe("getTemplatesByCategory", () => {
    it("should return templates for nvidia-hardware category", () => {
      const results = getTemplatesByCategory("nvidia-hardware");
      expect(results.length).toBeGreaterThan(0);
      results.forEach(t => {
        expect(t.category).toBe("nvidia-hardware");
      });
    });

    it("should return templates for ai-pipelines category", () => {
      const results = getTemplatesByCategory("ai-pipelines");
      expect(results.length).toBeGreaterThan(0);
      results.forEach(t => {
        expect(t.category).toBe("ai-pipelines");
      });
    });

    it("should return templates for infrastructure category", () => {
      const results = getTemplatesByCategory("infrastructure");
      expect(results.length).toBeGreaterThan(0);
      results.forEach(t => {
        expect(t.category).toBe("infrastructure");
      });
    });

    it("should return templates for market-analysis category", () => {
      const results = getTemplatesByCategory("market-analysis");
      expect(results.length).toBeGreaterThan(0);
      results.forEach(t => {
        expect(t.category).toBe("market-analysis");
      });
    });

    it("should return templates for tech-trends category", () => {
      const results = getTemplatesByCategory("tech-trends");
      expect(results.length).toBeGreaterThan(0);
      results.forEach(t => {
        expect(t.category).toBe("tech-trends");
      });
    });
  });

  describe("NVIDIA DGX SPARK Templates", () => {
    it("should have DGX SPARK overview template", () => {
      const template = RESEARCH_TEMPLATES.find(
        t => t.id === "dgx-spark-overview"
      );
      expect(template).toBeDefined();
      expect(template?.depth).toBe("deep");
      expect(template?.topic).toContain("DGX SPARK");
    });

    it("should have DGX SPARK vs Cloud template", () => {
      const template = RESEARCH_TEMPLATES.find(
        t => t.id === "dgx-spark-vs-cloud"
      );
      expect(template).toBeDefined();
      expect(template?.topic).toContain("cloud");
    });
  });

  describe("x86 4090 Pipeline Templates", () => {
    it("should have x86 + RTX 4090 pipeline template", () => {
      const template = RESEARCH_TEMPLATES.find(
        t => t.id === "x86-4090-pipeline"
      );
      expect(template).toBeDefined();
      expect(template?.category).toBe("ai-pipelines");
      expect(template?.topic).toContain("x86");
      expect(template?.topic).toContain("RTX 4090");
    });

    it("should have RTX 4090 inference optimization template", () => {
      const template = RESEARCH_TEMPLATES.find(
        t => t.id === "4090-inference-optimization"
      );
      expect(template).toBeDefined();
      expect(template?.topic).toContain("TensorRT");
    });
  });
});
