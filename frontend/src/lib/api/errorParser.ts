import type { FieldErrors } from "@/lib/auth/authTypes";
import { ApiError } from "./httpClient";

/**
 * Parse backend validation error message into field-specific errors
 * 
 * Backend format: "email: Invalid email format, password: Password must be..."
 * 
 * @param message - Error message from ErrorResponseDto
 * @returns FieldErrors object or null if parsing fails
 */
export function parseValidationErrors(message: string): FieldErrors | null {
  try {
    const fieldErrors: FieldErrors = {};
    
    // Split by ", " to get individual field errors
    const parts = message.split(", ");
    
    for (const part of parts) {
      // Split by ": " to separate field name from error message
      const colonIndex = part.indexOf(": ");
      
      if (colonIndex > 0) {
        const fieldName = part.substring(0, colonIndex).trim();
        const errorMessage = part.substring(colonIndex + 2).trim();
        
        // Map field names to FieldErrors keys
        if (fieldName === "email") {
          fieldErrors.email = errorMessage;
        } else if (fieldName === "password") {
          fieldErrors.password = errorMessage;
        } else if (fieldName === "newPassword") {
          fieldErrors.newPassword = errorMessage;
        } else if (fieldName === "token") {
          fieldErrors.token = errorMessage;
        } else if (fieldName === "name") {
          fieldErrors.name = errorMessage;
        } else if (fieldName === "front") {
          fieldErrors.front = errorMessage;
        } else if (fieldName === "back") {
          fieldErrors.back = errorMessage;
        } else if (fieldName === "deckId") {
          fieldErrors.deckId = errorMessage;
        } else if (fieldName === "sourceText") {
          fieldErrors.sourceText = errorMessage;
        }
      }
    }
    
    // Return null if no fields were parsed
    return Object.keys(fieldErrors).length > 0 ? fieldErrors : null;
  } catch {
    return null;
  }
}

/**
 * Extract user-friendly error message from ApiError
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.data?.message || error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.";
}

/**
 * Handle API error and extract field errors + global error
 */
export function handleApiError(error: unknown): {
  fieldErrors: FieldErrors;
  globalError: string | null;
} {
  if (!(error instanceof ApiError)) {
    return {
      fieldErrors: {},
      globalError: getErrorMessage(error),
    };
  }

  const { status, data } = error;

  // Try to parse validation errors (400)
  if (status === 400 && data?.message) {
    const fieldErrors = parseValidationErrors(data.message);
    
    if (fieldErrors) {
      return {
        fieldErrors,
        globalError: null,
      };
    }
  }

  // For other errors, return as global error
  return {
    fieldErrors: {},
    globalError: getErrorMessage(error),
  };
}
