import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "../ProtectedRoute";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import * as authApi from "@/lib/api/authApi";
import { tokenStorage } from "@/lib/auth/tokenStorage";

/**
 * Unit tests for ProtectedRoute component
 * Tests route protection and authentication redirects
 */

// Mock dependencies
vi.mock("@/lib/auth/tokenStorage");
vi.mock("@/lib/api/authApi");

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    
    // Default: no tokens
    vi.mocked(tokenStorage.getAccessToken).mockReturnValue(null);
    vi.mocked(tokenStorage.getRefreshToken).mockReturnValue(null);
  });

  it("should redirect to login when user is not authenticated", async () => {
    // Arrange & Act
    render(
      <MemoryRouter initialEntries={["/protected"]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <div>Protected Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // Assert - should redirect to login
    await waitFor(() => {
      expect(screen.getByText("Login Page")).toBeInTheDocument();
    });
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("should render protected content when user is authenticated", async () => {
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
      <MemoryRouter initialEntries={["/protected"]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <div>Protected Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // Assert - should show protected content
    await waitFor(() => {
      expect(screen.getByText("Protected Content")).toBeInTheDocument();
    });
    expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
  });
});
