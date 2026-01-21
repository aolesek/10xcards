import { fetchJson } from "./httpClient";
import type {
  LoginRequestDto,
  RegisterRequestDto,
  PasswordResetRequestDto,
  PasswordResetConfirmDto,
  AuthResponseDto,
  MessageResponseDto,
} from "@/lib/auth/authTypes";

const API_BASE = "/api/auth";

/**
 * Login user and obtain JWT tokens
 * @throws ApiError with status 400 (validation), 401 (invalid credentials/disabled), 429 (rate limit)
 */
export async function login(dto: LoginRequestDto): Promise<AuthResponseDto> {
  return fetchJson<AuthResponseDto>(`${API_BASE}/login`, {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

/**
 * Register new user and obtain JWT tokens (auto-login)
 * @throws ApiError with status 400 (validation), 409 (email exists)
 */
export async function register(
  dto: RegisterRequestDto
): Promise<AuthResponseDto> {
  return fetchJson<AuthResponseDto>(`${API_BASE}/register`, {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

/**
 * Request password reset link
 * Always returns success message (non-revealing)
 * @throws ApiError with status 400 (validation), 429 (rate limit)
 */
export async function requestPasswordReset(
  dto: PasswordResetRequestDto
): Promise<MessageResponseDto> {
  return fetchJson<MessageResponseDto>(`${API_BASE}/password-reset/request`, {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

/**
 * Confirm password reset with token and new password
 * @throws ApiError with status 400 (validation), 401 (invalid token), 410 (expired token)
 */
export async function confirmPasswordReset(
  dto: PasswordResetConfirmDto
): Promise<MessageResponseDto> {
  return fetchJson<MessageResponseDto>(`${API_BASE}/password-reset/confirm`, {
    method: "POST",
    body: JSON.stringify(dto),
  });
}
