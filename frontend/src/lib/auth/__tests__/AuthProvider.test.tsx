import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { AuthProvider } from "../AuthProvider";
import { useAuth } from "../useAuth";
import { tokenStorage } from "../tokenStorage";
import * as authApi from "@/lib/api/authApi";
import type { AuthResponseDto, UserInfoResponseDto } from "../authTypes";

/**
 * Unit tests for AuthProvider
 * Tests authentication flow, session management, and token handling
 */

// Mock dependencies
vi.mock("../tokenStorage");
vi.mock("@/lib/api/authApi");

describe("AuthProvider", () => {
  const mockAuthResponse: AuthResponseDto = {
    id: "user-123",
    email: "test@example.com",
    role: "USER",
    monthlyAiLimit: 100,
    aiUsageInCurrentMonth: 10,
    accessToken: "access-token-123",
    refreshToken: "refresh-token-456",
  };

  const mockUserInfo: UserInfoResponseDto = {
    id: "user-123",
    email: "test@example.com",
    role: "USER",
    monthlyAiLimit: 100,
    aiUsageInCurrentMonth: 10,
  };

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    localStorage.clear();
    
    // Default mock implementations
    vi.mocked(tokenStorage.getAccessToken).mockReturnValue(null);
    vi.mocked(tokenStorage.getRefreshToken).mockReturnValue(null);
    vi.mocked(tokenStorage.setTokens).mockImplementation(() => {});
    vi.mocked(tokenStorage.clearTokens).mockImplementation(() => {});
  });

  describe("initial state", () => {
    it("should have correct initial state when no tokens in storage", async () => {
      // Arrange & Act
      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      // Wait for initial loading to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.user).toBeNull();
      expect(result.current.accessToken).toBeNull();
      expect(result.current.refreshToken).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it("should restore session when tokens exist in storage", async () => {
      // Arrange
      vi.mocked(tokenStorage.getAccessToken).mockReturnValue("stored-access-token");
      vi.mocked(tokenStorage.getRefreshToken).mockReturnValue("stored-refresh-token");
      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockUserInfo);

      // Act
      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toEqual({
        id: mockUserInfo.id,
        email: mockUserInfo.email,
        role: mockUserInfo.role,
        monthlyAiLimit: mockUserInfo.monthlyAiLimit,
        aiUsageInCurrentMonth: mockUserInfo.aiUsageInCurrentMonth,
      });
      expect(result.current.accessToken).toBe("stored-access-token");
      expect(result.current.refreshToken).toBe("stored-refresh-token");
      expect(result.current.isAuthenticated).toBe(true);
      expect(authApi.getCurrentUser).toHaveBeenCalledWith("stored-access-token");
    });

    it("should clear tokens when session restore fails", async () => {
      // Arrange
      vi.mocked(tokenStorage.getAccessToken).mockReturnValue("invalid-token");
      vi.mocked(tokenStorage.getRefreshToken).mockReturnValue("invalid-refresh");
      vi.mocked(authApi.getCurrentUser).mockRejectedValue(new Error("Unauthorized"));
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Act
      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(tokenStorage.clearTokens).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to restore session:",
        expect.any(Error)
      );
    });
  });

  describe("login", () => {
    it("should successfully login user and update state", async () => {
      // Arrange
      vi.mocked(authApi.login).mockResolvedValue(mockAuthResponse);
      
      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Act
      const response = await result.current.login({
        email: "test@example.com",
        password: "password123",
      });

      // Assert
      expect(response).toEqual(mockAuthResponse);
      
      // Wait for state to update
      await waitFor(() => {
        expect(result.current.user?.email).toBe("test@example.com");
        expect(result.current.isAuthenticated).toBe(true);
      });
      
      expect(result.current.accessToken).toBe("access-token-123");
      expect(result.current.refreshToken).toBe("refresh-token-456");
      expect(tokenStorage.setTokens).toHaveBeenCalledWith(
        "access-token-123",
        "refresh-token-456"
      );
    });

    it("should throw error when login fails", async () => {
      // Arrange
      const loginError = new Error("Invalid credentials");
      vi.mocked(authApi.login).mockRejectedValue(loginError);

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Act & Assert
      await expect(
        result.current.login({
          email: "test@example.com",
          password: "wrong-password",
        })
      ).rejects.toThrow("Invalid credentials");

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe("register", () => {
    it("should successfully register user and auto-login", async () => {
      // Arrange
      vi.mocked(authApi.register).mockResolvedValue(mockAuthResponse);

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Act
      const response = await result.current.register({
        email: "newuser@example.com",
        password: "password123",
      });

      // Assert
      expect(response).toEqual(mockAuthResponse);
      
      // Wait for state to update
      await waitFor(() => {
        expect(result.current.user?.email).toBe("test@example.com");
        expect(result.current.isAuthenticated).toBe(true);
      });
      
      expect(tokenStorage.setTokens).toHaveBeenCalledWith(
        "access-token-123",
        "refresh-token-456"
      );
    });
  });

  describe("logout", () => {
    it("should clear all auth state and tokens", async () => {
      // Arrange
      vi.mocked(authApi.login).mockResolvedValue(mockAuthResponse);

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Login first
      await result.current.login({
        email: "test@example.com",
        password: "password123",
      });

      // Wait for login to complete
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Act - logout
      result.current.logout();

      // Assert - wait for state to update
      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
      });
      
      expect(result.current.accessToken).toBeNull();
      expect(result.current.refreshToken).toBeNull();
      expect(tokenStorage.clearTokens).toHaveBeenCalled();
    });
  });

  describe("token refresh failed event", () => {
    it("should logout user when token refresh fails", async () => {
      // Arrange
      vi.mocked(authApi.login).mockResolvedValue(mockAuthResponse);
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Login first
      await result.current.login({
        email: "test@example.com",
        password: "password123",
      });

      // Wait for login to complete
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Act - dispatch token refresh failed event
      window.dispatchEvent(new CustomEvent("auth:token-refresh-failed"));

      // Assert
      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Token refresh failed, logging out user"
      );
      expect(tokenStorage.clearTokens).toHaveBeenCalled();
    });
  });

  describe("isAuthenticated", () => {
    it("should be false when user is null", async () => {
      // Arrange & Act
      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.isAuthenticated).toBe(false);
    });

    it("should be true when user and tokens exist", async () => {
      // Arrange
      vi.mocked(authApi.login).mockResolvedValue(mockAuthResponse);

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Act
      await result.current.login({
        email: "test@example.com",
        password: "password123",
      });

      // Assert - wait for state to update
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });
    });
  });
});
