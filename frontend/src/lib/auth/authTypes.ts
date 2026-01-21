// ============================================================================
// DTO Types (API Contracts)
// ============================================================================

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface RegisterRequestDto {
  email: string;
  password: string;
}

export interface PasswordResetRequestDto {
  email: string;
}

export interface PasswordResetConfirmDto {
  token: string;
  newPassword: string;
}

export interface AuthResponseDto {
  id: string; // UUID
  email: string;
  role: string;
  monthlyAiLimit: number;
  aiUsageInCurrentMonth: number;
  accessToken: string;
  refreshToken: string;
}

export interface UserInfoResponseDto {
  id: string; // UUID
  email: string;
  role: string;
  monthlyAiLimit: number;
  aiUsageInCurrentMonth: number;
}

export interface MessageResponseDto {
  message: string;
}

export interface ErrorResponseDto {
  timestamp: string; // ISO 8601
  status: number;
  error: string;
  message: string;
  path: string;
}

// ============================================================================
// ViewModel Types (UI State)
// ============================================================================

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface RegisterFormValues {
  email: string;
  password: string;
}

export interface PasswordResetRequestFormValues {
  email: string;
}

export interface PasswordResetConfirmFormValues {
  newPassword: string;
}

// ============================================================================
// Helper Types
// ============================================================================

export interface FieldErrors {
  email?: string;
  password?: string;
  newPassword?: string;
  token?: string;
  name?: string;
  front?: string;
  back?: string;
}

export type ApiErrorKind =
  | "validation"
  | "unauthorized"
  | "conflict"
  | "rate_limit"
  | "gone"
  | "unknown";

// ============================================================================
// Auth Context Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  role: string;
  monthlyAiLimit: number;
  aiUsageInCurrentMonth: number;
}
