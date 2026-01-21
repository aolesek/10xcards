// ============================================================================
// DTO Types (API Contracts)
// ============================================================================

/**
 * Deck response from API
 */
export interface DeckResponseDto {
  id: string; // UUID
  name: string;
  flashcardCount: number;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * Page metadata from API
 */
export interface PageMetaDto {
  number: number; // Current page number (0-based)
  size: number; // Page size
  totalElements: number; // Total number of elements
  totalPages: number; // Total number of pages
}

/**
 * Paged deck response from API
 */
export interface PagedDeckResponseDto {
  content: DeckResponseDto[];
  page: PageMetaDto;
}

/**
 * Request to create a new deck
 */
export interface CreateDeckRequestDto {
  name: string; // 1-100 characters after trim
}

/**
 * Request to update an existing deck
 */
export interface UpdateDeckRequestDto {
  name: string; // 1-100 characters after trim
}

// ============================================================================
// ViewModel Types (UI State)
// ============================================================================

/**
 * Deck list item for UI rendering
 */
export interface DeckListItemVm {
  id: string;
  name: string;
  flashcardCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * State of the decks list view
 */
export interface DecksListStateVm {
  items: DeckListItemVm[];
  isLoading: boolean;
  error: string | null;
  page: PageMetaDto | null;
}

/**
 * Form state for deck name (create/edit)
 */
export interface DeckNameFormVm {
  name: string;
}

/**
 * Form errors for deck name
 */
export interface DeckNameFormErrorsVm {
  name?: string;
  formError?: string | null;
}
