// ============================================================================
// DTO Types (API Contracts)
// ============================================================================

import type { AIModelId } from "./aiModels";

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
  requestedCandidatesCount: number; // 1-100, default 10
  model: AIModelId; // AI model to use for generation
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
  requestedCandidatesCount: number;
  model: AIModelId;
}

/**
 * AI Generate form errors
 */
export interface AIGenerateFormErrorsVm {
  deckId?: string;
  sourceText?: string;
  requestedCandidatesCount?: string;
  model?: string;
  formError?: string | null;
}

/**
 * Navigation state passed to /ai/loading
 */
export interface AIGenerateNavigationState {
  deckId: string;
  sourceText: string; // raw text from textarea; loading view will trim + validate
  requestedCandidatesCount: number;
  model: AIModelId;
}

/**
 * Single candidate update for PATCH request
 */
export interface CandidateUpdateDto {
  id: string; // UUID
  status: "accepted" | "rejected" | "edited";
  editedFront?: string | null;
  editedBack?: string | null;
}

/**
 * Request to update candidates statuses
 */
export interface UpdateCandidatesRequestDto {
  candidates: CandidateUpdateDto[]; // non-empty array
}

/**
 * Response from updating candidates
 */
export interface UpdateCandidatesResponseDto {
  id: string; // generation ID
  updatedCandidatesCount: number;
  updatedAt: string; // ISO 8601
}

/**
 * Response from saving candidates to deck
 */
export interface SaveCandidatesResponseDto {
  savedCount: number;
  flashcardIds: string[]; // UUIDs of created flashcards
}

/**
 * Candidate view model for UI rendering
 */
export interface CandidateVm {
  id: string;
  front: string;
  back: string;
  status: CandidateStatusDto;
  editedFront: string | null;
  editedBack: string | null;
  displayFront: string; // derived: editedFront ?? front
  displayBack: string; // derived: editedBack ?? back
}

/**
 * AI Review view model (generation with candidates)
 */
export interface AIReviewVm {
  generationId: string;
  deckId: string | null;
  aiModel: string;
  candidates: CandidateVm[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Edit candidate form state
 */
export interface EditCandidateFormVm {
  editedFront: string;
  editedBack: string;
  errors?: {
    editedFront?: string;
    editedBack?: string;
    formError?: string;
  };
}

// ============================================================================
// AI Generations History Types
// ============================================================================

/**
 * Paged AI Generation response from API
 */
export interface PagedAIGenerationResponseDto {
  content: AIGenerationResponseDto[];
  page: PageMetaDto;
}

/**
 * Page metadata from API (re-exported from deckTypes)
 */
export interface PageMetaDto {
  number: number; // Current page number (0-based)
  size: number; // Page size
  totalElements: number; // Total number of elements
  totalPages: number; // Total number of pages
}

/**
 * AI Generation History row view model
 */
export interface AIGenerationHistoryRowVm {
  id: string; // UUID
  createdAt: string; // ISO 8601
  createdAtLabel: string; // Formatted date for UI
  aiModel: string;
  sourceTextHash: string;
  sourceTextHashShort: string; // Shortened hash (e.g., first 12 chars)
  sourceTextLength: number;
  generatedCandidatesCount: number;
  acceptedOrEditedCandidatesCount: number | null; // Null if candidates unavailable
}

/**
 * AI Generations History state view model
 */
export interface AIGenerationsHistoryStateVm {
  rows: AIGenerationHistoryRowVm[];
  isLoading: boolean;
  error: string | null;
  page: PageMetaDto | null;
}
