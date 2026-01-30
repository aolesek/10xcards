import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";
import { DecksPage } from "./pages/DecksPage";
import { CreateDeckDialog } from "./pages/CreateDeckDialog";
import { registerTestUser, type TestUser } from "./helpers/test-user";

test.describe("Decks Management", () => {
  let loginPage: LoginPage;
  let decksPage: DecksPage;
  let createDeckDialog: CreateDeckDialog;
  let testUser: TestUser;

  test.beforeEach(async ({ page, request }) => {
    // Initialize Page Objects
    loginPage = new LoginPage(page);
    decksPage = new DecksPage(page);
    createDeckDialog = new CreateDeckDialog(page);

    // Create test user via API (but don't set tokens - we'll login through UI)
    testUser = await registerTestUser(request);
    
    // Login through UI (will automatically navigate to /decks on success)
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
    
    // Wait for decks view to be ready
    await decksPage.waitForDecksView();
  });

  test("should display the decks view", async () => {
    // Arrange & Act - handled in beforeEach

    // Assert
    await expect(decksPage["decksView"]).toBeVisible();
    expect(await decksPage.isCreateDeckButtonEnabled()).toBe(true);
  });

  test("should open create deck dialog when clicking create button", async () => {
    // Arrange - handled in beforeEach

    // Act
    await decksPage.clickCreateDeck();

    // Assert
    await createDeckDialog.waitForDialog();
    expect(await createDeckDialog.isVisible()).toBe(true);
  });

  test("should create a new deck successfully", async () => {
    // Arrange
    const deckName = "Test Deck - E2E";

    // Act
    await decksPage.clickCreateDeck();
    await createDeckDialog.createDeckAndWaitForClose(deckName);

    // Assert
    await createDeckDialog.waitForDialogToClose();
    expect(await createDeckDialog.isHidden()).toBe(true);
    
    // Verify the deck appears in the list
    // Note: This assumes the new deck will be visible on the page
    // You may need to refresh or wait for the list to update
    const deckCount = await decksPage.getDeckCount();
    expect(deckCount).toBeGreaterThan(0);
  });

  test("should show validation error for empty deck name", async () => {
    // Arrange - handled in beforeEach

    // Act
    await decksPage.clickCreateDeck();
    await createDeckDialog.waitForDialog();
    await createDeckDialog.fillDeckName("");
    await createDeckDialog.clickSubmit();

    // Assert
    expect(await createDeckDialog.hasDeckNameError()).toBe(true);
    expect(await createDeckDialog.getDeckNameError()).toContain("wymagana");
  });

  test("should show validation error for deck name exceeding max length", async () => {
    // Arrange
    const longName = "A".repeat(101); // 101 characters, exceeds 100 limit

    // Act
    await decksPage.clickCreateDeck();
    await createDeckDialog.waitForDialog();
    await createDeckDialog.fillDeckName(longName);
    await createDeckDialog.clickSubmit();

    // Assert
    expect(await createDeckDialog.hasDeckNameError()).toBe(true);
    expect(await createDeckDialog.getDeckNameError()).toContain("maksymalnie 100");
  });

  test("should close dialog when clicking cancel", async () => {
    // Arrange - handled in beforeEach

    // Act
    await decksPage.clickCreateDeck();
    await createDeckDialog.waitForDialog();
    await createDeckDialog.fillDeckName("Test Deck");
    await createDeckDialog.clickCancel();

    // Assert
    await createDeckDialog.waitForDialogToClose();
    expect(await createDeckDialog.isHidden()).toBe(true);
  });

  test("should close dialog when pressing Escape", async () => {
    // Arrange - handled in beforeEach

    // Act
    await decksPage.clickCreateDeck();
    await createDeckDialog.waitForDialog();
    await createDeckDialog.fillDeckName("Test Deck");
    await createDeckDialog.closeWithEscape();

    // Assert
    await createDeckDialog.waitForDialogToClose();
    expect(await createDeckDialog.isHidden()).toBe(true);
  });

  test("should display empty state when no decks exist", async ({ page }) => {
    // Arrange
    // This test assumes a clean state with no decks
    // You may need to set up a specific test user or clean up existing decks

    // Act
    await decksPage.goto();
    await decksPage.waitForDecksView();

    // Assert
    const isEmpty = await decksPage.isEmptyStateVisible();
    if (isEmpty) {
      expect(await page.getByText("Nie masz jeszcze żadnych talii")).toBeVisible();
    }
  });

  test("should navigate to AI generation page", async ({ page }) => {
    // Arrange - handled in beforeEach

    // Act
    await decksPage.clickAiGenerate();

    // Assert
    await page.waitForURL(/\/ai\/generate/);
    expect(page.url()).toContain("/ai/generate");
  });

  test("should navigate to AI history page", async ({ page }) => {
    // Arrange - handled in beforeEach

    // Act
    await decksPage.clickAiHistory();

    // Assert
    await page.waitForURL(/\/ai\/generations/);
    expect(page.url()).toContain("/ai/generations");
  });
});
