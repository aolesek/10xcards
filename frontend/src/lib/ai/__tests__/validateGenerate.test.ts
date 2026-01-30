import { describe, it, expect } from "vitest";
import { validateGenerateForm } from "../validateGenerate";
import type { AIGenerateFormVm } from "../aiTypes";

describe("validateGenerateForm", () => {
  // Valid form helper
  const createValidForm = (): AIGenerateFormVm => ({
    deckId: "deck-123",
    sourceText: "A".repeat(500), // Minimum valid length
    requestedCandidatesCount: 10,
    model: "openai/gpt-4o-mini",
    mode: "KNOWLEDGE_ASSIMILATION",
  });

  describe("deckId validation", () => {
    it("should return error when deckId is empty", () => {
      const form = { ...createValidForm(), deckId: "" };
      const errors = validateGenerateForm(form);
      expect(errors.deckId).toBe("Wybierz talię");
    });

    it("should return error when deckId is whitespace only", () => {
      const form = { ...createValidForm(), deckId: "   " };
      const errors = validateGenerateForm(form);
      expect(errors.deckId).toBe("Wybierz talię");
    });

    it("should not return error for valid deckId", () => {
      const form = createValidForm();
      const errors = validateGenerateForm(form);
      expect(errors.deckId).toBeUndefined();
    });
  });

  describe("model validation", () => {
    it("should return error when model is empty", () => {
      const form = { ...createValidForm(), model: "" as unknown as string };
      const errors = validateGenerateForm(form);
      expect(errors.model).toBe("Wybierz model AI");
    });

    it("should return error when model is invalid", () => {
      const form = { ...createValidForm(), model: "invalid-model" as unknown as string };
      const errors = validateGenerateForm(form);
      expect(errors.model).toBe("Wybierz poprawny model AI");
    });

    it("should not return error for valid model", () => {
      const form = { ...createValidForm(), model: "google/gemini-2.5-flash" };
      const errors = validateGenerateForm(form);
      expect(errors.model).toBeUndefined();
    });
  });

  describe("mode validation", () => {
    it("should return error when mode is empty", () => {
      const form = { ...createValidForm(), mode: "" as unknown as string };
      const errors = validateGenerateForm(form);
      expect(errors.mode).toBe("Wybierz tryb generacji");
    });

    it("should return error when mode is invalid", () => {
      const form = { ...createValidForm(), mode: "INVALID_MODE" as unknown as string };
      const errors = validateGenerateForm(form);
      expect(errors.mode).toBe("Wybierz poprawny tryb generacji");
    });

    it("should not return error for valid mode", () => {
      const form = { ...createValidForm(), mode: "LANGUAGE_B2" };
      const errors = validateGenerateForm(form);
      expect(errors.mode).toBeUndefined();
    });
  });

  describe("sourceText validation", () => {
    it("should return error when sourceText is empty", () => {
      const form = { ...createValidForm(), sourceText: "" };
      const errors = validateGenerateForm(form);
      expect(errors.sourceText).toBe("Tekst źródłowy jest wymagany");
    });

    it("should return error when sourceText is whitespace only", () => {
      const form = { ...createValidForm(), sourceText: "   \n\t  " };
      const errors = validateGenerateForm(form);
      expect(errors.sourceText).toBe("Tekst źródłowy jest wymagany");
    });

    it("should return error when sourceText is below minimum (500 chars)", () => {
      const form = { ...createValidForm(), sourceText: "A".repeat(499) };
      const errors = validateGenerateForm(form);
      expect(errors.sourceText).toBe("Tekst musi mieć co najmniej 500 znaków");
    });

    it("should return error when sourceText exceeds maximum (10000 chars)", () => {
      const form = { ...createValidForm(), sourceText: "A".repeat(10001) };
      const errors = validateGenerateForm(form);
      expect(errors.sourceText).toBe("Tekst może mieć maksymalnie 10 000 znaków");
    });

    it("should accept sourceText at minimum boundary (500 chars)", () => {
      const form = { ...createValidForm(), sourceText: "A".repeat(500) };
      const errors = validateGenerateForm(form);
      expect(errors.sourceText).toBeUndefined();
    });

    it("should accept sourceText at maximum boundary (10000 chars)", () => {
      const form = { ...createValidForm(), sourceText: "A".repeat(10000) };
      const errors = validateGenerateForm(form);
      expect(errors.sourceText).toBeUndefined();
    });

    it("should trim whitespace before validation", () => {
      const form = {
        ...createValidForm(),
        sourceText: "  " + "A".repeat(500) + "  ",
      };
      const errors = validateGenerateForm(form);
      expect(errors.sourceText).toBeUndefined();
    });
  });

  describe("requestedCandidatesCount validation", () => {
    it("should return error when count is not a number", () => {
      const form = { ...createValidForm(), requestedCandidatesCount: NaN };
      const errors = validateGenerateForm(form);
      expect(errors.requestedCandidatesCount).toBe("Podaj liczbę fiszek");
    });

    it("should return error when count is not an integer", () => {
      const form = { ...createValidForm(), requestedCandidatesCount: 10.5 };
      const errors = validateGenerateForm(form);
      expect(errors.requestedCandidatesCount).toBe(
        "Liczba fiszek musi być liczbą całkowitą"
      );
    });

    it("should return error when count is below minimum (1)", () => {
      const form = { ...createValidForm(), requestedCandidatesCount: 0 };
      const errors = validateGenerateForm(form);
      expect(errors.requestedCandidatesCount).toBe("Minimum 1 fiszka");
    });

    it("should return error when count exceeds maximum (100)", () => {
      const form = { ...createValidForm(), requestedCandidatesCount: 101 };
      const errors = validateGenerateForm(form);
      expect(errors.requestedCandidatesCount).toBe("Maksymalnie 100 fiszek");
    });

    it("should accept count at minimum boundary (1)", () => {
      const form = { ...createValidForm(), requestedCandidatesCount: 1 };
      const errors = validateGenerateForm(form);
      expect(errors.requestedCandidatesCount).toBeUndefined();
    });

    it("should accept count at maximum boundary (100)", () => {
      const form = { ...createValidForm(), requestedCandidatesCount: 100 };
      const errors = validateGenerateForm(form);
      expect(errors.requestedCandidatesCount).toBeUndefined();
    });
  });

  describe("complete form validation", () => {
    it("should return empty object for valid form", () => {
      const form = createValidForm();
      const errors = validateGenerateForm(form);
      expect(errors).toEqual({});
    });

    it("should return multiple errors for invalid form", () => {
      const form: AIGenerateFormVm = {
        deckId: "",
        sourceText: "too short",
        requestedCandidatesCount: 0,
        model: "" as unknown as string,
        mode: "" as unknown as string,
      };
      const errors = validateGenerateForm(form);

      expect(errors.deckId).toBeDefined();
      expect(errors.sourceText).toBeDefined();
      expect(errors.requestedCandidatesCount).toBeDefined();
      expect(errors.model).toBeDefined();
      expect(errors.mode).toBeDefined();
    });
  });
});
