import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DecksView } from "../DecksView";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import * as decksApi from "@/lib/api/decksApi";
import * as authApi from "@/lib/api/authApi";
import { tokenStorage } from "@/lib/auth/tokenStorage";
import { ApiError } from "@/lib/api/httpClient";

/**
 * Unit tests for DecksView component
 * Tests main deck management view states and behavior
 */

// Mock dependencies
vi.mock("@/lib/api/decksApi");
vi.mock("@/lib/api/authApi");
vi.mock("@/lib/auth/tokenStorage");

// Mock child components to simplify testing
vi.mock("@/components/decks/DecksHeader", () => ({
  DecksHeader: ({ onCreateClick }: { onCreateClick: () => void }) => (
    <div data-testid="decks-header">
      <button onClick={onCreateClick}>Create Deck</button>
    </div>
  ),
}));

vi.mock("@/components/decks/DeckGrid", () => ({
  DeckGrid: ({ items }: { items: Array<{ id: string; name: string }> }) => (
    <div data-testid="deck-grid">
      {items.map((item) => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  ),
}));

vi.mock("@/components/decks/EmptyState", () => ({
  EmptyState: () => <div data-testid="empty-state">No decks</div>,
}));

vi.mock("@/components/decks/CreateDeckDialog", () => ({
  CreateDeckDialog: () => <div data-testid="create-dialog" />,
}));

vi.mock("@/components/decks/EditDeckDialog", () => ({
  EditDeckDialog: () => <div data-testid="edit-dialog" />,
}));

vi.mock("@/components/decks/ConfirmDeleteDialog", () => ({
  ConfirmDeleteDialog: () => <div data-testid="delete-dialog" />,
}));

describe("DecksView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup authenticated state
    vi.mocked(tokenStorage.getAccessToken).mockReturnValue("access-token");
    vi.mocked(tokenStorage.getRefreshToken).mockReturnValue("refresh-token");
    vi.mocked(authApi.getCurrentUser).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      role: "USER",
      monthlyAiLimit: 100,
      aiUsageInCurrentMonth: 10,
    });
  });

  it("should show empty state when no decks exist", async () => {
    // Arrange
    vi.mocked(decksApi.listDecks).mockResolvedValue({
      content: [],
      page: {
        number: 0,
        size: 100,
        totalElements: 0,
        totalPages: 0,
      },
    });

    // Act
    render(
      <MemoryRouter>
        <AuthProvider>
          <DecksView />
        </AuthProvider>
      </MemoryRouter>
    );

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("deck-grid")).not.toBeInTheDocument();
  });

  it("should show deck grid when decks exist", async () => {
    // Arrange
    const mockDecks = [
      {
        id: "deck-1",
        name: "Deck One",
        flashcardCount: 5,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      },
      {
        id: "deck-2",
        name: "Deck Two",
        flashcardCount: 10,
        createdAt: "2024-01-02",
        updatedAt: "2024-01-02",
      },
    ];

    vi.mocked(decksApi.listDecks).mockResolvedValue({
      content: mockDecks,
      page: {
        number: 0,
        size: 100,
        totalElements: 2,
        totalPages: 1,
      },
    });

    // Act
    render(
      <MemoryRouter>
        <AuthProvider>
          <DecksView />
        </AuthProvider>
      </MemoryRouter>
    );

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId("deck-grid")).toBeInTheDocument();
    });
    expect(screen.getByText("Deck One")).toBeInTheDocument();
    expect(screen.getByText("Deck Two")).toBeInTheDocument();
    expect(screen.getByText(/wyświetlono 2 z 2 talii/i)).toBeInTheDocument();
  });

  it("should show error state when API fails", async () => {
    // Arrange
    vi.mocked(decksApi.listDecks).mockRejectedValue(
      new ApiError(500, "Server error", "Internal server error")
    );

    // Act
    render(
      <MemoryRouter>
        <AuthProvider>
          <DecksView />
        </AuthProvider>
      </MemoryRouter>
    );

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/internal server error/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/spróbuj ponownie/i)).toBeInTheDocument();
  });
});
