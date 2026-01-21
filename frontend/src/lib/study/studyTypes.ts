// ============================================================================
// DTO Types (API Contracts)
// ============================================================================

/**
 * Flashcard used in study mode (minimal contract)
 */
export interface StudyFlashcardDto {
  id: string; // UUID
  front: string;
  back: string;
}

/**
 * Study session response from API
 * GET /api/decks/{deckId}/study
 */
export interface StudySessionResponseDto {
  deckId: string; // UUID
  deckName: string;
  totalCards: number;
  flashcards: StudyFlashcardDto[];
}

// ============================================================================
// ViewModel Types (UI State)
// ============================================================================

export interface StudyFlashcardVm {
  id: string;
  front: string;
  back: string;
}

export interface StudySessionVm {
  deckId: string;
  deckName: string;
  totalCards: number;
  cards: StudyFlashcardVm[];
}

export type StudyModeVm = "loading" | "error" | "empty" | "in-progress" | "summary";

export interface StudyUiStateVm {
  isLoading: boolean;
  error: string | null;
  session: StudySessionVm | null;
  currentIndex: number; // 0-based
  isRevealed: boolean;
  mode: StudyModeVm;
}

