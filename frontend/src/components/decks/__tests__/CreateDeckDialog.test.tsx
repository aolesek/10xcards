import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateDeckDialog } from "../CreateDeckDialog";
import * as decksApi from "@/lib/api/decksApi";

/**
 * Unit tests for CreateDeckDialog component
 * Tests deck creation validation and form behavior
 */

// Mock dependencies
vi.mock("@/lib/api/decksApi");

describe("CreateDeckDialog", () => {
  const mockOnOpenChange = vi.fn();
  const mockOnCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should validate required name field", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <CreateDeckDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreated={mockOnCreated}
      />
    );

    // Act - submit empty form
    const submitButton = screen.getByRole("button", { name: /utwórz talię/i });
    await user.click(submitButton);

    // Assert
    await waitFor(() => {
      expect(
        screen.getByText("Nazwa talii jest wymagana")
      ).toBeInTheDocument();
    });
    expect(decksApi.createDeck).not.toHaveBeenCalled();
  });

  it("should validate max length (100 characters)", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <CreateDeckDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreated={mockOnCreated}
      />
    );

    // Act - enter name > 100 chars
    const input = screen.getByLabelText(/nazwa talii/i);
    const longName = "a".repeat(101);
    await user.type(input, longName);

    const submitButton = screen.getByRole("button", { name: /utwórz talię/i });
    await user.click(submitButton);

    // Assert
    await waitFor(() => {
      expect(
        screen.getByText("Nazwa talii może mieć maksymalnie 100 znaków")
      ).toBeInTheDocument();
    });
    expect(decksApi.createDeck).not.toHaveBeenCalled();
  });

  it("should trim whitespace before submitting", async () => {
    // Arrange
    const user = userEvent.setup();
    const mockDeck = { id: "deck-123", name: "Test Deck", flashcardCount: 0, createdAt: "2024-01-01", updatedAt: "2024-01-01" };
    vi.mocked(decksApi.createDeck).mockResolvedValue(mockDeck);

    render(
      <CreateDeckDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreated={mockOnCreated}
      />
    );

    // Act - enter name with whitespace
    const input = screen.getByLabelText(/nazwa talii/i);
    await user.type(input, "  Test Deck  ");

    const submitButton = screen.getByRole("button", { name: /utwórz talię/i });
    await user.click(submitButton);

    // Assert
    await waitFor(() => {
      expect(decksApi.createDeck).toHaveBeenCalledWith({
        name: "Test Deck",
      });
    });
    expect(mockOnCreated).toHaveBeenCalledWith(mockDeck);
  });

  it("should clear errors when user starts typing", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <CreateDeckDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreated={mockOnCreated}
      />
    );

    // Act - trigger validation error
    const submitButton = screen.getByRole("button", { name: /utwórz talię/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Nazwa talii jest wymagana")
      ).toBeInTheDocument();
    });

    // Act - start typing
    const input = screen.getByLabelText(/nazwa talii/i);
    await user.type(input, "A");

    // Assert - error should be cleared
    expect(
      screen.queryByText("Nazwa talii jest wymagana")
    ).not.toBeInTheDocument();
  });

  it("should reset form when dialog closes", async () => {
    // Arrange
    const user = userEvent.setup();
    const { rerender } = render(
      <CreateDeckDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreated={mockOnCreated}
      />
    );

    const input = screen.getByLabelText(/nazwa talii/i);
    await user.type(input, "Test");

    // Act - close dialog
    rerender(
      <CreateDeckDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        onCreated={mockOnCreated}
      />
    );

    // Reopen dialog
    rerender(
      <CreateDeckDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onCreated={mockOnCreated}
      />
    );

    // Assert - form should be reset
    const inputAfterReopen = screen.getByLabelText(/nazwa talii/i);
    expect(inputAfterReopen).toHaveValue("");
  });
});
