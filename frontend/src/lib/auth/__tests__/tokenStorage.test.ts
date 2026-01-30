import { describe, it, expect, beforeEach, vi } from "vitest";
import { tokenStorage } from "../tokenStorage";

/**
 * Unit tests for tokenStorage module
 * Tests localStorage operations for JWT tokens
 */
describe("tokenStorage", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("getAccessToken", () => {
    it("should return access token from localStorage", () => {
      // Arrange
      localStorage.setItem("10xcards_access_token", "test-access-token");

      // Act
      const token = tokenStorage.getAccessToken();

      // Assert
      expect(token).toBe("test-access-token");
    });

    it("should return null when access token does not exist", () => {
      // Act
      const token = tokenStorage.getAccessToken();

      // Assert
      expect(token).toBeNull();
    });

    it("should return null and log error when localStorage fails", () => {
      // Arrange
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("Storage error");
      });

      // Act
      const token = tokenStorage.getAccessToken();

      // Assert
      expect(token).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to get access token:",
        expect.any(Error)
      );
    });
  });

  describe("getRefreshToken", () => {
    it("should return refresh token from localStorage", () => {
      // Arrange
      localStorage.setItem("10xcards_refresh_token", "test-refresh-token");

      // Act
      const token = tokenStorage.getRefreshToken();

      // Assert
      expect(token).toBe("test-refresh-token");
    });

    it("should return null when refresh token does not exist", () => {
      // Act
      const token = tokenStorage.getRefreshToken();

      // Assert
      expect(token).toBeNull();
    });
  });

  describe("setTokens", () => {
    it("should save both tokens to localStorage", () => {
      // Act
      tokenStorage.setTokens("access-token-123", "refresh-token-456");

      // Assert
      expect(localStorage.getItem("10xcards_access_token")).toBe("access-token-123");
      expect(localStorage.getItem("10xcards_refresh_token")).toBe("refresh-token-456");
    });

    it("should log error when localStorage fails", () => {
      // Arrange
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("Storage error");
      });

      // Act
      tokenStorage.setTokens("access-token", "refresh-token");

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to save tokens:",
        expect.any(Error)
      );
    });
  });

  describe("clearTokens", () => {
    it("should remove both tokens from localStorage", () => {
      // Arrange
      localStorage.setItem("10xcards_access_token", "access-token");
      localStorage.setItem("10xcards_refresh_token", "refresh-token");

      // Act
      tokenStorage.clearTokens();

      // Assert
      expect(localStorage.getItem("10xcards_access_token")).toBeNull();
      expect(localStorage.getItem("10xcards_refresh_token")).toBeNull();
    });

    it("should log error when localStorage fails", () => {
      // Arrange
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
        throw new Error("Storage error");
      });

      // Act
      tokenStorage.clearTokens();

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to clear tokens:",
        expect.any(Error)
      );
    });
  });

  describe("hasTokens", () => {
    it("should return true when both tokens exist", () => {
      // Arrange
      localStorage.setItem("10xcards_access_token", "access-token");
      localStorage.setItem("10xcards_refresh_token", "refresh-token");

      // Act & Assert
      expect(tokenStorage.hasTokens()).toBe(true);
    });

    it("should return false when access token is missing", () => {
      // Arrange
      localStorage.setItem("10xcards_refresh_token", "refresh-token");

      // Act & Assert
      expect(tokenStorage.hasTokens()).toBe(false);
    });

    it("should return false when refresh token is missing", () => {
      // Arrange
      localStorage.setItem("10xcards_access_token", "access-token");

      // Act & Assert
      expect(tokenStorage.hasTokens()).toBe(false);
    });

    it("should return false when both tokens are missing", () => {
      // Act & Assert
      expect(tokenStorage.hasTokens()).toBe(false);
    });
  });
});
