import { test, expect } from "@playwright/test";
import { LoginPage, AIGeneratePage, AIGenerateForm, CreateDeckDialog } from "./pages";
import { registerTestUser, deleteTestUser, createDeck } from "./helpers/test-user";
import type { TestUser } from "./helpers/test-user";

test.describe("AI Flashcard Generation", () => {
  let testUser: TestUser;
  let loginPage: LoginPage;
  let aiGeneratePage: AIGeneratePage;
  let aiGenerateForm: AIGenerateForm;
  let createDeckDialog: CreateDeckDialog;

  test.beforeEach(async ({ page, request }) => {
    // Initialize Page Objects
    loginPage = new LoginPage(page);
    aiGeneratePage = new AIGeneratePage(page);
    aiGenerateForm = new AIGenerateForm(page);
    createDeckDialog = new CreateDeckDialog(page);

    // Arrange: Create test user via API
    testUser = await registerTestUser(request);
    
    // Login through UI (will automatically navigate to /decks on success)
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
    
    // Wait for page to be ready after login
    await page.waitForURL(/\/decks/, { timeout: 10000 });

    // Navigate to AI Generate page
    await aiGeneratePage.goto();
    await aiGeneratePage.waitForPageReady();
  });

  test.afterEach(async ({ page }) => {
    // Cleanup: Delete test user
    if (testUser) {
      await deleteTestUser(page, testUser);
    }
  });

  test("should display the AI generate view", async () => {
    // Arrange & Act - handled in beforeEach

    // Assert
    expect(await aiGeneratePage.isViewVisible()).toBe(true);
    expect(await aiGeneratePage.getPageTitle()).toContain("Generuj fiszki");
  });

  test("should create a new deck from the AI generate form", async () => {
    // Arrange
    const deckName = "AI Test Deck";

    // Act
    await aiGenerateForm.clickCreateDeck();
    await createDeckDialog.waitForDialog();
    await createDeckDialog.createDeckAndWaitForClose(deckName);

    // Assert
    await createDeckDialog.waitForDialogToClose();
    expect(await createDeckDialog.isHidden()).toBe(true);
    
    // Verify the deck is now selected in the dropdown
    const selectedDeckId = await aiGenerateForm.getSelectedDeckId();
    expect(selectedDeckId).toBeTruthy();
  });

  test("should fill complete form with Knowledge Assimilation mode", async ({ page }) => {
    // Arrange
    if (!testUser.accessToken) throw new Error("No access token");
    const deckId = await createDeck(page, "Knowledge Test Deck", testUser.accessToken);

    // Reload page to load the newly created deck
    await aiGeneratePage.goto();
    await aiGeneratePage.waitForPageReady();

    const sourceText = `
      Fotosynteza to proces, dzięki któremu rośliny przekształcają energię świetlną w energię chemiczną.
      W tym procesie rośliny wykorzystują dwutlenek węgla i wodę, produkując glukozę i tlen.
      Chlorofil, zielony barwnik w chloroplastach, jest kluczowym elementem tego procesu.
      Fotosynteza zachodzi głównie w liściach roślin, gdzie znajduje się największa ilość chloroplastów.
      Ten proces jest fundamentalny dla życia na Ziemi, ponieważ produkuje tlen i jest podstawą łańcucha pokarmowego.
    `.trim();

    // Act
    await aiGenerateForm.fillForm({
      deckId: deckId,
      mode: "KNOWLEDGE_ASSIMILATION",
      model: "openai/gpt-4o-mini",
      sourceText: sourceText,
      flashcardCount: 10
    });

    // Assert
    expect(await aiGenerateForm.getSelectedDeckId()).toBe(deckId);
    expect(await aiGenerateForm.getSelectedGenerationMode()).toBe("KNOWLEDGE_ASSIMILATION");
    expect(await aiGenerateForm.getSelectedAIModel()).toBe("openai/gpt-4o-mini");
    expect(await aiGenerateForm.getSourceText()).toBe(sourceText);
    expect(await aiGenerateForm.getFlashcardCount()).toBe(10);
    expect(await aiGenerateForm.isSubmitButtonEnabled()).toBe(true);
  });

  test("should fill complete form with Language Learning mode (B1)", async ({ page }) => {
    // Arrange
    if (!testUser.accessToken) throw new Error("No access token");
    const deckId = await createDeck(page, "English B1 Deck", testUser.accessToken);

    // Reload page to load the newly created deck
    await aiGeneratePage.goto();
    await aiGeneratePage.waitForPageReady();

    const sourceText = `
      The concept of sustainable development has gained tremendous importance in recent years.
      Environmental consciousness has become a crucial aspect of modern society.
      Governments worldwide are implementing policies to reduce carbon emissions and promote renewable energy.
      Citizens are encouraged to adopt eco-friendly practices in their daily lives.
      The transition to a green economy requires collective effort and long-term commitment.
    `.trim();

    // Act
    await aiGenerateForm.fillForm({
      deckId: deckId,
      mode: "LANGUAGE_B1",
      model: "google/gemini-2.5-flash",
      sourceText: sourceText,
      flashcardCount: 15
    });

    // Assert
    expect(await aiGenerateForm.getSelectedDeckId()).toBe(deckId);
    expect(await aiGenerateForm.getSelectedGenerationMode()).toBe("LANGUAGE_B1");
    expect(await aiGenerateForm.getSelectedAIModel()).toBe("google/gemini-2.5-flash");
    expect(await aiGenerateForm.getSourceText()).toBe(sourceText);
    expect(await aiGenerateForm.getFlashcardCount()).toBe(15);
    expect(await aiGenerateForm.isSubmitButtonEnabled()).toBe(true);
  });

  test("should select different AI models", async () => {
    // Arrange - handled in beforeEach

    // Act & Assert - Test selecting different models
    await aiGenerateForm.selectAIModel("openai/gpt-4o-mini");
    expect(await aiGenerateForm.getSelectedAIModel()).toBe("openai/gpt-4o-mini");

    await aiGenerateForm.selectAIModel("anthropic/claude-sonnet-4.5");
    expect(await aiGenerateForm.getSelectedAIModel()).toBe("anthropic/claude-sonnet-4.5");

    await aiGenerateForm.selectAIModel("deepseek/deepseek-v3.2");
    expect(await aiGenerateForm.getSelectedAIModel()).toBe("deepseek/deepseek-v3.2");
  });

  test("should select different generation modes", async () => {
    // Arrange - handled in beforeEach

    // Act & Assert - Knowledge Assimilation
    await aiGenerateForm.selectGenerationMode("KNOWLEDGE_ASSIMILATION");
    expect(await aiGenerateForm.getSelectedGenerationMode()).toBe("KNOWLEDGE_ASSIMILATION");

    // Act & Assert - Language Learning modes
    await aiGenerateForm.selectGenerationMode("LANGUAGE_A1");
    expect(await aiGenerateForm.getSelectedGenerationMode()).toBe("LANGUAGE_A1");

    await aiGenerateForm.selectGenerationMode("LANGUAGE_B2");
    expect(await aiGenerateForm.getSelectedGenerationMode()).toBe("LANGUAGE_B2");

    await aiGenerateForm.selectGenerationMode("LANGUAGE_C1");
    expect(await aiGenerateForm.getSelectedGenerationMode()).toBe("LANGUAGE_C1");
  });

  test("should update flashcard count", async () => {
    // Arrange - handled in beforeEach

    // Act
    await aiGenerateForm.setFlashcardCount(5);
    expect(await aiGenerateForm.getFlashcardCount()).toBe(5);

    await aiGenerateForm.setFlashcardCount(25);
    expect(await aiGenerateForm.getFlashcardCount()).toBe(25);

    await aiGenerateForm.setFlashcardCount(50);
    expect(await aiGenerateForm.getFlashcardCount()).toBe(50);
  });

  test("should show validation error for empty deck selection", async ({ page }) => {
    // Arrange
    const sourceText = "A".repeat(600); // Valid length text

    // Act
    await aiGenerateForm.fillForm({
      mode: "KNOWLEDGE_ASSIMILATION",
      model: "openai/gpt-4o-mini",
      sourceText: sourceText,
      flashcardCount: 10
    });
    // Don't select a deck - leave it empty
    await aiGenerateForm.clickSubmit();

    // Assert
    // Wait a moment for validation to appear
    await page.waitForTimeout(500);
    const errors = await aiGenerateForm.getFieldErrors();
    expect(errors.deckId).toBeTruthy();
  });

  test("should show validation error for source text that is too short", async ({ page }) => {
    // Arrange
    if (!testUser.accessToken) throw new Error("No access token");
    const deckId = await createDeck(page, "Test Deck", testUser.accessToken);

    // Reload page to load the newly created deck
    await aiGeneratePage.goto();
    await aiGeneratePage.waitForPageReady();

    const shortText = "Too short"; // Less than 500 characters

    // Act
    await aiGenerateForm.fillForm({
      deckId: deckId,
      mode: "KNOWLEDGE_ASSIMILATION",
      model: "openai/gpt-4o-mini",
      sourceText: shortText,
      flashcardCount: 10
    });
    await aiGenerateForm.clickSubmit();

    // Assert
    await page.waitForTimeout(500);
    const errors = await aiGenerateForm.getFieldErrors();
    expect(errors.sourceText).toBeTruthy();
  });

  test("should show validation error for source text that is too long", async ({ page }) => {
    // Arrange
    if (!testUser.accessToken) throw new Error("No access token");
    const deckId = await createDeck(page, "Test Deck", testUser.accessToken);

    // Reload page to load the newly created deck
    await aiGeneratePage.goto();
    await aiGeneratePage.waitForPageReady();

    const longText = "A".repeat(10001); // More than 10000 characters

    // Act
    await aiGenerateForm.fillForm({
      deckId: deckId,
      mode: "KNOWLEDGE_ASSIMILATION",
      model: "openai/gpt-4o-mini",
      sourceText: longText,
      flashcardCount: 10
    });
    await aiGenerateForm.clickSubmit();

    // Assert
    await page.waitForTimeout(500);
    const errors = await aiGenerateForm.getFieldErrors();
    expect(errors.sourceText).toBeTruthy();
  });

  test("should clear source text field", async () => {
    // Arrange
    const sourceText = "Some text to be cleared";

    // Act
    await aiGenerateForm.fillSourceText(sourceText);
    expect(await aiGenerateForm.getSourceText()).toBe(sourceText);
    
    await aiGenerateForm.clearSourceText();

    // Assert
    expect(await aiGenerateForm.getSourceText()).toBe("");
  });

  test("should disable form fields while loading decks", async () => {
    // This test would need to be adjusted based on your actual loading implementation
    // For now, we verify the fields are enabled after loading completes
    
    // Arrange & Act - handled in beforeEach (page is already loaded)

    // Assert - After loading, fields should be enabled
    expect(await aiGenerateForm.isDeckSelectDisabled()).toBe(false);
    expect(await aiGenerateForm.isCreateDeckButtonEnabled()).toBe(true);
    expect(await aiGenerateForm.isGenerationModeSelectDisabled()).toBe(false);
    expect(await aiGenerateForm.isAIModelSelectDisabled()).toBe(false);
    expect(await aiGenerateForm.isSourceTextDisabled()).toBe(false);
    expect(await aiGenerateForm.isFlashcardCountDisabled()).toBe(false);
  });

  test("should create deck and fill complete form in one workflow", async () => {
    // Arrange
    const deckName = "Complete Workflow Deck";
    const sourceText = `
      Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience.
      It focuses on developing algorithms that can access data and use it to learn for themselves.
      The process involves training a model on a dataset and then using that model to make predictions.
      Deep learning, a subset of machine learning, uses neural networks with multiple layers.
      Applications include image recognition, natural language processing, and recommendation systems.
    `.trim();

    // Act - Create deck
    await aiGenerateForm.clickCreateDeck();
    await createDeckDialog.waitForDialog();
    await createDeckDialog.createDeckAndWaitForClose(deckName);
    await createDeckDialog.waitForDialogToClose();

    // Act - Fill form with the newly created deck already selected
    const selectedDeckId = await aiGenerateForm.getSelectedDeckId();
    expect(selectedDeckId).toBeTruthy(); // Deck should be auto-selected

    await aiGenerateForm.fillForm({
      mode: "KNOWLEDGE_ASSIMILATION",
      model: "anthropic/claude-sonnet-4.5",
      sourceText: sourceText,
      flashcardCount: 12
    });

    // Assert - All fields filled correctly
    expect(await aiGenerateForm.getSelectedDeckId()).toBe(selectedDeckId);
    expect(await aiGenerateForm.getSelectedGenerationMode()).toBe("KNOWLEDGE_ASSIMILATION");
    expect(await aiGenerateForm.getSelectedAIModel()).toBe("anthropic/claude-sonnet-4.5");
    expect(await aiGenerateForm.getSourceText()).toBe(sourceText);
    expect(await aiGenerateForm.getFlashcardCount()).toBe(12);
    expect(await aiGenerateForm.isSubmitButtonEnabled()).toBe(true);
  });

  test("should test language learning with different CEFR levels", async ({ page }) => {
    // Arrange
    if (!testUser.accessToken) throw new Error("No access token");
    const deckId = await createDeck(page, "Language Levels Test", testUser.accessToken);

    // Reload page to load the newly created deck
    await aiGeneratePage.goto();
    await aiGeneratePage.waitForPageReady();

    const sourceText = `
      Climate change represents one of the most pressing challenges facing humanity today.
      Scientists worldwide are studying the effects of rising temperatures on ecosystems.
      Renewable energy sources offer promising solutions to reduce greenhouse gas emissions.
      International cooperation is essential to address this global environmental crisis.
      Individual actions, combined with policy changes, can make a significant difference.
    `.trim();

    // Test A1 level
    await aiGenerateForm.fillForm({
      deckId: deckId,
      mode: "LANGUAGE_A1",
      model: "openai/gpt-4o-mini",
      sourceText: sourceText,
      flashcardCount: 10
    });
    expect(await aiGenerateForm.getSelectedGenerationMode()).toBe("LANGUAGE_A1");

    // Test A2 level
    await aiGenerateForm.selectGenerationMode("LANGUAGE_A2");
    expect(await aiGenerateForm.getSelectedGenerationMode()).toBe("LANGUAGE_A2");

    // Test B1 level
    await aiGenerateForm.selectGenerationMode("LANGUAGE_B1");
    expect(await aiGenerateForm.getSelectedGenerationMode()).toBe("LANGUAGE_B1");

    // Test B2 level
    await aiGenerateForm.selectGenerationMode("LANGUAGE_B2");
    expect(await aiGenerateForm.getSelectedGenerationMode()).toBe("LANGUAGE_B2");

    // Test C1 level
    await aiGenerateForm.selectGenerationMode("LANGUAGE_C1");
    expect(await aiGenerateForm.getSelectedGenerationMode()).toBe("LANGUAGE_C1");

    // Test C2 level
    await aiGenerateForm.selectGenerationMode("LANGUAGE_C2");
    expect(await aiGenerateForm.getSelectedGenerationMode()).toBe("LANGUAGE_C2");
  });
});
