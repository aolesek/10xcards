import { describe, it, expect } from "vitest";
import {
  isValidAIGenerationMode,
  AI_GENERATION_MODE_OPTIONS,
  DEFAULT_AI_GENERATION_MODE,
  AI_GENERATION_MODE_VALUES,
} from "../aiGenerationModes";

describe("aiGenerationModes", () => {
  describe("AI_GENERATION_MODE_OPTIONS", () => {
    it("should contain 7 modes (1 knowledge + 6 language levels)", () => {
      expect(AI_GENERATION_MODE_OPTIONS.length).toBe(7);
    });

    it("should have unique values", () => {
      const values = AI_GENERATION_MODE_OPTIONS.map((opt) => opt.value);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });

    it("should contain KNOWLEDGE_ASSIMILATION mode", () => {
      const values = AI_GENERATION_MODE_OPTIONS.map((opt) => opt.value);
      expect(values).toContain("KNOWLEDGE_ASSIMILATION");
    });

    it("should contain all CEFR language levels (A1-C2)", () => {
      const values = AI_GENERATION_MODE_OPTIONS.map((opt) => opt.value);
      const languageLevels = [
        "LANGUAGE_A1",
        "LANGUAGE_A2",
        "LANGUAGE_B1",
        "LANGUAGE_B2",
        "LANGUAGE_C1",
        "LANGUAGE_C2",
      ];
      languageLevels.forEach((level) => {
        expect(values).toContain(level);
      });
    });

    it("should have non-empty labels", () => {
      AI_GENERATION_MODE_OPTIONS.forEach((opt) => {
        expect(opt.label.trim().length).toBeGreaterThan(0);
      });
    });
  });

  describe("DEFAULT_AI_GENERATION_MODE", () => {
    it("should be a valid mode from options", () => {
      const values = AI_GENERATION_MODE_OPTIONS.map((opt) => opt.value);
      expect(values).toContain(DEFAULT_AI_GENERATION_MODE);
    });

    it("should be KNOWLEDGE_ASSIMILATION", () => {
      expect(DEFAULT_AI_GENERATION_MODE).toBe("KNOWLEDGE_ASSIMILATION");
    });
  });

  describe("AI_GENERATION_MODE_VALUES", () => {
    it("should contain all mode values", () => {
      AI_GENERATION_MODE_OPTIONS.forEach((opt) => {
        expect(AI_GENERATION_MODE_VALUES.has(opt.value)).toBe(true);
      });
    });

    it("should have same size as options", () => {
      expect(AI_GENERATION_MODE_VALUES.size).toBe(
        AI_GENERATION_MODE_OPTIONS.length
      );
    });
  });

  describe("isValidAIGenerationMode", () => {
    it("should return true for KNOWLEDGE_ASSIMILATION", () => {
      expect(isValidAIGenerationMode("KNOWLEDGE_ASSIMILATION")).toBe(true);
    });

    it("should return true for all language levels", () => {
      expect(isValidAIGenerationMode("LANGUAGE_A1")).toBe(true);
      expect(isValidAIGenerationMode("LANGUAGE_A2")).toBe(true);
      expect(isValidAIGenerationMode("LANGUAGE_B1")).toBe(true);
      expect(isValidAIGenerationMode("LANGUAGE_B2")).toBe(true);
      expect(isValidAIGenerationMode("LANGUAGE_C1")).toBe(true);
      expect(isValidAIGenerationMode("LANGUAGE_C2")).toBe(true);
    });

    it("should return false for invalid modes", () => {
      expect(isValidAIGenerationMode("INVALID_MODE")).toBe(false);
      expect(isValidAIGenerationMode("")).toBe(false);
      expect(isValidAIGenerationMode("LANGUAGE_D1")).toBe(false);
    });

    it("should return false for non-string values", () => {
      expect(isValidAIGenerationMode(null as unknown as string)).toBe(false);
      expect(isValidAIGenerationMode(undefined as unknown as string)).toBe(false);
      expect(isValidAIGenerationMode(123 as unknown as string)).toBe(false);
    });

    it("should be case-sensitive", () => {
      expect(isValidAIGenerationMode("knowledge_assimilation")).toBe(false);
      expect(isValidAIGenerationMode("language_a1")).toBe(false);
    });
  });
});
