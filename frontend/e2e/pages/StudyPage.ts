import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object for the Study view
 * Represents the page where users study flashcards
 */
export class StudyPage extends BasePage {
  // Top bar elements
  private readonly deckNameHeading: Locator;
  private readonly progressText: Locator;
  private readonly backButton: Locator;
  private readonly logoutButton: Locator;

  // Study card elements
  private readonly studyCard: Locator;
  private readonly cardQuestion: Locator;
  private readonly cardAnswer: Locator;

  // Control buttons
  private readonly prevButton: Locator;
  private readonly revealButton: Locator;
  private readonly nextButton: Locator;

  // Summary elements
  private readonly summaryCard: Locator;
  private readonly totalCardsText: Locator;
  private readonly restartButton: Locator;
  private readonly backToDeckButton: Locator;

  // State elements
  private readonly loadingIndicator: Locator;
  private readonly emptyState: Locator;
  private readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);

    // Top bar
    this.deckNameHeading = page.getByTestId("study-deck-name");
    this.progressText = page.getByTestId("study-progress");
    this.backButton = page.getByRole("button", { name: "Wróć" });
    this.logoutButton = page.getByRole("button", { name: /Wyloguj/i });

    // Study card
    this.studyCard = page.getByTestId("study-card");
    this.cardQuestion = page.getByTestId("card-question");
    this.cardAnswer = page.getByTestId("card-answer");

    // Controls
    this.prevButton = page.getByTestId("study-prev-button");
    this.revealButton = page.getByTestId("study-reveal-button");
    this.nextButton = page.getByTestId("study-next-button");

    // Summary
    this.summaryCard = page.getByTestId("study-summary");
    this.totalCardsText = page.getByTestId("study-total-cards");
    this.restartButton = page.getByTestId("study-restart-button");
    this.backToDeckButton = page.getByTestId("study-back-to-deck-button");

    // States
    this.loadingIndicator = page.getByText("Ładowanie...");
    this.emptyState = page.getByTestId("study-empty-state");
    this.errorMessage = page.getByRole("alert");
  }

  /**
   * Navigate to the study page for a specific deck
   */
  async goto(deckId: string): Promise<void> {
    await super.goto(`/decks/${deckId}/study`);
  }

  /**
   * Wait for the study page to be fully loaded and ready
   */
  async waitForPageLoad(): Promise<void> {
    await expect(this.deckNameHeading).toBeVisible();
    await expect(this.studyCard).toBeVisible({ timeout: 10000 });
  }

  /**
   * Get the deck name from the top bar
   */
  async getDeckName(): Promise<string> {
    return (await this.deckNameHeading.textContent()) || "";
  }

  /**
   * Get the current progress text (e.g., "1 / 3")
   */
  async getProgress(): Promise<string> {
    return (await this.progressText.textContent()) || "";
  }

  /**
   * Parse the progress text to get current and total card numbers
   * @returns Object with current and total properties
   */
  async getProgressNumbers(): Promise<{ current: number; total: number }> {
    const progress = await this.getProgress();
    const match = progress.match(/(\d+)\s*\/\s*(\d+)/);
    if (match) {
      return {
        current: parseInt(match[1], 10),
        total: parseInt(match[2], 10),
      };
    }
    return { current: 0, total: 0 };
  }

  /**
   * Get the question text from the current card
   */
  async getQuestionText(): Promise<string> {
    return (await this.cardQuestion.textContent()) || "";
  }

  /**
   * Get the answer text from the current card (if revealed)
   */
  async getAnswerText(): Promise<string> {
    return (await this.cardAnswer.textContent()) || "";
  }

  /**
   * Check if the answer is currently visible (card is revealed)
   */
  async isAnswerVisible(): Promise<boolean> {
    return await this.cardAnswer.isVisible();
  }

  /**
   * Click the study card to toggle reveal/hide answer
   */
  async clickCard(): Promise<void> {
    await this.studyCard.click();
  }

  /**
   * Click the reveal/hide button
   */
  async clickReveal(): Promise<void> {
    await this.revealButton.click();
  }

  /**
   * Click the previous button to go to the previous card
   */
  async clickPrevious(): Promise<void> {
    await this.prevButton.click();
  }

  /**
   * Click the next button to go to the next card
   */
  async clickNext(): Promise<void> {
    await this.nextButton.click();
  }

  /**
   * Check if the previous button is enabled
   */
  async isPreviousButtonEnabled(): Promise<boolean> {
    return await this.prevButton.isEnabled();
  }

  /**
   * Check if the next button is enabled
   */
  async isNextButtonEnabled(): Promise<boolean> {
    return await this.nextButton.isEnabled();
  }

  /**
   * Use keyboard shortcut to reveal/hide the answer
   */
  async pressSpaceToReveal(): Promise<void> {
    await this.page.keyboard.press("Space");
  }

  /**
   * Use keyboard shortcut to reveal/hide the answer (Enter key)
   */
  async pressEnterToReveal(): Promise<void> {
    await this.page.keyboard.press("Enter");
  }

  /**
   * Use keyboard shortcut to go to the previous card
   */
  async pressArrowLeftToPrevious(): Promise<void> {
    await this.page.keyboard.press("ArrowLeft");
  }

  /**
   * Use keyboard shortcut to go to the next card
   */
  async pressArrowRightToNext(): Promise<void> {
    await this.page.keyboard.press("ArrowRight");
  }

  /**
   * Reveal the answer (using button)
   */
  async revealAnswer(): Promise<void> {
    if (!(await this.isAnswerVisible())) {
      await this.clickReveal();
      await expect(this.cardAnswer).toBeVisible();
    }
  }

  /**
   * Hide the answer (using button)
   */
  async hideAnswer(): Promise<void> {
    if (await this.isAnswerVisible()) {
      await this.clickReveal();
      await expect(this.cardAnswer).not.toBeVisible();
    }
  }

  /**
   * Study through all cards until the summary appears
   * @param revealEachCard - Whether to reveal each card before moving to the next
   */
  async studyAllCards(revealEachCard: boolean = true): Promise<void> {
    while (!(await this.isSummaryVisible())) {
      if (revealEachCard) {
        await this.revealAnswer();
      }
      await this.clickNext();
      // Small wait to allow for navigation/state update
      await this.page.waitForTimeout(300);
    }
  }

  // ===== SUMMARY METHODS =====

  /**
   * Check if the summary card is visible (end of study session)
   */
  async isSummaryVisible(): Promise<boolean> {
    return await this.summaryCard.isVisible();
  }

  /**
   * Wait for the summary to be visible
   */
  async waitForSummary(): Promise<void> {
    await expect(this.summaryCard).toBeVisible({ timeout: 10000 });
  }

  /**
   * Get the total number of cards studied from the summary
   */
  async getTotalCardsStudied(): Promise<number> {
    const text = await this.totalCardsText.textContent();
    return parseInt(text || "0", 10);
  }

  /**
   * Click the restart button in the summary to start studying again
   */
  async clickRestart(): Promise<void> {
    await this.restartButton.click();
  }

  /**
   * Click the "Back to Deck" button in the summary
   */
  async clickBackToDeck(): Promise<void> {
    await this.backToDeckButton.click();
  }

  // ===== STATE METHODS =====

  /**
   * Check if the loading indicator is visible
   */
  async isLoading(): Promise<boolean> {
    return await this.loadingIndicator.isVisible();
  }

  /**
   * Check if the empty state is visible (no flashcards in deck)
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return await this.emptyState.isVisible();
  }

  /**
   * Check if an error message is displayed
   */
  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  /**
   * Get the error message text
   */
  async getErrorMessage(): Promise<string> {
    return (await this.errorMessage.textContent()) || "";
  }

  /**
   * Click the back button in the top bar
   */
  async clickBack(): Promise<void> {
    await this.backButton.click();
  }

  /**
   * Click the logout button
   */
  async clickLogout(): Promise<void> {
    await this.logoutButton.click();
  }
}
