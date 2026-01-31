import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object for the AI Generate view
 * Represents the main page where users can generate flashcards using AI
 */
export class AIGeneratePage extends BasePage {
  private readonly aiGenerateView: Locator;
  private readonly pageTitle: Locator;
  private readonly pageDescription: Locator;
  private readonly decksLoadingError: Locator;
  private readonly retryButton: Locator;

  constructor(page: Page) {
    super(page);
    this.aiGenerateView = page.getByTestId("ai-generate-view");
    this.pageTitle = page.getByRole("heading", { name: /Generuj fiszki \(AI\)/i });
    this.pageDescription = page.getByText(/Wklej tekst, z którego mają zostać wygenerowane fiszki/i);
    this.decksLoadingError = page.getByRole("alert");
    this.retryButton = page.getByRole("button", { name: /Spróbuj ponownie/i });
  }

  /**
   * Navigate to the AI Generate page
   */
  async goto(): Promise<void> {
    await super.goto("/ai/generate");
  }

  /**
   * Wait for the AI Generate view to be visible
   */
  async waitForView(): Promise<void> {
    await expect(this.aiGenerateView).toBeVisible();
    await expect(this.pageTitle).toBeVisible();
  }

  /**
   * Check if the view is visible
   */
  async isViewVisible(): Promise<boolean> {
    return await this.aiGenerateView.isVisible();
  }

  /**
   * Get the page title text
   */
  async getPageTitle(): Promise<string> {
    return (await this.pageTitle.textContent()) || "";
  }

  /**
   * Get the page description text
   */
  async getPageDescription(): Promise<string> {
    return (await this.pageDescription.textContent()) || "";
  }

  /**
   * Check if the decks loading error is displayed
   */
  async hasDecksLoadingError(): Promise<boolean> {
    return await this.decksLoadingError.isVisible();
  }

  /**
   * Get the decks loading error message
   */
  async getDecksLoadingError(): Promise<string> {
    return (await this.decksLoadingError.textContent()) || "";
  }

  /**
   * Click the retry button when decks loading fails
   */
  async clickRetry(): Promise<void> {
    await this.retryButton.click();
  }

  /**
   * Check if the retry button is visible
   */
  async isRetryButtonVisible(): Promise<boolean> {
    return await this.retryButton.isVisible();
  }

  /**
   * Wait for the page to be fully loaded and ready for interaction
   * This includes waiting for the view to be visible and any loading states to complete
   */
  async waitForPageReady(): Promise<void> {
    await this.waitForView();
    // Wait for any potential loading to finish by checking if deck select is enabled
    const deckSelect = this.page.getByTestId("deck-select");
    await expect(deckSelect).toBeEnabled({ timeout: 10000 });
  }
}
