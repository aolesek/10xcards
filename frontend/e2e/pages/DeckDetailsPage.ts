import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object for the Deck Details view
 * Represents the page where users can view flashcards in a deck and manage them
 */
export class DeckDetailsPage extends BasePage {
  private readonly deckNameHeading: Locator;
  private readonly flashcardCountText: Locator;
  private readonly studyButton: Locator;
  private readonly addFlashcardButton: Locator;
  private readonly aiGenerateButton: Locator;
  private readonly backToDeckListButton: Locator;
  private readonly loadingIndicator: Locator;
  private readonly errorMessage: Locator;
  private readonly retryButton: Locator;

  constructor(page: Page) {
    super(page);
    this.deckNameHeading = page.locator("h1");
    this.flashcardCountText = page.getByText(/Fiszki:/);
    this.studyButton = page.getByTestId("study-button");
    this.addFlashcardButton = page.getByRole("button", { name: "Dodaj fiszkę" });
    this.aiGenerateButton = page.getByRole("button", { name: /Generuj \(AI\)/i });
    this.backToDeckListButton = page.getByRole("button", { name: "Powrót do talii" });
    this.loadingIndicator = page.getByText("Ładowanie...");
    this.errorMessage = page.getByRole("alert");
    this.retryButton = page.getByRole("button", { name: /Spróbuj ponownie/i });
  }

  /**
   * Navigate to a specific deck details page
   */
  async goto(deckId: string): Promise<void> {
    await super.goto(`/decks/${deckId}`);
  }

  /**
   * Wait for the deck details page to be fully loaded
   */
  async waitForPageLoad(): Promise<void> {
    await expect(this.deckNameHeading).toBeVisible();
    // Wait for the study button to be visible (it may be disabled if no flashcards)
    await expect(this.studyButton).toBeVisible({ timeout: 10000 });
  }

  /**
   * Get the deck name displayed on the page
   */
  async getDeckName(): Promise<string> {
    return (await this.deckNameHeading.textContent()) || "";
  }

  /**
   * Get the flashcard count from the page
   */
  async getFlashcardCount(): Promise<number> {
    const text = await this.flashcardCountText.textContent();
    const match = text?.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  /**
   * Click the "Study" button to start studying the deck
   */
  async clickStudy(): Promise<void> {
    await this.studyButton.click();
  }

  /**
   * Check if the study button is enabled
   */
  async isStudyButtonEnabled(): Promise<boolean> {
    return await this.studyButton.isEnabled();
  }

  /**
   * Click the "Add Flashcard" button to open the create flashcard dialog
   */
  async clickAddFlashcard(): Promise<void> {
    await this.addFlashcardButton.click();
  }

  /**
   * Click the "AI Generate" button to navigate to AI generation
   */
  async clickAiGenerate(): Promise<void> {
    await this.aiGenerateButton.click();
  }

  /**
   * Click the "Back to Deck List" button
   */
  async clickBackToDeckList(): Promise<void> {
    await this.backToDeckListButton.click();
  }

  /**
   * Check if the loading indicator is visible
   */
  async isLoading(): Promise<boolean> {
    return await this.loadingIndicator.isVisible();
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
   * Click the retry button when an error occurs
   */
  async clickRetry(): Promise<void> {
    await this.retryButton.click();
  }

  /**
   * Get the number of flashcards displayed in the list
   */
  async getDisplayedFlashcardCount(): Promise<number> {
    // Assuming flashcards are in a list or grid with a specific selector
    const flashcardElements = this.page.locator('[data-testid*="flashcard"]');
    return await flashcardElements.count();
  }

  /**
   * Check if the empty flashcards state is visible
   */
  async isEmptyStateVisible(): Promise<boolean> {
    const emptyState = this.page.getByText("Brak fiszek");
    return await emptyState.isVisible();
  }
}
