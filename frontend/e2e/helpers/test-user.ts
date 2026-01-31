import { APIRequestContext, Page } from "@playwright/test";

export interface TestUser {
  email: string;
  password: string;
  accessToken?: string;
  refreshToken?: string;
  createDeck?: (name: string) => Promise<string>;
  createDeckWithFlashcards?: (name: string, flashcards: Array<{ front: string; back: string }>) => Promise<string>;
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

/**
 * Create a deck for the authenticated user via API
 */
export async function createDeck(
  page: Page,
  name: string,
  accessToken: string
): Promise<string> {
  const response = await page.request.post("/api/decks", {
    data: { name },
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create deck: ${response.status()} ${await response.text()}`);
  }

  const data = await response.json();
  return data.id;
}

/**
 * Create a flashcard in a deck via API
 */
export async function createFlashcard(
  page: Page,
  deckId: string,
  front: string,
  back: string,
  accessToken: string
): Promise<string> {
  const response = await page.request.post(`/api/decks/${deckId}/flashcards`, {
    data: { front, back },
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create flashcard: ${response.status()} ${await response.text()}`);
  }

  const data = await response.json();
  return data.id;
}

/**
 * Create a deck with multiple flashcards via API
 */
export async function createDeckWithFlashcards(
  page: Page,
  name: string,
  flashcards: Array<{ front: string; back: string }>,
  accessToken: string
): Promise<string> {
  // Create deck first
  const deckId = await createDeck(page, name, accessToken);

  // Create all flashcards
  for (const flashcard of flashcards) {
    await createFlashcard(page, deckId, flashcard.front, flashcard.back, accessToken);
  }

  return deckId;
}

/**
 * Create and setup a test user with authentication
 * This function registers the user via API and logs them in through the UI
 */
export async function createTestUser(page: Page): Promise<TestUser> {
  // Generate and register user via API
  const user = await registerTestUser(page.request);

  if (!user.accessToken) {
    throw new Error("User registration did not return access token");
  }

  // Set auth tokens in page storage
  await setAuthInStorage(page, user);

  // Create helper methods bound to this user
  const createDeckFn = async (name: string): Promise<string> => {
    if (!user.accessToken) throw new Error("No access token");
    return await createDeck(page, name, user.accessToken);
  };

  const createDeckWithFlashcardsFn = async (
    name: string,
    flashcards: Array<{ front: string; back: string }>
  ): Promise<string> => {
    if (!user.accessToken) throw new Error("No access token");
    return await createDeckWithFlashcards(page, name, flashcards, user.accessToken);
  };

  return {
    ...user,
    createDeck: createDeckFn,
    createDeckWithFlashcards: createDeckWithFlashcardsFn,
  };
}

/**
 * Delete test user (optional cleanup)
 * Note: This is a placeholder - implement if your API supports user deletion
 */
export async function deleteTestUser(
  page: Page,
  user: TestUser
): Promise<void> {
  // Implementation depends on whether your API supports user deletion
  // For now, this is a no-op as each test uses a unique user email
  // The database can be cleaned up separately if needed
  console.log(`Cleanup for user ${user.email} - no action needed (unique test users)`);
}
