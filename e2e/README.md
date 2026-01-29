# E2E Tests

End-to-end tests using Playwright with Page Object Model pattern.

## Structure

- `pages/` - Page Object Model classes
- `fixtures/` - Test fixtures and custom setup
- `*.spec.ts` - Test specifications

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Interactive UI mode
npm run test:e2e:ui

# Headed mode (see browser)
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug

# Generate tests using codegen
npm run test:e2e:codegen

# View test report
npm run test:e2e:report
```

## Writing Tests

### Use Page Object Model

```typescript
import { test, expect } from "./fixtures/test-fixtures";

test.describe("Feature Name", () => {
  test("should do something", async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login("user@example.com", "password");
    await expect(loginPage.page).toHaveURL(/dashboard/);
  });
});
```

### Best Practices

1. **Use descriptive test names** - "should [expected] when [condition]"
2. **Use Page Objects** - Keep selectors in page classes
3. **Use proper locators** - Prefer `getByRole()`, `getByLabel()`
4. **Wait for states** - Use `waitForLoadState()` when needed
5. **Isolate tests** - Each test should be independent
6. **Use fixtures** - Extend test fixtures for common setup

## Guidelines

Based on `.ai/rules/e2e-testing.mdc`:

- ✅ Chromium/Desktop Chrome browser only
- ✅ Browser contexts for isolation
- ✅ Page Object Model pattern
- ✅ Resilient locators
- ✅ API testing for backend validation
- ✅ Visual comparison with screenshots
- ✅ Codegen tool for test recording
- ✅ Trace viewer for debugging
- ✅ Test hooks (beforeEach/afterEach)
- ✅ Specific assertion matchers
- ✅ Parallel execution

## Debugging

```bash
# Step through test with debugger
npm run test:e2e:debug

# See browser actions
npm run test:e2e:headed

# View trace after failure
npm run test:e2e:report
```

## CI/CD

Tests run automatically in GitHub Actions with:
- Chromium browser
- Headless mode
- Parallel execution
- Artifact upload for reports
