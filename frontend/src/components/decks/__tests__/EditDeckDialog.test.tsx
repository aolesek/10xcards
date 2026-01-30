import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditDeckDialog } from "../EditDeckDialog";
import * as decksApi from "@/lib/api/decksApi";
import type { DeckListItemVm } from "@/lib/decks/deckTypes";

/**
 * Unit tests for EditDeckDialog component
 * Tests deck editing validation and form behavior
 */

// Mock dependencies
vi.mock("@/lib/api/decksApi");

describe("EditDeckDialog", () => {
  const mockOnOpenChange = vi.fn();
  const mockOnUpdated = vi.fn();

  const mockDeck: DeckListItemVm = {
    id: "deck-123",
    name: "Original Name",
    flashcardCount: 5,
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should prefill form with existing deck name", async () => {
    // Arrange & Act
    render(
      <EditDeckDialog
        open={true}
        deck={mockDeck}
        onOpenChange={mockOnOpenChange}
        onUpdated={mockOnUpdated}
      />
    );

    // Assert
    const input = screen.getByLabelText(/nazwa talii/i);
    expect(input).toHaveValue("Original Name");
  });

  it("should validate required name field", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <EditDeckDialog
        open={true}
        deck={mockDeck}
        onOpenChange={mockOnOpenChange}
        onUpdated={mockOnUpdated}
      />
    );

    // Act - clear input and submit
    const input = screen.getByLabelText(/nazwa talii/i);
    await user.clear(input);

    const submitButton = screen.getByRole("button", { name: /zapisz zmiany/i });
    await user.click(submitButton);

    // Assert
    await waitFor(() => {
      expect(
        screen.getByText("Nazwa talii jest wymagana")
      ).toBeInTheDocument();
    });
    expect(decksApi.updateDeck).not.toHaveBeenCalled();
  });

  it("should validate max length (100 characters)", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <EditDeckDialog
        open={true}
        deck={mockDeck}
        onOpenChange={mockOnOpenChange}
        onUpdated={mockOnUpdated}
      />
    );

    // Act - enter name > 100 chars
    const input = screen.getByLabelText(/nazwa talii/i);
    await user.clear(input);
    const longName = "a".repeat(101);
    await user.type(input, longName);

    const submitButton = screen.getByRole("button", { name: /zapisz zmiany/i });
    await user.click(submitButton);

    // Assert
    await waitFor(() => {
      expect(
        screen.getByText("Nazwa talii może mieć maksymalnie 100 znaków")
      ).toBeInTheDocument();
    });
    expect(decksApi.updateDeck).not.toHaveBeenCalled();
  });

  it("should trim whitespace before submitting", async () => {
    // Arrange
    const user = userEvent.setup();
    const updatedDeck = { id: "deck-123", name: "New Name", flashcardCount: 5, createdAt: "2024-01-01", updatedAt: "2024-01-01" };
    vi.mocked(decksApi.updateDeck).mockResolvedValue(updatedDeck);

    render(
      <EditDeckDialog
        open={true}
        deck={mockDeck}
        onOpenChange={mockOnOpenChange}
        onUpdated={mockOnUpdated}
      />
    );

    // Act - enter name with whitespace
    const input = screen.getByLabelText(/nazwa talii/i);
    await user.clear(input);
    await user.type(input, "  New Name  ");

    const submitButton = screen.getByRole("button", { name: /zapisz zmiany/i });
    await user.click(submitButton);

    // Assert
    await waitFor(() => {
      expect(decksApi.updateDeck).toHaveBeenCalledWith("deck-123", {
        name: "New Name",
      });
    });
    expect(mockOnUpdated).toHaveBeenCalledWith(updatedDeck);
  });

  it("should not render when deck is null", () => {
    // Arrange & Act
    const { container } = render(
      <EditDeckDialog
        open={true}
        deck={null}
        onOpenChange={mockOnOpenChange}
        onUpdated={mockOnUpdated}
      />
    );

    // Assert
    expect(container.firstChild).toBeNull();
  });
});
