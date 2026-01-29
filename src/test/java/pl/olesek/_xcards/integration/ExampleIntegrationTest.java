package pl.olesek._xcards.integration;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.jdbc.Sql;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

/**
 * Example integration test demonstrating: - REST Assured for API testing - Testcontainers for
 * PostgreSQL - Spring Security testing - Database state management with @Sql
 */
@DisplayName("Example Integration Test")
class ExampleIntegrationTest extends BaseIntegrationTest {

    @LocalServerPort
    private int port;

    @BeforeEach
    void setup() {
        RestAssured.port = port;
        RestAssured.baseURI = "http://localhost";
    }

    @Test
    @DisplayName("Should return 401 for unauthenticated requests")
    void shouldReturn401ForUnauthenticatedRequests() {
        given()
                .contentType(ContentType.JSON)
                .when()
                .get("/api/decks")
                .then()
                .statusCode(401);
    }

    @Test
    @DisplayName("Health endpoint should return UP")
    void healthEndpointShouldReturnUp() {
        given()
                .when()
                .get("/actuator/health")
                .then()
                .statusCode(200)
                .body("status", equalTo("UP"));
    }

    @Test
    @DisplayName("Should create and retrieve data from database")
    @Sql(scripts = "/test-data/cleanup.sql", executionPhase = Sql.ExecutionPhase.AFTER_TEST_METHOD)
    void shouldCreateAndRetrieveDataFromDatabase() {
        // This is an example - adjust based on your actual API
        // Test that data persists correctly using Testcontainers PostgreSQL

        // Example structure:
        // 1. POST data
        // 2. Verify response
        // 3. GET data
        // 4. Verify retrieved data matches
    }
}
