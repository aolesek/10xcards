import { fetchJson } from "./httpClient";
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
 * @param accessToken - JWT access token
 * @param deckId - UUID of the deck
 * @param params - Optional pagination, sorting, and filtering parameters
 * @throws ApiError with status 401 (unauthorized), 404 (deck not found), 500 (server error)
 */
export async function listFlashcardsInDeck(
  accessToken: string,
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
  
  return fetchJson<PagedFlashcardResponseDto>(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

/**
 * Get a single flashcard by ID
 * @param accessToken - JWT access token
 * @param flashcardId - UUID of the flashcard to retrieve
 * @throws ApiError with status 401 (unauthorized), 404 (not found)
 */
export async function getFlashcard(
  accessToken: string,
  flashcardId: string
): Promise<FlashcardResponseDto> {
  return fetchJson<FlashcardResponseDto>(`${API_BASE_FLASHCARDS}/${flashcardId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

/**
 * Create a new flashcard in a deck
 * @param accessToken - JWT access token
 * @param deckId - UUID of the deck to add the flashcard to
 * @param dto - Flashcard creation data
 * @throws ApiError with status 400 (validation), 401 (unauthorized), 404 (deck not found)
 */
export async function createFlashcard(
  accessToken: string,
  deckId: string,
  dto: CreateFlashcardRequestDto
): Promise<FlashcardResponseDto> {
  return fetchJson<FlashcardResponseDto>(`${API_BASE_DECKS}/${deckId}/flashcards`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(dto),
  });
}

/**
 * Update an existing flashcard
 * @param accessToken - JWT access token
 * @param flashcardId - UUID of the flashcard to update
 * @param dto - Flashcard update data
 * @throws ApiError with status 400 (validation), 401 (unauthorized), 404 (not found)
 */
export async function updateFlashcard(
  accessToken: string,
  flashcardId: string,
  dto: UpdateFlashcardRequestDto
): Promise<FlashcardResponseDto> {
  return fetchJson<FlashcardResponseDto>(`${API_BASE_FLASHCARDS}/${flashcardId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(dto),
  });
}

/**
 * Delete a flashcard
 * @param accessToken - JWT access token
 * @param flashcardId - UUID of the flashcard to delete
 * @throws ApiError with status 401 (unauthorized), 404 (not found)
 */
export async function deleteFlashcard(
  accessToken: string,
  flashcardId: string
): Promise<void> {
  await fetchJson<void>(`${API_BASE_FLASHCARDS}/${flashcardId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
