import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAuth } from "../useAuth";
import { AuthProvider } from "../AuthProvider";

/**
 * Unit tests for useAuth hook
 * Tests authentication context access and error handling
 */
describe("useAuth", () => {
  it("should throw error when used outside AuthProvider", () => {
    // Arrange & Act
    const { result } = renderHook(() => {
      try {
        return useAuth();
      } catch (error) {
        return error;
      }
    });

    // Assert
    expect(result.current).toBeInstanceOf(Error);
    expect((result.current as Error).message).toBe(
      "useAuth must be used within an AuthProvider"
    );
  });

  it("should return auth context when used inside AuthProvider", () => {
    // Arrange & Act
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    // Assert
    expect(result.current).toBeDefined();
    expect(result.current).toHaveProperty("user");
    expect(result.current).toHaveProperty("accessToken");
    expect(result.current).toHaveProperty("refreshToken");
    expect(result.current).toHaveProperty("isAuthenticated");
    expect(result.current).toHaveProperty("isLoading");
    expect(result.current).toHaveProperty("login");
    expect(result.current).toHaveProperty("register");
    expect(result.current).toHaveProperty("logout");
  });

  it("should have correct initial state", () => {
    // Arrange & Act
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    // Assert
    expect(result.current.user).toBeNull();
    expect(result.current.accessToken).toBeNull();
    expect(result.current.refreshToken).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(typeof result.current.login).toBe("function");
    expect(typeof result.current.register).toBe("function");
    expect(typeof result.current.logout).toBe("function");
  });
});
