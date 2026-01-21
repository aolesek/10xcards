import { fetchJson } from "./httpClient";
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
 * @param accessToken - JWT access token
 * @param params - Optional pagination and sorting parameters
 * @throws ApiError with status 401 (unauthorized), 500 (server error)
 */
export async function listDecks(
  accessToken: string,
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
  
  return fetchJson<PagedDeckResponseDto>(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

/**
 * Create a new deck
 * @param accessToken - JWT access token
 * @param dto - Deck creation data
 * @throws ApiError with status 400 (validation), 401 (unauthorized), 409 (duplicate name)
 */
export async function createDeck(
  accessToken: string,
  dto: CreateDeckRequestDto
): Promise<DeckResponseDto> {
  return fetchJson<DeckResponseDto>(API_BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(dto),
  });
}

/**
 * Update an existing deck
 * @param accessToken - JWT access token
 * @param deckId - UUID of the deck to update
 * @param dto - Deck update data
 * @throws ApiError with status 400 (validation), 401 (unauthorized), 404 (not found), 409 (duplicate name)
 */
export async function updateDeck(
  accessToken: string,
  deckId: string,
  dto: UpdateDeckRequestDto
): Promise<DeckResponseDto> {
  return fetchJson<DeckResponseDto>(`${API_BASE}/${deckId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(dto),
  });
}

/**
 * Get a single deck by ID
 * @param accessToken - JWT access token
 * @param deckId - UUID of the deck to retrieve
 * @throws ApiError with status 401 (unauthorized), 404 (not found)
 */
export async function getDeck(
  accessToken: string,
  deckId: string
): Promise<DeckResponseDto> {
  return fetchJson<DeckResponseDto>(`${API_BASE}/${deckId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

/**
 * Delete a deck (also deletes all associated flashcards)
 * @param accessToken - JWT access token
 * @param deckId - UUID of the deck to delete
 * @throws ApiError with status 401 (unauthorized), 404 (not found)
 */
export async function deleteDeck(
  accessToken: string,
  deckId: string
): Promise<void> {
  await fetchJson<void>(`${API_BASE}/${deckId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

/**
 * Get a study session for a deck
 * GET /api/decks/{deckId}/study?shuffle=true
 * @param accessToken - JWT access token
 * @param deckId - UUID of the deck
 * @param params - Optional query params
 * @throws ApiError with status 401 (unauthorized), 403/404 (forbidden/not found), 500 (server error)
 */
export async function getStudySession(
  accessToken: string,
  deckId: string,
  params?: { shuffle?: boolean }
): Promise<StudySessionResponseDto> {
  const queryParams = new URLSearchParams();
  queryParams.append("shuffle", String(params?.shuffle ?? true));

  return fetchJson<StudySessionResponseDto>(`${API_BASE}/${deckId}/study?${queryParams.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
