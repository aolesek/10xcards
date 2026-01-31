import { test, expect } from "@playwright/test";
import { LoginPage, DeckDetailsPage, StudyPage } from "./pages";
import { registerTestUser, deleteTestUser, createDeckWithFlashcards, createDeck } from "./helpers/test-user";
import type { TestUser } from "./helpers/test-user";

test.describe("Study Session", () => {
  let testUser: TestUser;
  let loginPage: LoginPage;
  let deckDetailsPage: DeckDetailsPage;
  let studyPage: StudyPage;

  test.beforeEach(async ({ page, request }) => {
    // Initialize Page Objects
    loginPage = new LoginPage(page);
    deckDetailsPage = new DeckDetailsPage(page);
    studyPage = new StudyPage(page);

    // Arrange: Create test user via API (but don't set tokens - we'll login through UI)
    testUser = await registerTestUser(request);
    
    // Login through UI (will automatically navigate to /decks on success)
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
    
    // Wait for page to be ready after login
    await page.waitForURL(/\/decks/, { timeout: 10000 });
  });

  test.afterEach(async ({ page }) => {
    // Cleanup: Delete test user
    if (testUser) {
      await deleteTestUser(page, testUser);
    }
  });

  test("should complete a full study session with 3 flashcards", async ({ page }) => {
    // Arrange: Create a deck with 3 flashcards
    if (!testUser.accessToken) throw new Error("No access token");
    const deckId = await createDeckWithFlashcards(
      page,
      "Test Deck",
      [
        { front: "Question 1", back: "Answer 1" },
        { front: "Question 2", back: "Answer 2" },
        { front: "Question 3", back: "Answer 3" },
      ],
      testUser.accessToken
    );

    // Navigate to deck details
    await deckDetailsPage.goto(deckId);
    await deckDetailsPage.waitForPageLoad();

    // Verify deck has flashcards
    expect(await deckDetailsPage.getFlashcardCount()).toBe(3);
    expect(await deckDetailsPage.isStudyButtonEnabled()).toBe(true);

    // Act: Start study session
    await deckDetailsPage.clickStudy();

    // Verify study page loaded
    await studyPage.waitForPageLoad();
    expect(await studyPage.getDeckName()).toBe("Test Deck");

    // Study all 3 cards
    for (let i = 1; i <= 3; i++) {
      // Verify progress
      const progress = await studyPage.getProgressNumbers();
      expect(progress.current).toBe(i);
      expect(progress.total).toBe(3);

      // Verify question is visible
      const question = await studyPage.getQuestionText();
      expect(question).toBeTruthy();

      // Verify answer is not visible initially
      expect(await studyPage.isAnswerVisible()).toBe(false);

      // Reveal answer using button
      await studyPage.clickReveal();

      // Verify answer is now visible
      expect(await studyPage.isAnswerVisible()).toBe(true);
      const answer = await studyPage.getAnswerText();
      expect(answer).toBeTruthy();

      // Move to next card (or finish if last card)
      await studyPage.clickNext();
    }

    // Assert: Verify summary is displayed
    await studyPage.waitForSummary();
    expect(await studyPage.isSummaryVisible()).toBe(true);

    // Verify total cards studied
    const totalStudied = await studyPage.getTotalCardsStudied();
    expect(totalStudied).toBe(3);
  });

  test("should reveal answer using keyboard shortcut (Space)", async ({ page }) => {
    // Arrange
    if (!testUser.accessToken) throw new Error("No access token");
    const deckId = await createDeckWithFlashcards(
      page,
      "Keyboard Test",
      [{ front: "Test Question", back: "Test Answer" }],
      testUser.accessToken
    );

    await deckDetailsPage.goto(deckId);
    await deckDetailsPage.waitForPageLoad();

    // Act
    await deckDetailsPage.clickStudy();
    await studyPage.waitForPageLoad();

    // Assert: Answer not visible
    expect(await studyPage.isAnswerVisible()).toBe(false);

    // Act: Press space to reveal
    await studyPage.pressSpaceToReveal();

    // Assert: Answer visible
    expect(await studyPage.isAnswerVisible()).toBe(true);
  });

  test("should navigate cards using keyboard shortcuts", async ({ page }) => {
    // Arrange
    if (!testUser.accessToken) throw new Error("No access token");
    const deckId = await createDeckWithFlashcards(
      page,
      "Navigation Test",
      [
        { front: "Question 1", back: "Answer 1" },
        { front: "Question 2", back: "Answer 2" },
        { front: "Question 3", back: "Answer 3" },
      ],
      testUser.accessToken
    );

    await deckDetailsPage.goto(deckId);
    await deckDetailsPage.waitForPageLoad();
    await deckDetailsPage.clickStudy();
    await studyPage.waitForPageLoad();

    // Assert: Start at card 1
    let progress = await studyPage.getProgressNumbers();
    expect(progress.current).toBe(1);

    // Act: Navigate forward with arrow key
    await studyPage.pressArrowRightToNext();

    // Assert: Now at card 2
    progress = await studyPage.getProgressNumbers();
    expect(progress.current).toBe(2);

    // Act: Navigate back with arrow key
    await studyPage.pressArrowLeftToPrevious();

    // Assert: Back at card 1
    progress = await studyPage.getProgressNumbers();
    expect(progress.current).toBe(1);
  });

  test("should reveal answer by clicking on the card", async ({ page }) => {
    // Arrange
    if (!testUser.accessToken) throw new Error("No access token");
    const deckId = await createDeckWithFlashcards(
      page,
      "Click Test",
      [{ front: "Question", back: "Answer" }],
      testUser.accessToken
    );

    await deckDetailsPage.goto(deckId);
    await deckDetailsPage.waitForPageLoad();
    await deckDetailsPage.clickStudy();
    await studyPage.waitForPageLoad();

    // Act: Click on card to reveal
    await studyPage.clickCard();

    // Assert: Answer visible
    expect(await studyPage.isAnswerVisible()).toBe(true);

    // Act: Click again to hide
    await studyPage.clickCard();

    // Assert: Answer hidden
    expect(await studyPage.isAnswerVisible()).toBe(false);
  });

  test("should restart study session from summary", async ({ page }) => {
    // Arrange
    if (!testUser.accessToken) throw new Error("No access token");
    const deckId = await createDeckWithFlashcards(
      page,
      "Restart Test",
      [
        { front: "Question 1", back: "Answer 1" },
        { front: "Question 2", back: "Answer 2" },
      ],
      testUser.accessToken
    );

    await deckDetailsPage.goto(deckId);
    await deckDetailsPage.waitForPageLoad();
    await deckDetailsPage.clickStudy();
    await studyPage.waitForPageLoad();

    // Act: Complete study session
    await studyPage.studyAllCards(true);
    await studyPage.waitForSummary();

    // Assert: Summary visible
    expect(await studyPage.isSummaryVisible()).toBe(true);

    // Act: Click restart
    await studyPage.clickRestart();

    // Assert: Back to first card
    await studyPage.waitForPageLoad();
    const progress = await studyPage.getProgressNumbers();
    expect(progress.current).toBe(1);
    expect(progress.total).toBe(2);
  });

  test("should show empty state when deck has no flashcards", async ({ page }) => {
    // Arrange: Create deck without flashcards
    if (!testUser.accessToken) throw new Error("No access token");
    const deckId = await createDeck(page, "Empty Deck", testUser.accessToken);

    await deckDetailsPage.goto(deckId);
    await deckDetailsPage.waitForPageLoad();

    // Assert: Study button should be disabled
    expect(await deckDetailsPage.isStudyButtonEnabled()).toBe(false);
  });

  test("should disable previous button on first card", async ({ page }) => {
    // Arrange
    if (!testUser.accessToken) throw new Error("No access token");
    const deckId = await createDeckWithFlashcards(
      page,
      "Navigation Test",
      [
        { front: "Q1", back: "A1" },
        { front: "Q2", back: "A2" },
      ],
      testUser.accessToken
    );

    await deckDetailsPage.goto(deckId);
    await deckDetailsPage.waitForPageLoad();
    await deckDetailsPage.clickStudy();
    await studyPage.waitForPageLoad();

    // Assert: Previous button disabled on first card
    expect(await studyPage.isPreviousButtonEnabled()).toBe(false);

    // Act: Go to next card
    await studyPage.clickNext();

    // Assert: Previous button enabled on second card
    expect(await studyPage.isPreviousButtonEnabled()).toBe(true);
  });
});
