import { authenticatedFetch } from "./authenticatedClient";
import type {
  PagedFlashcardResponseDto,
  FlashcardResponseDto,
  CreateFlashcardRequestDto,
  UpdateFlashcardRequestDto,
} from "@/lib/flashcards/flashcardTypes";

const API_BASE_DECKS = "/api/decks";
const API_BASE_FLASHCARDS = "/api/flashcards";

/**
 * Parameters for listing flashcards in a deck
 */
export interface ListFlashcardsParams {
  page?: number; // 0-based page number, default: 0
  size?: number; // Page size, default: 50, max: 100
  sort?: string; // Sort criteria, e.g., "createdAt,desc"
  source?: "manual" | "ai" | "ai-edited"; // Filter by source (optional)
}

/**
 * List flashcards in a specific deck (paginated)
 * Automatically handles token refresh if expired
 * @param deckId - UUID of the deck
 * @param params - Optional pagination, sorting, and filtering parameters
 * @throws ApiError with status 401 (unauthorized), 404 (deck not found), 500 (server error)
 */
export async function listFlashcardsInDeck(
  deckId: string,
  params?: ListFlashcardsParams
): Promise<PagedFlashcardResponseDto> {
  const queryParams = new URLSearchParams();
  
  if (params?.page !== undefined) {
    queryParams.append("page", params.page.toString());
  }
  
  if (params?.size !== undefined) {
    queryParams.append("size", params.size.toString());
  }
  
  if (params?.sort) {
    queryParams.append("sort", params.sort);
  }
  
  if (params?.source) {
    queryParams.append("source", params.source);
  }
  
  const url = queryParams.toString()
    ? `${API_BASE_DECKS}/${deckId}/flashcards?${queryParams.toString()}`
    : `${API_BASE_DECKS}/${deckId}/flashcards`;
  
  return authenticatedFetch<PagedFlashcardResponseDto>(url, {
    method: "GET",
  });
}

/**
 * Get a single flashcard by ID
 * Automatically handles token refresh if expired
 * @param flashcardId - UUID of the flashcard to retrieve
 * @throws ApiError with status 401 (unauthorized), 404 (not found)
 */
export async function getFlashcard(
  flashcardId: string
): Promise<FlashcardResponseDto> {
  return authenticatedFetch<FlashcardResponseDto>(`${API_BASE_FLASHCARDS}/${flashcardId}`, {
    method: "GET",
  });
}

/**
 * Create a new flashcard in a deck
 * Automatically handles token refresh if expired
 * @param deckId - UUID of the deck to add the flashcard to
 * @param dto - Flashcard creation data
 * @throws ApiError with status 400 (validation), 401 (unauthorized), 404 (deck not found)
 */
export async function createFlashcard(
  deckId: string,
  dto: CreateFlashcardRequestDto
): Promise<FlashcardResponseDto> {
  return authenticatedFetch<FlashcardResponseDto>(`${API_BASE_DECKS}/${deckId}/flashcards`, {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

/**
 * Update an existing flashcard
 * Automatically handles token refresh if expired
 * @param flashcardId - UUID of the flashcard to update
 * @param dto - Flashcard update data
 * @throws ApiError with status 400 (validation), 401 (unauthorized), 404 (not found)
 */
export async function updateFlashcard(
  flashcardId: string,
  dto: UpdateFlashcardRequestDto
): Promise<FlashcardResponseDto> {
  return authenticatedFetch<FlashcardResponseDto>(`${API_BASE_FLASHCARDS}/${flashcardId}`, {
    method: "PUT",
    body: JSON.stringify(dto),
  });
}

/**
 * Delete a flashcard
 * Automatically handles token refresh if expired
 * @param flashcardId - UUID of the flashcard to delete
 * @throws ApiError with status 401 (unauthorized), 404 (not found)
 */
export async function deleteFlashcard(
  flashcardId: string
): Promise<void> {
  await authenticatedFetch<void>(`${API_BASE_FLASHCARDS}/${flashcardId}`, {
    method: "DELETE",
  });
}
