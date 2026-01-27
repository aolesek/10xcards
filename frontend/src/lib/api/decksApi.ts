import { authenticatedFetch } from "./authenticatedClient";
import type {
  PagedDeckResponseDto,
  DeckResponseDto,
  CreateDeckRequestDto,
  UpdateDeckRequestDto,
} from "@/lib/decks/deckTypes";
import type { StudySessionResponseDto } from "@/lib/study/studyTypes";

const API_BASE = "/api/decks";

/**
 * Parameters for listing decks
 */
export interface ListDecksParams {
  page?: number; // 0-based page number, default: 0
  size?: number; // Page size, default: 100
  sort?: string; // Sort criteria, e.g., "createdAt,desc"
}

/**
 * List user's decks (paginated)
 * Automatically handles token refresh if expired
 * @param params - Optional pagination and sorting parameters
 * @throws ApiError with status 401 (unauthorized), 500 (server error)
 */
export async function listDecks(
  params?: ListDecksParams
): Promise<PagedDeckResponseDto> {
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
  
  const url = queryParams.toString()
    ? `${API_BASE}?${queryParams.toString()}`
    : API_BASE;
  
  return authenticatedFetch<PagedDeckResponseDto>(url, {
    method: "GET",
  });
}

/**
 * Create a new deck
 * Automatically handles token refresh if expired
 * @param dto - Deck creation data
 * @throws ApiError with status 400 (validation), 401 (unauthorized), 409 (duplicate name)
 */
export async function createDeck(
  dto: CreateDeckRequestDto
): Promise<DeckResponseDto> {
  return authenticatedFetch<DeckResponseDto>(API_BASE, {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

/**
 * Update an existing deck
 * Automatically handles token refresh if expired
 * @param deckId - UUID of the deck to update
 * @param dto - Deck update data
 * @throws ApiError with status 400 (validation), 401 (unauthorized), 404 (not found), 409 (duplicate name)
 */
export async function updateDeck(
  deckId: string,
  dto: UpdateDeckRequestDto
): Promise<DeckResponseDto> {
  return authenticatedFetch<DeckResponseDto>(`${API_BASE}/${deckId}`, {
    method: "PUT",
    body: JSON.stringify(dto),
  });
}

/**
 * Get a single deck by ID
 * Automatically handles token refresh if expired
 * @param deckId - UUID of the deck to retrieve
 * @throws ApiError with status 401 (unauthorized), 404 (not found)
 */
export async function getDeck(
  deckId: string
): Promise<DeckResponseDto> {
  return authenticatedFetch<DeckResponseDto>(`${API_BASE}/${deckId}`, {
    method: "GET",
  });
}

/**
 * Delete a deck (also deletes all associated flashcards)
 * Automatically handles token refresh if expired
 * @param deckId - UUID of the deck to delete
 * @throws ApiError with status 401 (unauthorized), 404 (not found)
 */
export async function deleteDeck(
  deckId: string
): Promise<void> {
  await authenticatedFetch<void>(`${API_BASE}/${deckId}`, {
    method: "DELETE",
  });
}

/**
 * Get a study session for a deck
 * GET /api/decks/{deckId}/study?shuffle=true
 * Automatically handles token refresh if expired
 * @param deckId - UUID of the deck
 * @param params - Optional query params
 * @throws ApiError with status 401 (unauthorized), 403/404 (forbidden/not found), 500 (server error)
 */
export async function getStudySession(
  deckId: string,
  params?: { shuffle?: boolean }
): Promise<StudySessionResponseDto> {
  const queryParams = new URLSearchParams();
  queryParams.append("shuffle", String(params?.shuffle ?? true));

  return authenticatedFetch<StudySessionResponseDto>(`${API_BASE}/${deckId}/study?${queryParams.toString()}`, {
    method: "GET",
  });
}
