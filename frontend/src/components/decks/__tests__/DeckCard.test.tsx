import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeckCard } from "../DeckCard";
import type { DeckListItemVm } from "@/lib/decks/deckTypes";

/**
 * Unit tests for DeckCard component
 * Tests deck card rendering and action callbacks
 */

describe("DeckCard", () => {
  const mockDeck: DeckListItemVm = {
    id: "deck-123",
    name: "Test Deck",
    flashcardCount: 10,
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
  };

  const mockCallbacks = {
    onOpen: vi.fn(),
    onStudy: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };

  it("should render deck information", () => {
    // Arrange & Act
    render(<DeckCard item={mockDeck} {...mockCallbacks} />);

    // Assert
    expect(screen.getByText("Test Deck")).toBeInTheDocument();
    expect(screen.getByText(/Fiszki: 10/i)).toBeInTheDocument();
  });

  it("should call onStudy when study button is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<DeckCard item={mockDeck} {...mockCallbacks} />);

    // Act
    const studyButton = screen.getByRole("button", { name: /ucz się/i });
    await user.click(studyButton);

    // Assert
    expect(mockCallbacks.onStudy).toHaveBeenCalledWith("deck-123");
    expect(mockCallbacks.onStudy).toHaveBeenCalledTimes(1);
  });

  it("should call onOpen when open button is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<DeckCard item={mockDeck} {...mockCallbacks} />);

    // Act
    const openButton = screen.getByRole("button", { name: /otwórz/i });
    await user.click(openButton);

    // Assert
    expect(mockCallbacks.onOpen).toHaveBeenCalledWith("deck-123");
    expect(mockCallbacks.onOpen).toHaveBeenCalledTimes(1);
  });

  it("should call onEdit when edit button is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<DeckCard item={mockDeck} {...mockCallbacks} />);

    // Act
    const editButton = screen.getByRole("button", { name: /edytuj/i });
    await user.click(editButton);

    // Assert
    expect(mockCallbacks.onEdit).toHaveBeenCalledWith(mockDeck);
    expect(mockCallbacks.onEdit).toHaveBeenCalledTimes(1);
  });

  it("should call onDelete when delete button is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<DeckCard item={mockDeck} {...mockCallbacks} />);

    // Act
    const deleteButton = screen.getByRole("button", { name: /usuń/i });
    await user.click(deleteButton);

    // Assert
    expect(mockCallbacks.onDelete).toHaveBeenCalledWith(mockDeck);
    expect(mockCallbacks.onDelete).toHaveBeenCalledTimes(1);
  });

  it("should truncate long deck names", () => {
    // Arrange
    const longNameDeck: DeckListItemVm = {
      ...mockDeck,
      name: "This is a very long deck name that should be truncated when displayed in the card",
    };

    // Act
    render(<DeckCard item={longNameDeck} {...mockCallbacks} />);

    // Assert
    const title = screen.getByText(longNameDeck.name);
    expect(title).toHaveClass("line-clamp-2");
  });
});
