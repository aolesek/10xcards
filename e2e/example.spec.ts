import { test, expect } from "./fixtures/test-fixtures";

/**
 * Example E2E test demonstrating Playwright best practices:
 * - Page Object Model
 * - Browser contexts for isolation
 * - Locators for resilient element selection
 * - Assertions with specific matchers
 */
test.describe("Example Test Suite", () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto("/");
  });

  test("should display the home page", async ({ page }) => {
    // Verify page title
    await expect(page).toHaveTitle(/10xCards/);

    // Verify page is loaded
    await expect(page).toHaveURL(/.*\//);
  });

  test("should navigate to login page", async ({ loginPage }) => {
    // Navigate using Page Object
    await loginPage.goto();

    // Verify we're on the login page
    await expect(loginPage.page).toHaveURL(/.*login/);
  });

  test("should handle login form validation", async ({ loginPage }) => {
    await loginPage.goto();

    // Try to login with empty credentials
    await loginPage.login("", "");

    // This is an example - adjust based on actual validation behavior
    // await expect(loginPage.page).toHaveURL(/.*login/);
  });
});

/**
 * Example of API testing
 */
test.describe("API Tests", () => {
  test("should return 401 for unauthenticated API calls", async ({
    request,
  }) => {
    const response = await request.get("/api/decks");
    expect(response.status()).toBe(401);
  });
});

/**
 * Example of visual comparison test
 */
test.describe("Visual Tests", () => {
  test("should match homepage screenshot", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Visual comparison - will create baseline on first run
    // await expect(page).toHaveScreenshot("homepage.png");
  });
});
