# Backend Tests

Backend tests using JUnit 5, Mockito, AssertJ, and other testing libraries.

## Structure

```
src/test/java/pl/olesek/cards/
├── unit/              # Unit tests
├── integration/       # Integration tests
│   ├── wiremock/     # WireMock tests for external APIs
│   └── ...
├── architecture/      # Architecture tests (ArchUnit)
└── contract/          # Contract tests (Spring Cloud Contract)
```

## Test Types

### Unit Tests (`unit/`)

Test individual components in isolation using mocks.

**Naming:** `*Test.java`

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
    }
}
```

### Integration Tests (`integration/`)

Test multiple components with real database (Testcontainers).

**Naming:** `*IT.java` or `*IntegrationTest.java`

**Base class:** `BaseIntegrationTest` provides:
- Spring context
- PostgreSQL container
- MockMvc
- Liquibase migrations

```java
class UserControllerIT extends BaseIntegrationTest {
    @Test
    void shouldCreateUser() {
        given()
            .contentType(ContentType.JSON)
            .body("{\"email\":\"test@example.com\"}")
        .when()
            .post("/api/users")
        .then()
            .statusCode(201);
    }
}
```

### Architecture Tests (`architecture/`)

Enforce architectural rules using ArchUnit.

```java
@Test
void layersShouldBeRespected() {
    ArchRule rule = layeredArchitecture()
        .layer("Controller").definedBy("..controller..")
        .layer("Service").definedBy("..service..")
        .layer("Repository").definedBy("..repository..")
        .whereLayer("Controller").mayNotBeAccessedByAnyLayer()
        .whereLayer("Service").mayOnlyBeAccessedByLayers("Controller");
    
    rule.check(importedClasses);
}
```

### WireMock Tests (`integration/wiremock/`)

Mock external APIs (OpenRouter).

```java
@WireMockTest(httpPort = 8089)
class OpenRouterWireMockTest {
    @Test
    void shouldMockOpenRouterResponse() {
        stubFor(post("/api/v1/chat/completions")
            .willReturn(ok()
                .withHeader("Content-Type", "application/json")
                .withBody("{\"response\":\"test\"}")));
        
        // Test your service
    }
}
```

## Running Tests

```bash
# All tests
mvn clean verify

# Unit tests only
mvn test

# Integration tests only
mvn verify -DskipUnitTests

# Specific test class
mvn test -Dtest="UserServiceTest"

# Specific test method
mvn test -Dtest="UserServiceTest#shouldCreateUser"

# With coverage
mvn clean verify jacoco:report
```

## Test Data

Test data SQL scripts are in `src/test/resources/test-data/`:
- `cleanup.sql` - Clean up data after tests

Use with `@Sql` annotation:
```java
@Test
@Sql(scripts = "/test-data/cleanup.sql", 
     executionPhase = Sql.ExecutionPhase.AFTER_TEST_METHOD)
void testWithCleanup() {
    // Test
}
```

## Best Practices

### General
1. **AAA pattern** - Arrange, Act, Assert
2. **One test, one responsibility** - Test one thing
3. **Descriptive names** - `shouldDoSomethingWhenCondition`
4. **Independent tests** - No shared state
5. **Fast tests** - Mock external dependencies

### Unit Tests
1. **Use @Mock and @InjectMocks** - Mockito annotations
2. **Verify interactions** - `verify()` mock calls
3. **Use AssertJ** - Fluent assertions
4. **Test edge cases** - null, empty, invalid input
5. **Mock at boundaries** - Repository, HTTP clients

### Integration Tests
1. **Extend BaseIntegrationTest** - Get PostgreSQL container
2. **Use REST Assured** - For API testing
3. **Clean up data** - Use @Sql scripts
4. **Test security** - Verify authorization
5. **Test transactions** - Verify rollback behavior

### Architecture Tests
1. **Enforce layers** - Controller → Service → Repository
2. **Verify annotations** - @Service, @Repository
3. **Check naming** - Consistent naming conventions
4. **Package structure** - Proper organization
5. **Dependencies** - No circular dependencies

## Code Coverage

JaCoCo reports are generated in `target/site/jacoco/`.

Minimum thresholds:
- **Line coverage:** 60%
- **Branch coverage:** 60%

View report:
```bash
mvn clean verify jacoco:report
open target/site/jacoco/index.html
```

## Debugging

### In IDE (IntelliJ IDEA)
1. Set breakpoints
2. Right-click test
3. "Debug 'TestName'"

### Command Line
```bash
mvn test -Dtest="TestName" -Dmaven.surefire.debug
```

Then attach debugger to port 5005.

## Resources

- [JUnit 5 Documentation](https://junit.org/junit5/docs/current/user-guide/)
- [Mockito Documentation](https://javadoc.io/doc/org.mockito/mockito-core/latest/org/mockito/Mockito.html)
- [AssertJ Documentation](https://assertj.github.io/doc/)
- [REST Assured Documentation](https://rest-assured.io/)
- [Testcontainers Documentation](https://www.testcontainers.org/)
- [ArchUnit Documentation](https://www.archunit.org/userguide/html/000_Index.html)
