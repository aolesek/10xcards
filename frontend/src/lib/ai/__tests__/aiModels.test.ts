import { describe, it, expect } from "vitest";
import {
  isValidAIModelId,
  AI_MODEL_OPTIONS,
  DEFAULT_AI_MODEL,
  AI_MODEL_IDS,
} from "../aiModels";

describe("aiModels", () => {
  describe("AI_MODEL_OPTIONS", () => {
    it("should contain at least 6 models", () => {
      expect(AI_MODEL_OPTIONS.length).toBeGreaterThanOrEqual(6);
    });

    it("should have unique values", () => {
      const values = AI_MODEL_OPTIONS.map((opt) => opt.value);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });

    it("should have non-empty labels", () => {
      AI_MODEL_OPTIONS.forEach((opt) => {
        expect(opt.label.trim().length).toBeGreaterThan(0);
      });
    });
  });

  describe("DEFAULT_AI_MODEL", () => {
    it("should be a valid model from options", () => {
      const values = AI_MODEL_OPTIONS.map((opt) => opt.value);
      expect(values).toContain(DEFAULT_AI_MODEL);
    });

    it("should be openai/gpt-4o-mini", () => {
      expect(DEFAULT_AI_MODEL).toBe("openai/gpt-4o-mini");
    });
  });

  describe("AI_MODEL_IDS", () => {
    it("should contain all model values", () => {
      AI_MODEL_OPTIONS.forEach((opt) => {
        expect(AI_MODEL_IDS.has(opt.value)).toBe(true);
      });
    });

    it("should have same size as options", () => {
      expect(AI_MODEL_IDS.size).toBe(AI_MODEL_OPTIONS.length);
    });
  });

  describe("isValidAIModelId", () => {
    it("should return true for valid model IDs", () => {
      expect(isValidAIModelId("openai/gpt-4o-mini")).toBe(true);
      expect(isValidAIModelId("google/gemini-2.5-flash")).toBe(true);
      expect(isValidAIModelId("anthropic/claude-sonnet-4.5")).toBe(true);
    });

    it("should return false for invalid model IDs", () => {
      expect(isValidAIModelId("invalid-model")).toBe(false);
      expect(isValidAIModelId("")).toBe(false);
      expect(isValidAIModelId("openai/gpt-999")).toBe(false);
    });

    it("should return false for non-string values", () => {
      expect(isValidAIModelId(null as unknown as string)).toBe(false);
      expect(isValidAIModelId(undefined as unknown as string)).toBe(false);
      expect(isValidAIModelId(123 as unknown as string)).toBe(false);
    });
  });
});
