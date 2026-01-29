# Testing Guide - 10xCards

Comprehensive guide for testing in the 10xCards application.

## Table of Contents

- [Backend Testing](#backend-testing)
- [Frontend Testing](#frontend-testing)
- [E2E Testing](#e2e-testing)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [Best Practices](#best-practices)

## Backend Testing

### Tech Stack

- **JUnit 5** - Testing framework
- **Mockito** - Mocking framework
- **AssertJ** - Fluent assertions
- **REST Assured** - API testing
- **Testcontainers** - Integration testing with PostgreSQL
- **WireMock** - Mocking external APIs (OpenRouter)
- **Spring Cloud Contract** - Contract testing
- **ArchUnit** - Architecture testing
- **JaCoCo** - Code coverage

### Test Types

#### 1. Unit Tests (`src/test/java/pl/olesek/cards/unit/`)

Test individual components in isolation.

```bash
# Run unit tests only
mvn test -Dtest="*Test"
```

**Example:**
```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    @Mock
    private UserRepository userRepository;
    
    @InjectMocks
    private UserService userService;
    
    @Test
    void shouldCreateUser() {
        // Arrange
        User user = new User("test@example.com");
        when(userRepository.save(any(User.class))).thenReturn(user);
        
        // Act
        User result = userService.createUser(user);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getEmail()).isEqualTo("test@example.com");
        verify(userRepository).save(user);
    }
}
```

#### 2. Integration Tests (`src/test/java/pl/olesek/cards/integration/`)

Test multiple components together with real database (Testcontainers).

```bash
# Run integration tests
mvn verify
```

**Base class:** `BaseIntegrationTest` provides:
- Full Spring context
- PostgreSQL container
- MockMvc for API testing
- Liquibase migrations

**Example:**
```java
class UserControllerIT extends BaseIntegrationTest {
    @Test
    void shouldCreateUserViaAPI() {
        given()
            .contentType(ContentType.JSON)
            .body("""
                {
                    "email": "test@example.com",
                    "password": "password123"
                }
                """)
        .when()
            .post("/api/users")
        .then()
            .statusCode(201)
            .body("email", equalTo("test@example.com"));
    }
}
```

#### 3. Architecture Tests (`src/test/java/pl/olesek/cards/architecture/`)

Enforce architectural rules and best practices.

```bash
# Run architecture tests
mvn test -Dtest="ArchitectureTest"
```

Tests verify:
- Layer dependencies (Controller → Service → Repository)
- Naming conventions
- Annotations usage
- Package structure

#### 4. WireMock Tests (`src/test/java/pl/olesek/cards/integration/wiremock/`)

Mock external API calls (OpenRouter).

```bash
# Run WireMock tests
mvn test -Dtest="*WireMockTest"
```

### Running Backend Tests

```bash
# All tests
mvn clean verify

# Unit tests only
mvn test

# Integration tests only
mvn verify -DskipUnitTests

# With coverage report
mvn clean verify jacoco:report

# View coverage report
open target/site/jacoco/index.html
```

### Code Coverage

JaCoCo is configured with minimum thresholds:
- **Line coverage:** 60%
- **Branch coverage:** 60%

Coverage reports are generated in `target/site/jacoco/`.

## Frontend Testing

### Tech Stack

- **Vitest** - Test framework
- **Testing Library** - Component testing
- **jsdom** - DOM environment
- **User Event** - User interaction simulation

### Test Types

#### 1. Unit Tests

Test individual functions and utilities.

```bash
# Run tests in watch mode
cd frontend
npm test

# Run once
npm run test:run

# With UI
npm run test:ui
```

#### 2. Component Tests (`src/components/__tests__/`)

Test React components with Testing Library.

**Example:**
```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("LoginForm", () => {
  it("should submit form with valid credentials", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    
    render(<LoginForm onSubmit={onSubmit} />);
    
    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    
    expect(onSubmit).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123"
    });
  });
});
```

### Running Frontend Tests

```bash
cd frontend

# Watch mode (development)
npm test

# Run once (CI)
npm run test:run

# With coverage
npm run test:coverage

# Interactive UI
npm run test:ui
```

### Coverage

Coverage reports are generated in `frontend/coverage/`.

Thresholds:
- **Lines:** 60%
- **Functions:** 60%
- **Branches:** 60%
- **Statements:** 60%

## E2E Testing

### Tech Stack

- **Playwright** - E2E testing framework
- **Chromium** - Browser (as per guidelines)

### Structure

```
e2e/
├── fixtures/          # Test fixtures and custom setup
├── pages/            # Page Object Model
│   ├── BasePage.ts
│   └── LoginPage.ts
└── *.spec.ts         # Test specifications
```

### Page Object Model

Use Page Objects for maintainable tests:

```typescript
// e2e/pages/LoginPage.ts
export class LoginPage extends BasePage {
  private readonly emailInput: Locator;
  
  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByLabel("Email");
  }
  
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    // ...
  }
}

// e2e/login.spec.ts
test("should login successfully", async ({ loginPage }) => {
  await loginPage.goto();
  await loginPage.login("test@example.com", "password123");
  await expect(loginPage.page).toHaveURL(/dashboard/);
});
```

### Running E2E Tests

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

### Best Practices

1. **Use locators** - Prefer `getByRole()`, `getByLabel()` over CSS selectors
2. **Browser contexts** - Tests run in isolated contexts
3. **Wait for elements** - Use `waitFor()` for async operations
4. **Visual testing** - Use `expect(page).toHaveScreenshot()` for visual regression
5. **API testing** - Use `request` fixture for backend validation
6. **Trace viewer** - Debug failures with trace files

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-java@v3
        with:
          java-version: '21'
      - run: mvn clean verify
      - uses: codecov/codecov-action@v3
        with:
          files: target/site/jacoco/jacoco.xml

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd frontend && npm ci
      - run: cd frontend && npm run test:run
      - run: cd frontend && npm run test:coverage

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Best Practices

### General

1. **Follow AAA pattern** - Arrange, Act, Assert
2. **One assertion per test** - Keep tests focused
3. **Descriptive names** - Use "should [expected] when [condition]"
4. **Independent tests** - No shared state between tests
5. **Fast tests** - Mock external dependencies
6. **Clean up** - Use `@AfterEach` / `afterEach` hooks

### Backend

1. **Use AssertJ** - Fluent, readable assertions
2. **Mock external calls** - Use WireMock for HTTP, Mockito for code
3. **Test transactions** - Verify rollback behavior
4. **Test security** - Verify authorization rules
5. **Testcontainers** - Use real database for integration tests

### Frontend

1. **Query by role** - Most accessible and resilient
2. **User events** - Use `@testing-library/user-event`
3. **Avoid implementation details** - Test behavior, not implementation
4. **Mock API calls** - Use `vi.mock()` for API clients
5. **Test loading states** - Verify loading indicators

### E2E

1. **Page Object Model** - Organize selectors and actions
2. **Wait strategically** - Use `waitForLoadState("networkidle")`
3. **Parallel execution** - Run tests in parallel for speed
4. **Visual testing** - Catch visual regressions
5. **API for setup** - Use API calls for test data setup

## Debugging

### Backend

```bash
# Run single test
mvn test -Dtest="UserServiceTest#shouldCreateUser"

# Debug in IDE
# Set breakpoints and run test in debug mode
```

### Frontend

```bash
# Watch mode with filter
npm test -- -t "LoginForm"

# UI mode
npm run test:ui

# Browser console
# Use console.log() in tests (shows in terminal)
```

### E2E

```bash
# Debug mode (step through)
npm run test:e2e:debug

# Headed mode (see browser)
npm run test:e2e:headed

# View traces
npm run test:e2e:report
```

## Resources

- [JUnit 5 Documentation](https://junit.org/junit5/docs/current/user-guide/)
- [Mockito Documentation](https://javadoc.io/doc/org.mockito/mockito-core/latest/org/mockito/Mockito.html)
- [AssertJ Documentation](https://assertj.github.io/doc/)
- [REST Assured Documentation](https://rest-assured.io/)
- [Testcontainers Documentation](https://www.testcontainers.org/)
- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Documentation](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
