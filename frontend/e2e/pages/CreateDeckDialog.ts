import { Page, Locator, expect } from "@playwright/test";

/**
 * Page Object for the Create Deck Dialog
 * Represents the dialog/modal for creating a new deck
 */
export class CreateDeckDialog {
  private readonly page: Page;
  private readonly dialog: Locator;
  private readonly dialogTitle: Locator;
  private readonly dialogDescription: Locator;
  private readonly deckNameInput: Locator;
  private readonly deckNameError: Locator;
  private readonly formError: Locator;
  private readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByTestId("create-deck-dialog");
    this.dialogTitle = this.dialog.getByRole("heading", { name: "Utwórz nową talię" });
    this.dialogDescription = this.dialog.getByText("Podaj nazwę dla swojej nowej talii fiszek");
    this.deckNameInput = page.getByTestId("deck-name-input");
    this.deckNameError = page.getByTestId("deck-name-error");
    this.formError = page.getByTestId("form-error");
    this.submitButton = page.getByTestId("submit-create-deck-button");
  }

  /**
   * Wait for the dialog to be visible
   */
  async waitForDialog(): Promise<void> {
    await expect(this.dialog).toBeVisible();
  }

  /**
   * Check if the dialog is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.dialog.isVisible();
  }

  /**
   * Check if the dialog is hidden
   */
  async isHidden(): Promise<boolean> {
    return await this.dialog.isHidden();
  }

  /**
   * Wait for the dialog to be hidden
   */
  async waitForDialogToClose(): Promise<void> {
    await expect(this.dialog).not.toBeVisible();
  }

  /**
   * Fill the deck name input field
   */
  async fillDeckName(name: string): Promise<void> {
    await this.deckNameInput.fill(name);
  }

  /**
   * Clear the deck name input field
   */
  async clearDeckName(): Promise<void> {
    await this.deckNameInput.clear();
  }

  /**
   * Get the current value of the deck name input
   */
  async getDeckNameValue(): Promise<string> {
    return (await this.deckNameInput.inputValue()) || "";
  }

  /**
   * Click the submit button to create the deck
   */
  async clickSubmit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Close the dialog (using Escape key, as there's no cancel button)
   */
  async clickCancel(): Promise<void> {
    await this.page.keyboard.press("Escape");
  }

  /**
   * Check if the submit button is enabled
   */
  async isSubmitButtonEnabled(): Promise<boolean> {
    return await this.submitButton.isEnabled();
  }

  /**
   * Check if the submit button is in loading state
   */
  async isSubmitting(): Promise<boolean> {
    const loadingIcon = this.submitButton.locator("svg.animate-spin");
    return await loadingIcon.isVisible();
  }

  /**
   * Check if the deck name input is disabled
   */
  async isDeckNameInputDisabled(): Promise<boolean> {
    return await this.deckNameInput.isDisabled();
  }

  /**
   * Check if the deck name validation error is visible
   */
  async hasDeckNameError(): Promise<boolean> {
    return await this.deckNameError.isVisible();
  }

  /**
   * Get the deck name validation error message
   */
  async getDeckNameError(): Promise<string> {
    return (await this.deckNameError.textContent()) || "";
  }

  /**
   * Check if the form error is visible
   */
  async hasFormError(): Promise<boolean> {
    return await this.formError.isVisible();
  }

  /**
   * Get the form error message
   */
  async getFormError(): Promise<string> {
    return (await this.formError.textContent()) || "";
  }

  /**
   * Create a new deck with the given name
   * This is a convenience method that combines multiple actions
   */
  async createDeck(name: string): Promise<void> {
    await this.waitForDialog();
    await this.fillDeckName(name);
    await this.clickSubmit();
  }

  /**
   * Create a new deck and wait for the dialog to close
   */
  async createDeckAndWaitForClose(name: string): Promise<void> {
    await this.createDeck(name);
    await this.waitForDialogToClose();
  }

  /**
   * Close the dialog using ESC key
   */
  async closeWithEscape(): Promise<void> {
    await this.page.keyboard.press("Escape");
  }

  /**
   * Close the dialog by clicking outside of it
   */
  async closeByClickingOutside(): Promise<void> {
    // Click on the overlay/backdrop
    await this.page.locator('[data-radix-dialog-overlay]').click({ position: { x: 1, y: 1 } });
  }
}
