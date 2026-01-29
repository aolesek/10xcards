package pl.olesek._xcards.integration.wiremock;

import com.github.tomakehurst.wiremock.junit5.WireMockTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * Example WireMock test for OpenRouter API integration. Demonstrates: - Mocking external HTTP APIs
 * - Testing API client behavior - Handling different response scenarios
 *
 * <p>
 * Note: This is a standalone WireMock test that doesn't require Spring context. If you need to test
 * actual services that call OpenRouter, extend BaseIntegrationTest instead.
 */
@WireMockTest(httpPort = 8089)
@DisplayName("OpenRouter WireMock Integration Test")
class OpenRouterWireMockTest {

    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Test
    @DisplayName("Should mock successful OpenRouter API response")
    void shouldMockSuccessfulOpenRouterResponse() throws Exception {
        // Arrange - Setup WireMock stub
        String mockResponse = """
                {
                    "id": "gen-123",
                    "model": "openai/gpt-4",
                    "choices": [{
                        "message": {
                            "role": "assistant",
                            "content": "This is a test response"
                        },
                        "finish_reason": "stop"
                    }],
                    "usage": {
                        "prompt_tokens": 10,
                        "completion_tokens": 20,
                        "total_tokens": 30
                    }
                }
                """;

        stubFor(post(urlEqualTo("/api/v1/chat/completions"))
                .withHeader("Authorization", containing("Bearer"))
                .withHeader("Content-Type", equalTo("application/json"))
                .willReturn(aResponse()
                        .withStatus(HttpStatus.OK.value())
                        .withHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                        .withBody(mockResponse)));

        // Act - Make HTTP request to mocked endpoint
        String requestBody = """
                {
                    "model": "openai/gpt-4",
                    "messages": [{"role": "user", "content": "test prompt"}]
                }
                """;

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:8089/api/v1/chat/completions"))
                .header("Authorization", "Bearer test-token")
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        // Assert
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).contains("This is a test response");
        assertThat(response.body()).contains("gen-123");

        // Verify the request was made with correct headers
        verify(postRequestedFor(urlEqualTo("/api/v1/chat/completions"))
                .withHeader("Authorization", containing("Bearer")));
    }

    @Test
    @DisplayName("Should handle OpenRouter API rate limit error")
    void shouldHandleRateLimitError() throws Exception {
        // Arrange - Setup WireMock stub for rate limit
        stubFor(post(urlEqualTo("/api/v1/chat/completions"))
                .willReturn(aResponse()
                        .withStatus(HttpStatus.TOO_MANY_REQUESTS.value())
                        .withHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                        .withBody(
                                "{\"error\": {\"message\": \"Rate limit exceeded\", \"code\": \"rate_limit_exceeded\"}}")));

        // Act - Make HTTP request
        String requestBody = """
                {
                    "model": "openai/gpt-4",
                    "messages": [{"role": "user", "content": "test"}]
                }
                """;

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:8089/api/v1/chat/completions"))
                .header("Authorization", "Bearer test-token")
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        // Assert - Verify rate limit response
        assertThat(response.statusCode()).isEqualTo(429);
        assertThat(response.body()).contains("Rate limit exceeded");
    }

    @Test
    @DisplayName("Should handle OpenRouter API with delay")
    void shouldHandleDelay() throws Exception {
        // Arrange - Setup WireMock stub with delay
        stubFor(post(urlEqualTo("/api/v1/chat/completions"))
                .willReturn(aResponse()
                        .withStatus(HttpStatus.OK.value())
                        .withHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                        .withFixedDelay(100) // 100ms delay
                        .withBody("{\"id\": \"delayed-response\"}")));

        // Act - Make HTTP request
        String requestBody = """
                {
                    "model": "openai/gpt-4",
                    "messages": [{"role": "user", "content": "test"}]
                }
                """;

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:8089/api/v1/chat/completions"))
                .header("Authorization", "Bearer test-token")
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        long startTime = System.currentTimeMillis();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        long duration = System.currentTimeMillis() - startTime;

        // Assert - Verify response came with delay
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).contains("delayed-response");
        assertThat(duration).isGreaterThanOrEqualTo(100); // At least 100ms delay
    }
}
