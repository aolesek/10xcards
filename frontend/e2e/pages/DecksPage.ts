import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object for the Decks view
 * Represents the main page where users can view and manage their decks
 */
export class DecksPage extends BasePage {
  private readonly decksView: Locator;
  private readonly createDeckButton: Locator;
  private readonly aiGenerateButton: Locator;
  private readonly aiHistoryButton: Locator;
  private readonly loadingIndicator: Locator;
  private readonly errorMessage: Locator;
  private readonly retryButton: Locator;

  constructor(page: Page) {
    super(page);
    this.decksView = page.getByTestId("decks-view");
    this.createDeckButton = page.getByTestId("create-deck-button");
    this.aiGenerateButton = page.getByTestId("ai-generate-button");
    this.aiHistoryButton = page.getByRole("button", { name: /Historia generowań AI/i });
    this.loadingIndicator = page.getByText("Ładowanie talii...");
    this.errorMessage = page.getByRole("alert");
    this.retryButton = page.getByRole("button", { name: /Spróbuj ponownie/i });
  }

  /**
   * Navigate to the decks page
   */
  async goto(): Promise<void> {
    await super.goto("/decks");
  }

  /**
   * Wait for the decks view to be visible and loading to complete
   */
  async waitForDecksView(): Promise<void> {
    await expect(this.decksView).toBeVisible();
    // Wait for create button to be enabled (it's disabled during loading)
    await expect(this.createDeckButton).toBeEnabled({ timeout: 10000 });
  }

  /**
   * Click the "Create Deck" button to open the create deck dialog
   */
  async clickCreateDeck(): Promise<void> {
    await this.createDeckButton.click();
  }

  /**
   * Click the "AI Generate" button to navigate to AI generation view
   */
  async clickAiGenerate(): Promise<void> {
    await this.aiGenerateButton.click();
  }

  /**
   * Click the "AI History" button to navigate to AI generations history
   */
  async clickAiHistory(): Promise<void> {
    await this.aiHistoryButton.click();
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
   * Check if the create deck button is enabled
   */
  async isCreateDeckButtonEnabled(): Promise<boolean> {
    return await this.createDeckButton.isEnabled();
  }

  /**
   * Get the number of deck cards displayed
   */
  async getDeckCount(): Promise<number> {
    const deckCards = this.page.locator('[data-testid="deck-card"]');
    return await deckCards.count();
  }

  /**
   * Check if the empty state is displayed
   */
  async isEmptyStateVisible(): Promise<boolean> {
    const emptyState = this.page.getByText("Nie masz jeszcze żadnych talii");
    return await emptyState.isVisible();
  }

  /**
   * Open a specific deck by index (0-based)
   */
  async openDeck(index: number): Promise<void> {
    const deckCards = this.page.locator('[data-testid="deck-card"]');
    const openButton = deckCards.nth(index).getByRole("button", { name: "Otwórz" });
    await openButton.click();
  }

  /**
   * Start studying a specific deck by index (0-based)
   */
  async studyDeck(index: number): Promise<void> {
    const deckCards = this.page.locator('[data-testid="deck-card"]');
    const studyButton = deckCards.nth(index).getByRole("button", { name: "Ucz się" });
    await studyButton.click();
  }

  /**
   * Edit a specific deck by index (0-based)
   */
  async editDeck(index: number): Promise<void> {
    const deckCards = this.page.locator('[data-testid="deck-card"]');
    const editButton = deckCards.nth(index).getByRole("button", { name: "Edytuj" });
    await editButton.click();
  }

  /**
   * Delete a specific deck by index (0-based)
   */
  async deleteDeck(index: number): Promise<void> {
    const deckCards = this.page.locator('[data-testid="deck-card"]');
    const deleteButton = deckCards.nth(index).getByRole("button", { name: "Usuń" });
    await deleteButton.click();
  }

  /**
   * Get deck name by index (0-based)
   */
  async getDeckName(index: number): Promise<string> {
    const deckCards = this.page.locator('[data-testid="deck-card"]');
    const title = deckCards.nth(index).locator("h3");
    return (await title.textContent()) || "";
  }
}
