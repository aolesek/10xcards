import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthGuard } from "../AuthGuard";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import * as authApi from "@/lib/api/authApi";
import { tokenStorage } from "@/lib/auth/tokenStorage";

/**
 * Unit tests for AuthGuard component
 * Tests authentication page protection (prevents authenticated users from accessing login/register)
 */

// Mock dependencies
vi.mock("@/lib/auth/tokenStorage");
vi.mock("@/lib/api/authApi");

describe("AuthGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    
    // Default: no tokens
    vi.mocked(tokenStorage.getAccessToken).mockReturnValue(null);
    vi.mocked(tokenStorage.getRefreshToken).mockReturnValue(null);
  });

  it("should render auth page when user is not authenticated", async () => {
    // Arrange & Act
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/login"
              element={
                <AuthGuard>
                  <div>Login Page</div>
                </AuthGuard>
              }
            />
            <Route path="/decks" element={<div>Decks Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // Assert - should show login page
    await waitFor(() => {
      expect(screen.getByText("Login Page")).toBeInTheDocument();
    });
  });

  it("should redirect to decks when user is authenticated", async () => {
    // Arrange
    vi.mocked(tokenStorage.getAccessToken).mockReturnValue("access-token");
    vi.mocked(tokenStorage.getRefreshToken).mockReturnValue("refresh-token");
    vi.mocked(authApi.getCurrentUser).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      role: "USER",
      monthlyAiLimit: 100,
      aiUsageInCurrentMonth: 10,
    });

    // Act
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/login"
              element={
                <AuthGuard>
                  <div>Login Page</div>
                </AuthGuard>
              }
            />
            <Route path="/decks" element={<div>Decks Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // Assert - should redirect to decks
    await waitFor(() => {
      expect(screen.getByText("Decks Page")).toBeInTheDocument();
    });
    expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
  });

  it("should not render auth page content when authenticated", async () => {
    // Arrange
    vi.mocked(tokenStorage.getAccessToken).mockReturnValue("access-token");
    vi.mocked(tokenStorage.getRefreshToken).mockReturnValue("refresh-token");
    vi.mocked(authApi.getCurrentUser).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      role: "USER",
      monthlyAiLimit: 100,
      aiUsageInCurrentMonth: 10,
    });

    // Act
    render(
      <MemoryRouter initialEntries={["/register"]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/register"
              element={
                <AuthGuard>
                  <div>Register Page</div>
                </AuthGuard>
              }
            />
            <Route path="/decks" element={<div>Decks Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // Assert - register page should not be visible
    await waitFor(() => {
      expect(screen.queryByText("Register Page")).not.toBeInTheDocument();
    });
  });
});
