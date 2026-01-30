package pl.olesek._xcards.auth.controller;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.web.server.LocalServerPort;

import pl.olesek._xcards.integration.BaseIntegrationTest;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;

/**
 * Integration tests for AuthController. Tests full auth flow with real database and security.
 */
@DisplayName("Auth Controller Integration Tests")
class AuthControllerIT extends BaseIntegrationTest {

    @LocalServerPort
    private int port;

    @BeforeEach
    void setup() {
        RestAssured.port = port;
        RestAssured.baseURI = "http://localhost";
    }

    // ==================== Register Tests ====================

    @Test
    @DisplayName("Should validate email format and return 400")
    void shouldValidateEmailFormat_Returns400() {
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "email": "invalid-email",
                          "password": "SecurePassword123!"
                        }
                        """)
                .when()
                .post("/api/auth/register")
                .then()
                .statusCode(400)
                .body("status", equalTo(400))
                .body("error", equalTo("Bad Request"))
                .body("message", containsString("email"));
    }

    @Test
    @DisplayName("Should validate password requirements and return 400")
    void shouldValidatePassword_Returns400() {
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "email": "test@example.com",
                          "password": "weak"
                        }
                        """)
                .when()
                .post("/api/auth/register")
                .then()
                .statusCode(400)
                .body("status", equalTo(400))
                .body("message", containsString("password"));
    }

    @Test
    @DisplayName("Should return 409 when email already exists")
    void shouldReturn409WhenEmailExists() {
        // Given - rejestrujemy użytkownika pierwszy raz
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "email": "duplicate@example.com",
                          "password": "SecurePassword123!"
                        }
                        """)
                .post("/api/auth/register")
                .then()
                .statusCode(201);

        // When/Then - próbujemy zarejestrować tego samego użytkownika
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "email": "duplicate@example.com",
                          "password": "AnotherPassword123!"
                        }
                        """)
                .when()
                .post("/api/auth/register")
                .then()
                .statusCode(409)
                .body("status", equalTo(409))
                .body("message", containsString("already exists"));
    }

    // ==================== Login Tests ====================

    @Test
    @DisplayName("Should login successfully and return 200 with tokens")
    void shouldLoginSuccessfully_Returns200() {
        // Given - rejestrujemy użytkownika
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "email": "logintest@example.com",
                          "password": "SecurePassword123!"
                        }
                        """)
                .post("/api/auth/register");

        // When/Then - logujemy się
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "email": "logintest@example.com",
                          "password": "SecurePassword123!"
                        }
                        """)
                .when()
                .post("/api/auth/login")
                .then()
                .statusCode(200)
                .body("accessToken", notNullValue())
                .body("refreshToken", notNullValue())
                .body("email", equalTo("logintest@example.com"));
    }

    @Test
    @DisplayName("Should return 401 for invalid credentials")
    void shouldReturn401ForInvalidCredentials() {
        // Given - rejestrujemy użytkownika
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "email": "user@example.com",
                          "password": "CorrectPassword123!"
                        }
                        """)
                .post("/api/auth/register");

        // When/Then - próbujemy zalogować z błędnym hasłem
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "email": "user@example.com",
                          "password": "WrongPassword123!"
                        }
                        """)
                .when()
                .post("/api/auth/login")
                .then()
                .statusCode(401)
                .body("status", equalTo(401))
                .body("message", containsString("Invalid"));
    }

    // ==================== Refresh Token Tests ====================

    @Test
    @DisplayName("Should refresh token and return 200 with new tokens")
    void shouldRefreshToken_Returns200() {
        // Given - rejestrujemy i pobieramy refresh token
        String refreshToken = given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "email": "refreshtest@example.com",
                          "password": "SecurePassword123!"
                        }
                        """)
                .post("/api/auth/register")
                .then()
                .statusCode(201)
                .extract()
                .path("refreshToken");

        // When/Then - odświeżamy token
        given()
                .contentType(ContentType.JSON)
                .body(String.format("""
                        {
                          "refreshToken": "%s"
                        }
                        """, refreshToken))
                .when()
                .post("/api/auth/refresh")
                .then()
                .statusCode(200)
                .body("accessToken", notNullValue())
                .body("refreshToken", notNullValue());
    }

    @Test
    @DisplayName("Should return 401 for invalid refresh token")
    void shouldReturn401ForInvalidRefreshToken() {
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "refreshToken": "invalid-token-12345"
                        }
                        """)
                .when()
                .post("/api/auth/refresh")
                .then()
                .statusCode(401)
                .body("status", equalTo(401));
    }

    // ==================== Logout Tests ====================

    @Test
    @DisplayName("Should logout successfully and return 204")
    void shouldLogoutSuccessfully_Returns204() {
        // Given - rejestrujemy i pobieramy access token
        String accessToken = given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "email": "logouttest@example.com",
                          "password": "SecurePassword123!"
                        }
                        """)
                .post("/api/auth/register")
                .then()
                .statusCode(201)
                .extract()
                .path("accessToken");

        // When/Then - wylogowujemy się
        given()
                .header("Authorization", "Bearer " + accessToken)
                .when()
                .post("/api/auth/logout")
                .then()
                .statusCode(204);
    }

    @Test
    @DisplayName("Should return 401 when accessing protected endpoint after logout")
    void shouldReturn401AfterLogout() {
        // Given - rejestrujemy, pobieramy token i wylogowujemy
        String accessToken = given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "email": "blacklisttest@example.com",
                          "password": "SecurePassword123!"
                        }
                        """)
                .post("/api/auth/register")
                .then()
                .extract()
                .path("accessToken");

        given()
                .header("Authorization", "Bearer " + accessToken)
                .post("/api/auth/logout")
                .then()
                .statusCode(204);

        // When/Then - próbujemy użyć zablacklistowanego tokenu
        given()
                .header("Authorization", "Bearer " + accessToken)
                .when()
                .get("/api/auth/me")
                .then()
                .statusCode(401);
    }

    // ==================== Get Current User Tests ====================

    @Test
    @DisplayName("Should get current user info and return 200")
    void shouldGetCurrentUser_Returns200() {
        // Given - rejestrujemy i pobieramy token
        String accessToken = given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "email": "metest@example.com",
                          "password": "SecurePassword123!"
                        }
                        """)
                .post("/api/auth/register")
                .then()
                .extract()
                .path("accessToken");

        // When/Then - pobieramy info o użytkowniku
        given()
                .header("Authorization", "Bearer " + accessToken)
                .when()
                .get("/api/auth/me")
                .then()
                .statusCode(200)
                .body("email", equalTo("metest@example.com"))
                .body("role", equalTo("USER"))
                .body("monthlyAiLimit", notNullValue())
                .body("aiUsageInCurrentMonth", notNullValue());
    }

    @Test
    @DisplayName("Should return 401 when accessing /me without token")
    void shouldReturn401WithoutToken() {
        given()
                .when()
                .get("/api/auth/me")
                .then()
                .statusCode(401);
    }

    // ==================== Password Reset Tests ====================

    @Test
    @DisplayName("Should request password reset and return 200")
    void shouldRequestPasswordReset_Returns200() {
        // Given - rejestrujemy użytkownika
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "email": "resettest@example.com",
                          "password": "SecurePassword123!"
                        }
                        """)
                .post("/api/auth/register");

        // When/Then - żądamy resetu hasła
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "email": "resettest@example.com"
                        }
                        """)
                .when()
                .post("/api/auth/password-reset/request")
                .then()
                .statusCode(200)
                .body("message", containsString("password reset link"));
    }

    @Test
    @DisplayName("Should not reveal if email exists in password reset")
    void shouldNotRevealEmailExistence() {
        // When/Then - żądamy resetu dla nieistniejącego emaila
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "email": "nonexistent@example.com"
                        }
                        """)
                .when()
                .post("/api/auth/password-reset/request")
                .then()
                .statusCode(200)
                .body("message", containsString("password reset link")); // Ten sam komunikat!
    }
}
