import { Page, Locator } from "@playwright/test";

/**
 * Page Object for the AI Generate Form
 * Represents the form for generating flashcards with AI
 */
export class AIGenerateForm {
  private readonly page: Page;
  private readonly deckSelect: Locator;
  private readonly createDeckButton: Locator;
  private readonly generationModeSelect: Locator;
  private readonly aiModelSelect: Locator;
  private readonly sourceTextInput: Locator;
  private readonly flashcardCountInput: Locator;
  private readonly submitButton: Locator;
  private readonly formError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.deckSelect = page.getByTestId("deck-select");
    this.createDeckButton = page.getByTestId("create-deck-button");
    this.generationModeSelect = page.getByTestId("generation-mode-select");
    this.aiModelSelect = page.getByTestId("ai-model-select");
    this.sourceTextInput = page.getByTestId("source-text-input");
    this.flashcardCountInput = page.getByTestId("flashcard-count-input");
    this.submitButton = page.getByRole("button", { name: /Generuj/i });
    this.formError = page.getByRole("alert");
  }

  /**
   * Select a deck from the dropdown
   */
  async selectDeck(deckId: string): Promise<void> {
    await this.deckSelect.selectOption(deckId);
  }

  /**
   * Select a deck by visible label
   */
  async selectDeckByLabel(label: string): Promise<void> {
    await this.deckSelect.selectOption({ label });
  }

  /**
   * Get the currently selected deck ID
   */
  async getSelectedDeckId(): Promise<string> {
    return await this.deckSelect.inputValue();
  }

  /**
   * Check if deck select is disabled
   */
  async isDeckSelectDisabled(): Promise<boolean> {
    return await this.deckSelect.isDisabled();
  }

  /**
   * Click the "Create new deck" button to open create deck dialog
   */
  async clickCreateDeck(): Promise<void> {
    await this.createDeckButton.click();
  }

  /**
   * Check if the create deck button is enabled
   */
  async isCreateDeckButtonEnabled(): Promise<boolean> {
    return await this.createDeckButton.isEnabled();
  }

  /**
   * Select a generation mode
   */
  async selectGenerationMode(mode: string): Promise<void> {
    await this.generationModeSelect.selectOption(mode);
  }

  /**
   * Get the currently selected generation mode
   */
  async getSelectedGenerationMode(): Promise<string> {
    return await this.generationModeSelect.inputValue();
  }

  /**
   * Check if generation mode select is disabled
   */
  async isGenerationModeSelectDisabled(): Promise<boolean> {
    return await this.generationModeSelect.isDisabled();
  }

  /**
   * Select an AI model
   */
  async selectAIModel(modelId: string): Promise<void> {
    await this.aiModelSelect.selectOption(modelId);
  }

  /**
   * Get the currently selected AI model
   */
  async getSelectedAIModel(): Promise<string> {
    return await this.aiModelSelect.inputValue();
  }

  /**
   * Check if AI model select is disabled
   */
  async isAIModelSelectDisabled(): Promise<boolean> {
    return await this.aiModelSelect.isDisabled();
  }

  /**
   * Fill the source text textarea
   */
  async fillSourceText(text: string): Promise<void> {
    await this.sourceTextInput.fill(text);
  }

  /**
   * Clear the source text textarea
   */
  async clearSourceText(): Promise<void> {
    await this.sourceTextInput.clear();
  }

  /**
   * Get the current source text value
   */
  async getSourceText(): Promise<string> {
    return await this.sourceTextInput.inputValue();
  }

  /**
   * Check if source text input is disabled
   */
  async isSourceTextDisabled(): Promise<boolean> {
    return await this.sourceTextInput.isDisabled();
  }

  /**
   * Set the flashcard count
   */
  async setFlashcardCount(count: number): Promise<void> {
    await this.flashcardCountInput.fill(count.toString());
  }

  /**
   * Get the current flashcard count
   */
  async getFlashcardCount(): Promise<number> {
    const value = await this.flashcardCountInput.inputValue();
    return parseInt(value, 10);
  }

  /**
   * Check if flashcard count input is disabled
   */
  async isFlashcardCountDisabled(): Promise<boolean> {
    return await this.flashcardCountInput.isDisabled();
  }

  /**
   * Click the submit button to generate flashcards
   */
  async clickSubmit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Check if the submit button is enabled
   */
  async isSubmitButtonEnabled(): Promise<boolean> {
    return await this.submitButton.isEnabled();
  }

  /**
   * Check if the form has an error message
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
   * Check if the form is in submitting state
   */
  async isSubmitting(): Promise<boolean> {
    const loadingIcon = this.submitButton.locator("svg.animate-spin");
    return await loadingIcon.isVisible();
  }

  /**
   * Fill the entire form with provided values
   * Convenience method for complete form setup
   */
  async fillForm(data: {
    deckId?: string;
    mode?: string;
    model?: string;
    sourceText?: string;
    flashcardCount?: number;
  }): Promise<void> {
    if (data.deckId) {
      await this.selectDeck(data.deckId);
    }
    if (data.mode) {
      await this.selectGenerationMode(data.mode);
    }
    if (data.model) {
      await this.selectAIModel(data.model);
    }
    if (data.sourceText) {
      await this.fillSourceText(data.sourceText);
    }
    if (data.flashcardCount !== undefined) {
      await this.setFlashcardCount(data.flashcardCount);
    }
  }

  /**
   * Get all form field error messages
   * Returns an object with field names and their error messages
   */
  async getFieldErrors(): Promise<Record<string, string>> {
    const errors: Record<string, string> = {};

    // Check for deck selection error - look for error near deck select
    const deckError = this.deckSelect.locator('~ p.text-destructive, ~ [role="alert"].text-destructive, ~ p[role="alert"]').first();
    if (await deckError.isVisible().catch(() => false)) {
      errors.deckId = (await deckError.textContent()) || "";
    }

    // Check for mode error
    const modeError = this.generationModeSelect.locator('~ p.text-destructive, ~ p[role="alert"]').first();
    if (await modeError.isVisible().catch(() => false)) {
      errors.mode = (await modeError.textContent()) || "";
    }

    // Check for model error
    const modelError = this.aiModelSelect.locator('~ p.text-destructive, ~ p[role="alert"]').first();
    if (await modelError.isVisible().catch(() => false)) {
      errors.model = (await modelError.textContent()) || "";
    }

    // Check for source text error
    const sourceError = this.sourceTextInput.locator('~ p.text-destructive, ~ p[role="alert"]').first();
    if (await sourceError.isVisible().catch(() => false)) {
      errors.sourceText = (await sourceError.textContent()) || "";
    }

    // Check for flashcard count error
    const countError = this.flashcardCountInput.locator('~ p.text-destructive, ~ p[role="alert"]').first();
    if (await countError.isVisible().catch(() => false)) {
      errors.flashcardCount = (await countError.textContent()) || "";
    }

    return errors;
  }
}
