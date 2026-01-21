// ============================================================================
// DTO Types (API Contracts)
// ============================================================================

/**
 * Flashcard source type
 */
export type FlashcardSourceDto = "manual" | "ai" | "ai-edited";

/**
 * Flashcard response from API
 */
export interface FlashcardResponseDto {
  id: string; // UUID
  deckId: string; // UUID
  front: string;
  back: string;
  source: FlashcardSourceDto;
  generationId: string | null;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * Paged flashcard response from API
 */
export interface PagedFlashcardResponseDto {
  content: FlashcardResponseDto[];
  page: {
    number: number; // Current page number (0-based)
    size: number; // Page size
    totalElements: number; // Total number of elements
    totalPages: number; // Total number of pages
  };
}

/**
 * Request to create a new flashcard
 */
export interface CreateFlashcardRequestDto {
  front: string; // 1-500 characters after trim
  back: string; // 1-500 characters after trim
}

/**
 * Request to update an existing flashcard
 */
export interface UpdateFlashcardRequestDto {
  front: string; // 1-500 characters after trim
  back: string; // 1-500 characters after trim
}

// ============================================================================
// ViewModel Types (UI State)
// ============================================================================

/**
 * Flashcard source for UI rendering
 */
export type FlashcardSourceVm = "manual" | "ai" | "ai-edited";

/**
 * Flashcard list item for UI rendering
 */
export interface FlashcardListItemVm {
  id: string;
  deckId: string;
  front: string;
  back: string;
  source: FlashcardSourceVm;
  generationId: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * State of the flashcards list view
 */
export interface FlashcardsListStateVm {
  items: FlashcardListItemVm[];
  isLoading: boolean;
  error: string | null;
  page: {
    number: number;
    size: number;
    totalElements: number;
    totalPages: number;
  } | null;
}

/**
 * Form state for flashcard (create/edit)
 */
export interface FlashcardFormVm {
  front: string;
  back: string;
}

/**
 * Form errors for flashcard
 */
export interface FlashcardFormErrorsVm {
  front?: string;
  back?: string;
  formError?: string | null;
}
