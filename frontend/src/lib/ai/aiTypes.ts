// ============================================================================
// DTO Types (API Contracts)
// ============================================================================

/**
 * Candidate status type
 */
export type CandidateStatusDto = "pending" | "accepted" | "rejected" | "edited";

/**
 * AI Generation Candidate from API
 */
export interface AIGenerationCandidateDto {
  id: string; // UUID
  front: string;
  back: string;
  status: CandidateStatusDto;
  editedFront: string | null;
  editedBack: string | null;
}

/**
 * Request to generate flashcards
 */
export interface GenerateFlashcardsRequestDto {
  deckId: string; // UUID
  sourceText: string; // 500-10000 characters after trim
}

/**
 * AI Generation response from API
 */
export interface AIGenerationResponseDto {
  id: string; // UUID
  deckId: string; // UUID
  aiModel: string;
  sourceTextHash: string;
  sourceTextLength: number;
  generatedCandidatesCount: number;
  candidates: AIGenerationCandidateDto[];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// ============================================================================
// ViewModel Types (UI State)
// ============================================================================

/**
 * Deck option for select dropdown
 */
export interface DeckOptionVm {
  value: string; // deckId
  label: string; // deck name
  flashcardCount?: number; // optional for UI display
}

/**
 * AI Generate form state
 */
export interface AIGenerateFormVm {
  deckId: string | "";
  sourceText: string;
}

/**
 * AI Generate form errors
 */
export interface AIGenerateFormErrorsVm {
  deckId?: string;
  sourceText?: string;
  formError?: string | null;
}

/**
 * Navigation state passed to /ai/loading
 */
export interface AIGenerateNavigationState {
  deckId: string;
  sourceText: string; // raw text from textarea; loading view will trim + validate
}
