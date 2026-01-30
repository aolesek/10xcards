package pl.olesek._xcards.integration.wiremock;

import com.github.tomakehurst.wiremock.junit5.WireMockTest;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import pl.olesek._xcards.ai.exception.AIServiceUnavailableException;
import pl.olesek._xcards.ai.model.AIGenerationMode;
import pl.olesek._xcards.ai.model.CandidateModel;
import pl.olesek._xcards.ai.service.AIClientService;
import pl.olesek._xcards.integration.BaseIntegrationTest;

import java.util.List;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.ok;
import static com.github.tomakehurst.wiremock.client.WireMock.post;
import static com.github.tomakehurst.wiremock.client.WireMock.postRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.stubFor;
import static com.github.tomakehurst.wiremock.client.WireMock.urlEqualTo;
import static com.github.tomakehurst.wiremock.client.WireMock.verify;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration test for AIClientService with WireMock. Tests OpenRouter integration with full Spring
 * context.
 */
@WireMockTest(httpPort = 8089)
@DisplayName("AI Client Service WireMock Integration Tests")
class AIClientServiceWireMockIT extends BaseIntegrationTest {

    @Autowired
    private AIClientService aiClientService;

    @DynamicPropertySource
    static void configureWireMockProperties(DynamicPropertyRegistry registry) {
        // Przekieruj wywołania AI na WireMock
        registry.add("app.ai.openrouter.base-url", () -> "http://localhost:8089/api/v1");
    }

    @Test
    @DisplayName("Should successfully call OpenRouter and parse candidates")
    void shouldSuccessfullyCallOpenRouterAndParseCandidates() {
        // Given - mock successful OpenRouter response
        stubFor(post(urlEqualTo("/api/v1/chat/completions"))
                .willReturn(ok()
                        .withHeader("Content-Type", "application/json")
                        .withBody(
                                """
                                        {
                                          "id": "gen-12345",
                                          "model": "openai/gpt-4o-mini",
                                          "choices": [{
                                            "message": {
                                              "role": "assistant",
                                              "content": "[{\\"front\\": \\"What is AI?\\", \\"back\\": \\"Artificial Intelligence\\"},{\\"front\\": \\"What is ML?\\", \\"back\\": \\"Machine Learning\\"}]"
                                            },
                                            "finish_reason": "stop"
                                          }],
                                          "usage": {
                                            "prompt_tokens": 100,
                                            "completion_tokens": 50,
                                            "total_tokens": 150
                                          }
                                        }
                                        """)));

        // When
        List<CandidateModel> candidates = aiClientService.generateCandidatesFromText(
                "This is a test text about AI and ML", 10, "openai/gpt-4o-mini",
                AIGenerationMode.KNOWLEDGE_ASSIMILATION);

        // Then
        assertThat(candidates).isNotNull();
        assertThat(candidates).hasSize(2);
        assertThat(candidates.get(0).front()).isEqualTo("What is AI?");
        assertThat(candidates.get(0).back()).isEqualTo("Artificial Intelligence");
        assertThat(candidates.get(1).front()).isEqualTo("What is ML?");
        assertThat(candidates.get(1).back()).isEqualTo("Machine Learning");

        // Verify request was made
        verify(1, postRequestedFor(urlEqualTo("/api/v1/chat/completions")));
    }

    @Test
    @DisplayName("Should handle markdown-wrapped JSON from OpenRouter")
    void shouldHandleMarkdownWrappedJson() {
        // Given - OpenRouter zwraca JSON w markdown code block
        stubFor(post(urlEqualTo("/api/v1/chat/completions"))
                .willReturn(ok()
                        .withHeader("Content-Type", "application/json")
                        .withBody("""
                                {
                                  "choices": [{
                                    "message": {
                                      "content": "```json\\n[{\\"front\\": \\"Q1\\", \\"back\\": \\"A1\\"}]\\n```"
                                    }
                                  }]
                                }
                                """)));

        // When
        List<CandidateModel> candidates = aiClientService.generateCandidatesFromText(
                "Test text", 10, "openai/gpt-4o-mini", AIGenerationMode.KNOWLEDGE_ASSIMILATION);

        // Then
        assertThat(candidates).isNotNull();
        assertThat(candidates).hasSize(1);
        assertThat(candidates.get(0).front()).isEqualTo("Q1");
        assertThat(candidates.get(0).back()).isEqualTo("A1");
    }

    @Test
    @DisplayName("Should handle markdown-wrapped JSON without language tag")
    void shouldHandleMarkdownWithoutLanguageTag() {
        // Given - OpenRouter zwraca JSON w ``` bez 'json'
        stubFor(post(urlEqualTo("/api/v1/chat/completions"))
                .willReturn(ok()
                        .withHeader("Content-Type", "application/json")
                        .withBody("""
                                {
                                  "choices": [{
                                    "message": {
                                      "content": "```\\n[{\\"front\\": \\"Q2\\", \\"back\\": \\"A2\\"}]\\n```"
                                    }
                                  }]
                                }
                                """)));

        // When
        List<CandidateModel> candidates = aiClientService.generateCandidatesFromText(
                "Test text", 10, "openai/gpt-4o-mini", AIGenerationMode.KNOWLEDGE_ASSIMILATION);

        // Then
        assertThat(candidates).isNotNull();
        assertThat(candidates).hasSize(1);
        assertThat(candidates.get(0).front()).isEqualTo("Q2");
    }

    @Test
    @DisplayName("Should retry 3 times on 503 error and throw AIServiceUnavailableException")
    void shouldRetryOnServiceUnavailableAndEventuallyThrow() {
        // Given - OpenRouter zwraca 503
        stubFor(post(urlEqualTo("/api/v1/chat/completions"))
                .willReturn(aResponse()
                        .withStatus(503)
                        .withBody("{\"error\": \"Service Unavailable\"}")));

        // When/Then
        assertThatThrownBy(() -> aiClientService.generateCandidatesFromText("Test text", 10,
                "openai/gpt-4o-mini", AIGenerationMode.KNOWLEDGE_ASSIMILATION))
                .isInstanceOf(AIServiceUnavailableException.class)
                .hasMessageContaining("AI service is currently unavailable");

        // Verify - powinny być 3 próby (1 initial + 2 retries)
        verify(3, postRequestedFor(urlEqualTo("/api/v1/chat/completions")));
    }

    @Test
    @DisplayName("Should throw AIServiceUnavailableException on invalid JSON response")
    void shouldThrowOnInvalidJsonResponse() {
        // Given - OpenRouter zwraca niepoprawny JSON
        stubFor(post(urlEqualTo("/api/v1/chat/completions"))
                .willReturn(ok()
                        .withHeader("Content-Type", "application/json")
                        .withBody("""
                                {
                                  "choices": [{
                                    "message": {
                                      "content": "This is not valid JSON array"
                                    }
                                  }]
                                }
                                """)));

        // When/Then
        assertThatThrownBy(() -> aiClientService.generateCandidatesFromText("Test text", 10,
                "openai/gpt-4o-mini", AIGenerationMode.KNOWLEDGE_ASSIMILATION))
                .isInstanceOf(AIServiceUnavailableException.class)
                .hasMessageContaining("Failed to parse AI response");
    }

    @Test
    @DisplayName("Should handle empty candidates array")
    void shouldHandleEmptyCandidatesArray() {
        // Given - OpenRouter zwraca pustą tablicę
        stubFor(post(urlEqualTo("/api/v1/chat/completions"))
                .willReturn(ok()
                        .withHeader("Content-Type", "application/json")
                        .withBody("""
                                {
                                  "choices": [{
                                    "message": {
                                      "content": "[]"
                                    }
                                  }]
                                }
                                """)));

        // When
        List<CandidateModel> candidates = aiClientService.generateCandidatesFromText(
                "Test text", 10, "openai/gpt-4o-mini", AIGenerationMode.KNOWLEDGE_ASSIMILATION);

        // Then
        assertThat(candidates).isNotNull();
        assertThat(candidates).isEmpty();
    }

    @Test
    @DisplayName("Should successfully retry after one failure")
    void shouldSuccessfullyRetryAfterOneFailure() {
        // Given - pierwszy request fails, drugi succeeds
        stubFor(post(urlEqualTo("/api/v1/chat/completions"))
                .inScenario("Retry Scenario")
                .whenScenarioStateIs("Started")
                .willReturn(aResponse().withStatus(503))
                .willSetStateTo("First Attempt Failed"));

        stubFor(post(urlEqualTo("/api/v1/chat/completions"))
                .inScenario("Retry Scenario")
                .whenScenarioStateIs("First Attempt Failed")
                .willReturn(ok()
                        .withHeader("Content-Type", "application/json")
                        .withBody("""
                                {
                                  "choices": [{
                                    "message": {
                                      "content": "[{\\"front\\": \\"Success\\", \\"back\\": \\"After retry\\"}]"
                                    }
                                  }]
                                }
                                """)));

        // When
        List<CandidateModel> candidates = aiClientService.generateCandidatesFromText(
                "Test text", 10, "openai/gpt-4o-mini", AIGenerationMode.KNOWLEDGE_ASSIMILATION);

        // Then
        assertThat(candidates).isNotNull();
        assertThat(candidates).hasSize(1);
        assertThat(candidates.get(0).front()).isEqualTo("Success");

        // Verify - 2 requests (1 failed + 1 success)
        verify(2, postRequestedFor(urlEqualTo("/api/v1/chat/completions")));
    }
}
