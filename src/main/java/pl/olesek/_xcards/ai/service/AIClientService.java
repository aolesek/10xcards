package pl.olesek._xcards.ai.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import pl.olesek._xcards.ai.exception.AIServiceUnavailableException;
import pl.olesek._xcards.ai.model.CandidateModel;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Service for communicating with OpenRouter AI API. Handles flashcard generation from text with
 * retry logic and error handling.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AIClientService {

    private final RestTemplate aiRestTemplate;
    private final ObjectMapper objectMapper;

    @Value("${app.ai.openrouter.api-key}")
    private String apiKey;

    @Value("${app.ai.openrouter.base-url}")
    private String baseUrl;

    @Value("${app.ai.openrouter.model}")
    private String model;

    @Value("${app.ai.prompt-template}")
    private String promptTemplate;

    private static final int MAX_RETRIES = 2;
    private static final long RETRY_DELAY_MS = 1000;

    /**
     * Generates flashcard candidates from source text using AI. Includes retry logic for handling
     * transient failures.
     * 
     * @param sourceText the text to generate flashcards from
     * @return list of generated candidates with unique IDs
     * @throws AIServiceUnavailableException if AI service is unavailable after retries
     */
    public List<CandidateModel> generateCandidatesFromText(String sourceText) {
        log.debug("Calling OpenRouter API with model={}", model);

        for (int attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                return callOpenRouterAPI(sourceText);
            } catch (ResourceAccessException | HttpServerErrorException e) {
                log.warn("OpenRouter API attempt {} failed: {}", attempt + 1, e.getMessage());

                if (attempt < MAX_RETRIES) {
                    try {
                        Thread.sleep(RETRY_DELAY_MS * (attempt + 1)); // Exponential backoff
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new AIServiceUnavailableException(
                                "Interrupted while retrying AI service", ie);
                    }
                } else {
                    log.error("OpenRouter API error after {} attempts: {}", MAX_RETRIES + 1,
                            e.getMessage());
                    throw new AIServiceUnavailableException(
                            "AI service is currently unavailable. Please try again later.", e);
                }
            }
        }

        throw new AIServiceUnavailableException(
                "AI service is currently unavailable. Please try again later.");
    }

    /**
     * Makes the actual HTTP call to OpenRouter API.
     * 
     * @param sourceText the text to generate flashcards from
     * @return list of candidate models
     */
    private List<CandidateModel> callOpenRouterAPI(String sourceText) {
        String prompt = promptTemplate.replace("{text}", sourceText);

        // Build request body according to OpenRouter API specification
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", model);

        List<Map<String, String>> messages = List.of(Map.of("role", "user", "content", prompt));
        requestBody.put("messages", messages);

        // Set headers
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + apiKey);
        headers.set("Content-Type", "application/json");

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            // Make API call
            ResponseEntity<String> response =
                    aiRestTemplate.exchange(baseUrl + "/chat/completions", HttpMethod.POST, entity,
                            String.class);

            // Parse response
            return parseCandidatesFromResponse(response.getBody());

        } catch (HttpClientErrorException e) {
            log.error("OpenRouter API client error ({}): {}", e.getStatusCode(), e.getMessage());
            throw new AIServiceUnavailableException(
                    "Failed to generate flashcards: " + e.getMessage(), e);
        }
    }

    /**
     * Parses OpenRouter API response and extracts candidate flashcards.
     * 
     * @param responseBody the JSON response from OpenRouter
     * @return list of candidate models with generated UUIDs
     */
    private List<CandidateModel> parseCandidatesFromResponse(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            String content = root.path("choices").get(0).path("message").path("content").asText();

            // Extract JSON array from markdown code blocks if present
            String jsonContent = content;
            if (content.contains("```json")) {
                jsonContent = content.substring(content.indexOf("["), content.lastIndexOf("]") + 1);
            } else if (content.contains("```")) {
                jsonContent = content.substring(content.indexOf("["), content.lastIndexOf("]") + 1);
            }

            // Parse the candidates array
            List<Map<String, String>> rawCandidates =
                    objectMapper.readValue(jsonContent, new TypeReference<>() {});

            // Convert to CandidateModel with UUIDs and status
            return rawCandidates.stream()
                    .map(raw -> new CandidateModel(UUID.randomUUID(), raw.get("front"),
                            raw.get("back"), "pending", null, null))
                    .toList();

        } catch (Exception e) {
            log.error("Failed to parse OpenRouter response: {}", responseBody, e);
            throw new AIServiceUnavailableException("Failed to parse AI response", e);
        }
    }
}
