import { fetchJson } from "./httpClient";
import type {
  GenerateFlashcardsRequestDto,
  AIGenerationResponseDto,
  UpdateCandidatesRequestDto,
  UpdateCandidatesResponseDto,
  SaveCandidatesResponseDto,
  PagedAIGenerationResponseDto,
} from "@/lib/ai/aiTypes";

const API_BASE = "/api/ai";

/**
 * Generate flashcards from source text using AI
 * POST /api/ai/generate
 * @param accessToken - JWT access token
 * @param dto - Generation request data
 * @param signal - Optional AbortSignal for request cancellation
 * @throws ApiError with status 400 (validation), 401 (unauthorized), 403 (forbidden/limit exceeded), 404 (deck not found), 429 (rate limit), 503 (AI service unavailable)
 */
export async function generateFlashcards(
  accessToken: string,
  dto: GenerateFlashcardsRequestDto,
  signal?: AbortSignal
): Promise<AIGenerationResponseDto> {
  return fetchJson<AIGenerationResponseDto>(`${API_BASE}/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(dto),
    signal,
  });
}

/**
 * Get AI generation by ID
 * GET /api/ai/generations/{generationId}
 * @param accessToken - JWT access token
 * @param generationId - Generation UUID
 * @param signal - Optional AbortSignal for request cancellation
 * @throws ApiError with status 401 (unauthorized), 403 (forbidden), 404 (not found)
 */
export async function getAIGeneration(
  accessToken: string,
  generationId: string,
  signal?: AbortSignal
): Promise<AIGenerationResponseDto> {
  return fetchJson<AIGenerationResponseDto>(
    `${API_BASE}/generations/${generationId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal,
    }
  );
}

/**
 * Update AI generation candidates statuses
 * PATCH /api/ai/generations/{generationId}/candidates
 * @param accessToken - JWT access token
 * @param generationId - Generation UUID
 * @param dto - Update request data
 * @param signal - Optional AbortSignal for request cancellation
 * @throws ApiError with status 400 (validation), 401 (unauthorized), 403 (forbidden), 404 (not found)
 */
export async function updateAICandidates(
  accessToken: string,
  generationId: string,
  dto: UpdateCandidatesRequestDto,
  signal?: AbortSignal
): Promise<UpdateCandidatesResponseDto> {
  return fetchJson<UpdateCandidatesResponseDto>(
    `${API_BASE}/generations/${generationId}/candidates`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(dto),
      signal,
    }
  );
}

/**
 * Save accepted/edited candidates to deck as flashcards
 * POST /api/ai/generations/{generationId}/save
 * @param accessToken - JWT access token
 * @param generationId - Generation UUID
 * @param signal - Optional AbortSignal for request cancellation
 * @throws ApiError with status 400 (validation - no candidates to save), 401 (unauthorized), 403 (forbidden), 404 (not found - generation or deck)
 */
export async function saveAICandidates(
  accessToken: string,
  generationId: string,
  signal?: AbortSignal
): Promise<SaveCandidatesResponseDto> {
  return fetchJson<SaveCandidatesResponseDto>(
    `${API_BASE}/generations/${generationId}/save`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal,
    }
  );
}

/**
 * List all AI generations for current user (paginated)
 * GET /api/ai/generations
 * @param accessToken - JWT access token
 * @param params - Optional query parameters (page, size, sort)
 * @param signal - Optional AbortSignal for request cancellation
 * @throws ApiError with status 401 (unauthorized)
 */
export async function listAIGenerations(
  accessToken: string,
  params?: { page?: number; size?: number; sort?: string },
  signal?: AbortSignal
): Promise<PagedAIGenerationResponseDto> {
  const queryParams = new URLSearchParams();
  if (params?.page !== undefined) queryParams.set("page", params.page.toString());
  if (params?.size !== undefined) queryParams.set("size", params.size.toString());
  if (params?.sort) queryParams.set("sort", params.sort);

  const url = queryParams.toString()
    ? `${API_BASE}/generations?${queryParams.toString()}`
    : `${API_BASE}/generations`;

  return fetchJson<PagedAIGenerationResponseDto>(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    signal,
  });
}
