package pl.olesek._xcards.ai.controller;

import com.github.tomakehurst.wiremock.junit5.WireMockTest;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import pl.olesek._xcards.integration.BaseIntegrationTest;

import java.util.UUID;

import static com.github.tomakehurst.wiremock.client.WireMock.ok;
import static com.github.tomakehurst.wiremock.client.WireMock.post;
import static com.github.tomakehurst.wiremock.client.WireMock.stubFor;
import static com.github.tomakehurst.wiremock.client.WireMock.urlEqualTo;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.notNullValue;

/**
 * Integration tests for AIGenerationController. Tests AI generation flow with mocked OpenRouter.
 */
@DisplayName("AI Generation Controller Integration Tests")
@WireMockTest(httpPort = 8089)
class AIGenerationControllerIT extends BaseIntegrationTest {

    @LocalServerPort
    private int port;

    private String accessToken;
    private UUID deckId;

    @DynamicPropertySource
    static void configureWireMockProperties(DynamicPropertyRegistry registry) {
        // Przekieruj wywołania AI na WireMock
        registry.add("app.ai.openrouter.base-url", () -> "http://localhost:8089/api/v1");
        registry.add("app.ai.openrouter.api-key", () -> "test-api-key");
    }

    @BeforeEach
    void setup() {
        RestAssured.port = port;
        RestAssured.baseURI = "http://localhost";

        // Setup WireMock stub dla OpenRouter
        setupOpenRouterMock();

        // Rejestrujemy użytkownika i tworzymy deck
        accessToken = given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "email": "aitest@example.com",
                          "password": "SecurePassword123!"
                        }
                        """)
                .post("/api/auth/register")
                .then()
                .statusCode(201)
                .extract()
                .path("accessToken");

        deckId = UUID.fromString(given()
                .header("Authorization", "Bearer " + accessToken)
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "name": "Test Deck for AI"
                        }
                        """)
                .post("/api/decks")
                .then()
                .statusCode(201)
                .extract()
                .path("id"));
    }


    private void setupOpenRouterMock() {
        // Mock successful OpenRouter response
        stubFor(post(urlEqualTo("/api/v1/chat/completions"))
                .willReturn(ok()
                        .withHeader("Content-Type", "application/json")
                        .withBody(
                                """
                                        {
                                          "id": "gen-123",
                                          "model": "openai/gpt-4o-mini",
                                          "choices": [{
                                            "message": {
                                              "role": "assistant",
                                              "content": "[{\\"front\\": \\"What is photosynthesis?\\", \\"back\\": \\"Process by which plants convert light energy into chemical energy\\"},{\\"front\\": \\"What is chlorophyll?\\", \\"back\\": \\"Green pigment in plants that absorbs light\\"}]"
                                            },
                                            "finish_reason": "stop"
                                          }]
                                        }
                                        """)));
    }

    // ==================== Generate Tests ====================

    @Test
    @DisplayName("Should generate flashcard candidates and return 201")
    void shouldGenerateCandidates_Returns201() {
        String sourceText =
                "Photosynthesis is the process by which plants and other organisms convert light energy into chemical energy. "
                        + "This process occurs in chloroplasts, which contain chlorophyll, the green pigment that absorbs light. "
                        + "The overall equation for photosynthesis is: 6CO2 + 6H2O + light energy → C6H12O6 + 6O2. "
                        + "This means that carbon dioxide and water, in the presence of light, are converted into glucose and oxygen. "
                        + "Photosynthesis is essential for life on Earth as it produces oxygen and forms the base of most food chains.";

        given()
                .header("Authorization", "Bearer " + accessToken)
                .contentType(ContentType.JSON)
                .body(String.format("""
                        {
                          "deckId": "%s",
                          "sourceText": "%s",
                          "requestedCandidatesCount": 10
                        }
                        """, deckId, sourceText))
                .when()
                .post("/api/ai/generate")
                .then()
                .statusCode(201)
                .body("id", notNullValue())
                .body("deckId", equalTo(deckId.toString()))
                .body("aiModel", notNullValue())
                .body("generatedCandidatesCount", greaterThan(0))
                .body("candidates", notNullValue());
    }

    @Test
    @DisplayName("Should validate source text length and return 400")
    void shouldValidateSourceTextLength_Returns400() {
        // Given - tekst za krótki (< 500 znaków)
        String shortText = "Too short text";

        given()
                .header("Authorization", "Bearer " + accessToken)
                .contentType(ContentType.JSON)
                .body(String.format("""
                        {
                          "deckId": "%s",
                          "sourceText": "%s",
                          "requestedCandidatesCount": 10
                        }
                        """, deckId, shortText))
                .when()
                .post("/api/ai/generate")
                .then()
                .statusCode(400)
                .body("status", equalTo(400))
                .body("message", containsString("500 and 10000 characters"));
    }

    @Test
    @DisplayName("Should validate requested candidates count and return 400")
    void shouldValidateRequestedCandidatesCount_Returns400() {
        String sourceText = "A".repeat(600); // Wystarczająco długi tekst

        // Test: count > 100
        given()
                .header("Authorization", "Bearer " + accessToken)
                .contentType(ContentType.JSON)
                .body(String.format("""
                        {
                          "deckId": "%s",
                          "sourceText": "%s",
                          "requestedCandidatesCount": 150
                        }
                        """, deckId, sourceText))
                .when()
                .post("/api/ai/generate")
                .then()
                .statusCode(400)
                .body("message", containsString("must not exceed 100"));
    }

    @Test
    @DisplayName("Should return 404 when deck does not exist")
    void shouldReturn404WhenDeckNotExists() {
        UUID nonExistentDeckId = UUID.randomUUID();
        String sourceText = "A".repeat(600);

        given()
                .header("Authorization", "Bearer " + accessToken)
                .contentType(ContentType.JSON)
                .body(String.format("""
                        {
                          "deckId": "%s",
                          "sourceText": "%s",
                          "requestedCandidatesCount": 10
                        }
                        """, nonExistentDeckId, sourceText))
                .when()
                .post("/api/ai/generate")
                .then()
                .statusCode(404)
                .body("message", containsString("not found"));
    }

    @Test
    @DisplayName("Should return 401 when not authenticated")
    void shouldReturn401WithoutAuth() {
        String sourceText = "A".repeat(600);

        given()
                .contentType(ContentType.JSON)
                .body(String.format("""
                        {
                          "deckId": "%s",
                          "sourceText": "%s",
                          "requestedCandidatesCount": 10
                        }
                        """, deckId, sourceText))
                .when()
                .post("/api/ai/generate")
                .then()
                .statusCode(401);
    }

    // ==================== List Generations Tests ====================

    @Test
    @DisplayName("Should list AI generations with pagination")
    void shouldListGenerations_Returns200() {
        // Given - generujemy fiszki
        String sourceText = "A".repeat(600);
        given()
                .header("Authorization", "Bearer " + accessToken)
                .contentType(ContentType.JSON)
                .body(String.format("""
                        {
                          "deckId": "%s",
                          "sourceText": "%s",
                          "requestedCandidatesCount": 5
                        }
                        """, deckId, sourceText))
                .post("/api/ai/generate")
                .then()
                .statusCode(201);

        // When/Then - listujemy generacje
        given()
                .header("Authorization", "Bearer " + accessToken)
                .queryParam("page", 0)
                .queryParam("size", 20)
                .when()
                .get("/api/ai/generations")
                .then()
                .statusCode(200)
                .body("content", notNullValue())
                .body("page.number", equalTo(0))
                .body("page.size", equalTo(20));
    }

    // ==================== Get Generation Tests ====================

    @Test
    @DisplayName("Should get specific generation by ID")
    void shouldGetGenerationById_Returns200() {
        // Given - generujemy i pobieramy ID
        String sourceText = "A".repeat(600);
        String generationId = given()
                .header("Authorization", "Bearer " + accessToken)
                .contentType(ContentType.JSON)
                .body(String.format("""
                        {
                          "deckId": "%s",
                          "sourceText": "%s",
                          "requestedCandidatesCount": 5
                        }
                        """, deckId, sourceText))
                .post("/api/ai/generate")
                .then()
                .statusCode(201)
                .extract()
                .path("id");

        // When/Then - pobieramy generację
        given()
                .header("Authorization", "Bearer " + accessToken)
                .when()
                .get("/api/ai/generations/" + generationId)
                .then()
                .statusCode(200)
                .body("id", equalTo(generationId))
                .body("candidates", notNullValue());
    }
}
