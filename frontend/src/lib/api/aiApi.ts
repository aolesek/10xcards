import { fetchJson } from "./httpClient";
import type {
  GenerateFlashcardsRequestDto,
  AIGenerationResponseDto,
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
