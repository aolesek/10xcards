package pl.olesek._xcards.security;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.web.server.LocalServerPort;

import pl.olesek._xcards.integration.BaseIntegrationTest;
import pl.olesek._xcards.security.service.JwtService;
import pl.olesek._xcards.user.UserEntity;

import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

/**
 * Integration tests for security features: JWT validation, IDOR protection, CORS.
 */
@DisplayName("Security Integration Tests")
class SecurityIT extends BaseIntegrationTest {

    @LocalServerPort
    private int port;

    private String validAccessToken;
    private String otherUserAccessToken;
    private UUID userDeckId;
    private UUID otherUserDeckId;

    @BeforeEach
    void setup() {
        RestAssured.port = port;
        RestAssured.baseURI = "http://localhost";

        // Rejestrujemy pierwszego użytkownika
        validAccessToken = given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "email": "user1@example.com",
                          "password": "SecurePassword123!"
                        }
                        """)
                .post("/api/auth/register")
                .then()
                .statusCode(201)
                .extract()
                .path("accessToken");

        // Tworzymy deck dla pierwszego użytkownika
        userDeckId = UUID.fromString(given()
                .header("Authorization", "Bearer " + validAccessToken)
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "name": "User 1 Deck"
                        }
                        """)
                .post("/api/decks")
                .then()
                .statusCode(201)
                .extract()
                .path("id"));

        // Rejestrujemy drugiego użytkownika
        otherUserAccessToken = given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "email": "user2@example.com",
                          "password": "SecurePassword123!"
                        }
                        """)
                .post("/api/auth/register")
                .then()
                .statusCode(201)
                .extract()
                .path("accessToken");

        // Tworzymy deck dla drugiego użytkownika
        otherUserDeckId = UUID.fromString(given()
                .header("Authorization", "Bearer " + otherUserAccessToken)
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "name": "User 2 Deck"
                        }
                        """)
                .post("/api/decks")
                .then()
                .statusCode(201)
                .extract()
                .path("id"));
    }

    // ==================== JWT Security Tests ====================


    @Test
    @DisplayName("Should reject tampered JWT token")
    void shouldRejectTamperedJWT_Returns401() {
        // Given - modyfikujemy token (zmieniamy ostatni znak)
        String tamperedToken = validAccessToken.substring(0, validAccessToken.length() - 5)
                + "XXXXX";

        // When/Then
        given()
                .header("Authorization", "Bearer " + tamperedToken)
                .when()
                .get("/api/auth/me")
                .then()
                .statusCode(401);
    }


    @Test
    @DisplayName("Should reject expired JWT token")
    void shouldRejectExpiredJWT_Returns401() {
        // Given - tworzymy użytkownika i token z bardzo krótkim czasem życia
        UserEntity testUser = new UserEntity();
        testUser.setId(UUID.randomUUID());
        testUser.setEmail("expired@example.com");
        testUser.setRole("USER");

        // Tworzymy JwtService z bardzo krótkim czasem życia (1ms)
        JwtService shortLivedJwtService = new JwtService(
                "test-secret-key-that-is-at-least-256-bits-long-for-security", 1L, 1L);

        String expiredToken = shortLivedJwtService.generateAccessToken(testUser);

        // Czekamy aż token wygaśnie
        try {
            Thread.sleep(100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // When/Then
        given()
                .header("Authorization", "Bearer " + expiredToken)
                .when()
                .get("/api/auth/me")
                .then()
                .statusCode(401);
    }


    @Test
    @DisplayName("Should reject request without Authorization header")
    void shouldRejectRequestWithoutAuthHeader_Returns401() {
        given()
                .when()
                .get("/api/decks")
                .then()
                .statusCode(401);
    }


    @Test
    @DisplayName("Should reject request with invalid Bearer format")
    void shouldRejectInvalidBearerFormat_Returns401() {
        given()
                .header("Authorization", "InvalidFormat " + validAccessToken)
                .when()
                .get("/api/decks")
                .then()
                .statusCode(401);
    }

    // ==================== IDOR Protection Tests ====================


    @Test
    @DisplayName("Should prevent IDOR - user cannot access other user's deck")
    void shouldPreventIDOR_CannotAccessOtherUserDeck_Returns404() {
        // When/Then - User 1 próbuje dostać się do decka User 2
        given()
                .header("Authorization", "Bearer " + validAccessToken)
                .when()
                .get("/api/decks/" + otherUserDeckId)
                .then()
                .statusCode(404) // Powinien zwrócić 404, nie 403 (nie ujawniamy że deck istnieje)
                .body("message", equalTo("Deck not found with id: " + otherUserDeckId));
    }


    @Test
    @DisplayName("Should prevent IDOR - user cannot update other user's deck")
    void shouldPreventIDOR_CannotUpdateOtherUserDeck_Returns404() {
        // When/Then - User 1 próbuje zaktualizować deck User 2
        given()
                .header("Authorization", "Bearer " + validAccessToken)
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "name": "Hacked Deck Name"
                        }
                        """)
                .when()
                .put("/api/decks/" + otherUserDeckId)
                .then()
                .statusCode(404);
    }


    @Test
    @DisplayName("Should prevent IDOR - user cannot delete other user's deck")
    void shouldPreventIDOR_CannotDeleteOtherUserDeck_Returns404() {
        // When/Then - User 1 próbuje usunąć deck User 2
        given()
                .header("Authorization", "Bearer " + validAccessToken)
                .when()
                .delete("/api/decks/" + otherUserDeckId)
                .then()
                .statusCode(404);
    }


    @Test
    @DisplayName("Should allow user to access their own deck")
    void shouldAllowAccessToOwnDeck_Returns200() {
        // When/Then - User 1 dostaje swój własny deck
        given()
                .header("Authorization", "Bearer " + validAccessToken)
                .when()
                .get("/api/decks/" + userDeckId)
                .then()
                .statusCode(200)
                .body("id", equalTo(userDeckId.toString()))
                .body("name", equalTo("User 1 Deck"));
    }

    // ==================== CORS Tests ====================


    @Test
    @DisplayName("Should handle CORS preflight request")
    void shouldHandleCORSPreflight() {
        given()
                .header("Origin", "http://localhost:5173")
                .header("Access-Control-Request-Method", "POST")
                .header("Access-Control-Request-Headers", "Authorization, Content-Type")
                .when()
                .options("/api/auth/register")
                .then()
                .statusCode(200);
        // Note: Dokładne sprawdzenie nagłówków CORS zależy od konfiguracji SecurityConfig
    }

    // ==================== Protected Endpoints Tests ====================


    @Test
    @DisplayName("Public endpoints should be accessible without auth")
    void publicEndpointsShouldBeAccessibleWithoutAuth() {
        // Register endpoint powinien być publiczny
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "email": "public@example.com",
                          "password": "SecurePassword123!"
                        }
                        """)
                .when()
                .post("/api/auth/register")
                .then()
                .statusCode(201);

        // Login endpoint powinien być publiczny
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "email": "public@example.com",
                          "password": "SecurePassword123!"
                        }
                        """)
                .when()
                .post("/api/auth/login")
                .then()
                .statusCode(200);
    }
}
