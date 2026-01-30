import { test as base } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";

/**
 * Extended test fixtures with Page Objects
 * This allows for easy access to page objects in tests
 */
type TestFixtures = {
  loginPage: LoginPage;
};

export const test = base.extend<TestFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(loginPage);
  },
});

export { expect } from "@playwright/test";
