import { APIRequestContext, Page } from "@playwright/test";

export interface TestUser {
  email: string;
  password: string;
  accessToken?: string;
  refreshToken?: string;
}

/**
 * Generate a unique test user email
 */
export function generateTestUser(): TestUser {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return {
    email: `test-${timestamp}-${random}@example.com`,
    password: "Test123!@#",
  };
}

/**
 * Register a new test user via API
 */
export async function registerTestUser(
  request: APIRequestContext,
  user: TestUser = generateTestUser()
): Promise<TestUser> {
  const response = await request.post("/api/auth/register", {
    data: {
      email: user.email,
      password: user.password,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to register user: ${response.status()} ${await response.text()}`);
  }

  const data = await response.json();
  
  return {
    ...user,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  };
}

/**
 * Login test user via API
 */
export async function loginTestUser(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<TestUser> {
  const response = await request.post("/api/auth/login", {
    data: { email, password },
  });

  if (!response.ok()) {
    throw new Error(`Failed to login: ${response.status()} ${await response.text()}`);
  }

  const data = await response.json();

  return {
    email,
    password,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  };
}

/**
 * Setup authenticated browser context with tokens
 */
export async function setupAuthenticatedContext(
  request: APIRequestContext,
  user?: TestUser
): Promise<TestUser> {
  // Register new user if not provided
  if (!user) {
    user = await registerTestUser(request);
  }

  return user;
}

/**
 * Set authentication in page storage
 */
export async function setAuthInStorage(
  page: Page,
  user: TestUser
): Promise<void> {
  // Set tokens in localStorage
  await page.addInitScript((tokens: { accessToken?: string; refreshToken?: string }) => {
    if (tokens.accessToken) {
      localStorage.setItem("accessToken", tokens.accessToken);
    }
    if (tokens.refreshToken) {
      localStorage.setItem("refreshToken", tokens.refreshToken);
    }
  }, {
    accessToken: user.accessToken,
    refreshToken: user.refreshToken,
  });
}
