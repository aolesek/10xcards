import type { AIGenerateFormVm, AIGenerateFormErrorsVm } from "./aiTypes";

/**
 * Validate AI generate form
 * Used by both AIGenerateView and AILoadingView
 * @param form - Form data to validate
 * @returns Validation errors or empty object if valid
 */
export function validateGenerateForm(form: AIGenerateFormVm): AIGenerateFormErrorsVm {
  const errors: AIGenerateFormErrorsVm = {};

  // Validate deckId
  if (!form.deckId || form.deckId.trim().length === 0) {
    errors.deckId = "Wybierz talię";
  }

  // Validate sourceText
  const trimmedText = form.sourceText.trim();
  
  if (trimmedText.length === 0) {
    errors.sourceText = "Tekst źródłowy jest wymagany";
  } else if (trimmedText.length < 500) {
    errors.sourceText = "Tekst musi mieć co najmniej 500 znaków";
  } else if (trimmedText.length > 10000) {
    errors.sourceText = "Tekst może mieć maksymalnie 10 000 znaków";
  }

  // Validate requestedCandidatesCount
  if (typeof form.requestedCandidatesCount !== "number" || isNaN(form.requestedCandidatesCount)) {
    errors.requestedCandidatesCount = "Podaj liczbę fiszek";
  } else if (!Number.isInteger(form.requestedCandidatesCount)) {
    errors.requestedCandidatesCount = "Liczba fiszek musi być liczbą całkowitą";
  } else if (form.requestedCandidatesCount < 1) {
    errors.requestedCandidatesCount = "Minimum 1 fiszka";
  } else if (form.requestedCandidatesCount > 100) {
    errors.requestedCandidatesCount = "Maksymalnie 100 fiszek";
  }

  return errors;
}
