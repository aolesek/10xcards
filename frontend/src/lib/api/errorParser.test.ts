import { describe, it, expect } from "vitest";
import {
  parseValidationErrors,
  getErrorMessage,
  handleApiError,
} from "./errorParser";
import { ApiError } from "./httpClient";

describe("parseValidationErrors", () => {
  it("should parse single field error", () => {
    const message = "email: Invalid email format";
    const result = parseValidationErrors(message);

    expect(result).toEqual({
      email: "Invalid email format",
    });
  });

  it("should parse multiple field errors", () => {
    const message =
      "email: Invalid email format, password: Password must be at least 8 characters";
    const result = parseValidationErrors(message);

    expect(result).toEqual({
      email: "Invalid email format",
      password: "Password must be at least 8 characters",
    });
  });

  it("should parse all supported field names", () => {
    const message =
      "email: Email error, password: Password error, newPassword: NewPassword error, token: Token error";
    const result = parseValidationErrors(message);

    expect(result).toEqual({
      email: "Email error",
      password: "Password error",
      newPassword: "NewPassword error",
      token: "Token error",
    });
  });

  it("should return null for unparseable message", () => {
    const message = "Some generic error message";
    const result = parseValidationErrors(message);

    expect(result).toBeNull();
  });

  it("should return null for empty message", () => {
    const message = "";
    const result = parseValidationErrors(message);

    expect(result).toBeNull();
  });

  it("should ignore unknown field names", () => {
    const message = "email: Email error, unknownField: Unknown error";
    const result = parseValidationErrors(message);

    expect(result).toEqual({
      email: "Email error",
    });
  });

  it("should handle malformed field entries", () => {
    const message = "email Invalid email, password: Password error";
    const result = parseValidationErrors(message);

    expect(result).toEqual({
      password: "Password error",
    });
  });
});

describe("getErrorMessage", () => {
  it("should extract message from ApiError with data", () => {
    const error = new ApiError(400, {
      timestamp: "2024-01-01T00:00:00Z",
      status: 400,
      error: "Bad Request",
      message: "Validation failed",
      path: "/api/auth/login",
    });

    const result = getErrorMessage(error);
    expect(result).toBe("Validation failed");
  });

  it("should use error.message when data is undefined", () => {
    const error = new ApiError(500, undefined, "Network error");

    const result = getErrorMessage(error);
    expect(result).toBe("Network error");
  });

  it("should extract message from standard Error", () => {
    const error = new Error("Something went wrong");

    const result = getErrorMessage(error);
    expect(result).toBe("Something went wrong");
  });

  it("should return generic message for unknown error types", () => {
    const error = "string error";

    const result = getErrorMessage(error);
    expect(result).toBe("Wystąpił nieoczekiwany błąd. Spróbuj ponownie.");
  });

  it("should return generic message for null", () => {
    const result = getErrorMessage(null);
    expect(result).toBe("Wystąpił nieoczekiwany błąd. Spróbuj ponownie.");
  });
});

describe("handleApiError", () => {
  it("should parse validation errors from 400 status", () => {
    const error = new ApiError(400, {
      timestamp: "2024-01-01T00:00:00Z",
      status: 400,
      error: "Bad Request",
      message: "email: Invalid email format, password: Password too short",
      path: "/api/auth/register",
    });

    const result = handleApiError(error);

    expect(result.fieldErrors).toEqual({
      email: "Invalid email format",
      password: "Password too short",
    });
    expect(result.globalError).toBeNull();
  });

  it("should return global error for 400 with unparseable message", () => {
    const error = new ApiError(400, {
      timestamp: "2024-01-01T00:00:00Z",
      status: 400,
      error: "Bad Request",
      message: "Generic validation error",
      path: "/api/auth/register",
    });

    const result = handleApiError(error);

    expect(result.fieldErrors).toEqual({});
    expect(result.globalError).toBe("Generic validation error");
  });

  it("should return global error for 401 status", () => {
    const error = new ApiError(401, {
      timestamp: "2024-01-01T00:00:00Z",
      status: 401,
      error: "Unauthorized",
      message: "Invalid credentials",
      path: "/api/auth/login",
    });

    const result = handleApiError(error);

    expect(result.fieldErrors).toEqual({});
    expect(result.globalError).toBe("Invalid credentials");
  });

  it("should return global error for 409 status", () => {
    const error = new ApiError(409, {
      timestamp: "2024-01-01T00:00:00Z",
      status: 409,
      error: "Conflict",
      message: "Email already exists",
      path: "/api/auth/register",
    });

    const result = handleApiError(error);

    expect(result.fieldErrors).toEqual({});
    expect(result.globalError).toBe("Email already exists");
  });

  it("should return global error for 429 status", () => {
    const error = new ApiError(429, {
      timestamp: "2024-01-01T00:00:00Z",
      status: 429,
      error: "Too Many Requests",
      message: "Too many login attempts",
      path: "/api/auth/login",
    });

    const result = handleApiError(error);

    expect(result.fieldErrors).toEqual({});
    expect(result.globalError).toBe("Too many login attempts");
  });

  it("should return global error for non-ApiError", () => {
    const error = new Error("Network failure");

    const result = handleApiError(error);

    expect(result.fieldErrors).toEqual({});
    expect(result.globalError).toBe("Network failure");
  });

  it("should handle generic unknown errors", () => {
    const error = { something: "unexpected" };

    const result = handleApiError(error);

    expect(result.fieldErrors).toEqual({});
    expect(result.globalError).toBe(
      "Wystąpił nieoczekiwany błąd. Spróbuj ponownie."
    );
  });
});
