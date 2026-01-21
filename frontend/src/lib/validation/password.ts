/**
 * Password validation rules (matching backend @ValidPassword annotation):
 * - Minimum 8 characters
 * - At least 1 lowercase letter (a-z)
 * - At least 1 uppercase letter (A-Z)
 * - At least 1 digit (0-9)
 * - At least 1 special character from: @$!%*?&#
 * - Only allows: letters, digits, and @$!%*?&#
 * 
 * Full regex pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/
 */

/**
 * Check if password contains only allowed characters (without requirement checks)
 */
const ALLOWED_CHARS_REGEX = /^[A-Za-z\d@$!%*?&#]+$/;

export interface PasswordValidationResult {
  isValid: boolean;
  error?: string;
}

export function validatePassword(password: string): PasswordValidationResult {
  if (!password) {
    return {
      isValid: false,
      error: "Hasło jest wymagane",
    };
  }

  if (password.length < 8) {
    return {
      isValid: false,
      error: "Hasło musi mieć co najmniej 8 znaków",
    };
  }

  // Check for disallowed characters first (before checking individual requirements)
  if (!ALLOWED_CHARS_REGEX.test(password)) {
    return {
      isValid: false,
      error:
        "Hasło zawiera niedozwolone znaki. Dozwolone: litery, cyfry oraz @$!%*?&#",
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      error: "Hasło musi zawierać co najmniej jedną małą literę",
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      error: "Hasło musi zawierać co najmniej jedną wielką literę",
    };
  }

  if (!/\d/.test(password)) {
    return {
      isValid: false,
      error: "Hasło musi zawierać co najmniej jedną cyfrę",
    };
  }

  if (!/[@$!%*?&#]/.test(password)) {
    return {
      isValid: false,
      error: "Hasło musi zawierać co najmniej jeden znak specjalny: @$!%*?&#",
    };
  }

  return {
    isValid: true,
  };
}

/**
 * Validates email format
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateEmail(email: string): EmailValidationResult {
  if (!email) {
    return {
      isValid: false,
      error: "Email jest wymagany",
    };
  }

  const trimmedEmail = email.trim();

  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return {
      isValid: false,
      error: "Nieprawidłowy format adresu email",
    };
  }

  if (trimmedEmail.length > 255) {
    return {
      isValid: false,
      error: "Email może mieć maksymalnie 255 znaków",
    };
  }

  return {
    isValid: true,
  };
}
