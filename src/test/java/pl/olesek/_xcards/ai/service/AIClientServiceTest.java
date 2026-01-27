package pl.olesek._xcards.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import pl.olesek._xcards.ai.exception.AIServiceUnavailableException;
import pl.olesek._xcards.ai.model.CandidateModel;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AIClientServiceTest {

    @Mock
    private RestTemplate aiRestTemplate;

    @InjectMocks
    private AIClientService aiClientService;

    private ObjectMapper objectMapper = new ObjectMapper();

    private String mockApiKey = "test-api-key";
    private String mockBaseUrl = "https://openrouter.ai/api/v1";
    private String mockModel = "openai/gpt-4";
    private String mockPromptTemplateKnowledge =
            "Generate {count} flashcard question-answer pairs from the following text. Return JSON array with format: [{\"front\": \"question\", \"back\": \"answer\"}]. Text: {text}";
    private String mockPromptTemplateLanguage =
            "Generate {count} flashcard question-answer pairs for language learning. Return JSON array with format: [{\"front\": \"question\", \"back\": \"answer\"}]. Text: {text}";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(aiClientService, "objectMapper", objectMapper);
        ReflectionTestUtils.setField(aiClientService, "apiKey", mockApiKey);
        ReflectionTestUtils.setField(aiClientService, "baseUrl", mockBaseUrl);
        ReflectionTestUtils.setField(aiClientService, "model", mockModel);
        ReflectionTestUtils.setField(aiClientService, "promptTemplateKnowledge", mockPromptTemplateKnowledge);
        ReflectionTestUtils.setField(aiClientService, "promptTemplateLanguage", mockPromptTemplateLanguage);
    }

    @Test
    void shouldGenerateCandidatesSuccessfully() throws Exception {
        // Given
        String sourceText = "Photosynthesis is the process by which plants convert light energy...";
        String mockResponse =
                """
                        {
                          "choices": [{
                            "message": {
                              "content": "[{\\"front\\": \\"What is photosynthesis?\\", \\"back\\": \\"Process of converting light energy\\"}]"
                            }
                          }]
                        }
                        """;

        when(aiRestTemplate.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class),
                eq(String.class))).thenReturn(ResponseEntity.ok(mockResponse));

        // When
        List<CandidateModel> candidates = aiClientService.generateCandidatesFromText(sourceText, 10);

        // Then
        assertThat(candidates).isNotNull();
        verify(aiRestTemplate).exchange(eq(mockBaseUrl + "/chat/completions"), eq(HttpMethod.POST),
                any(HttpEntity.class), eq(String.class));
    }

    @Test
    void shouldRetryOnResourceAccessException() {
        // Given
        String sourceText = "Test text for retry";

        when(aiRestTemplate.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class),
                eq(String.class))).thenThrow(new ResourceAccessException("Connection timeout"));

        // When/Then
        assertThatThrownBy(() -> aiClientService.generateCandidatesFromText(sourceText, 10))
                .isInstanceOf(AIServiceUnavailableException.class)
                .hasMessageContaining("AI service is currently unavailable");

        // Verify retry logic: 1 initial + 2 retries = 3 total attempts
        verify(aiRestTemplate, times(3)).exchange(anyString(), eq(HttpMethod.POST),
                any(HttpEntity.class), eq(String.class));
    }

    @Test
    void shouldRetryOnHttpServerErrorException() {
        // Given
        String sourceText = "Test text for server error";

        when(aiRestTemplate.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class),
                eq(String.class)))
                .thenThrow(new HttpServerErrorException(
                        org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "Service Unavailable"));

        // When/Then
        assertThatThrownBy(() -> aiClientService.generateCandidatesFromText(sourceText, 10))
                .isInstanceOf(AIServiceUnavailableException.class);

        // Verify retry logic
        verify(aiRestTemplate, times(3)).exchange(anyString(), eq(HttpMethod.POST),
                any(HttpEntity.class), eq(String.class));
    }

    @Test
    void shouldIncludeAuthorizationHeaderInRequest() {
        // Given
        String sourceText = "Test text";
        String mockResponse = """
                {
                  "choices": [{
                    "message": {
                      "content": "[]"
                    }
                  }]
                }
                """;

        @SuppressWarnings("rawtypes")
        ArgumentCaptor<HttpEntity> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);

        when(aiRestTemplate.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class),
                eq(String.class))).thenReturn(ResponseEntity.ok(mockResponse));

        // When
        aiClientService.generateCandidatesFromText(sourceText, 10);

        // Then
        verify(aiRestTemplate).exchange(anyString(), eq(HttpMethod.POST), entityCaptor.capture(),
                eq(String.class));

        @SuppressWarnings("unchecked")
        HttpEntity<Object> capturedEntity = (HttpEntity<Object>) entityCaptor.getValue();
        assertThat(capturedEntity.getHeaders().getFirst("Authorization"))
                .isEqualTo("Bearer " + mockApiKey);
        assertThat(capturedEntity.getHeaders().getFirst("Content-Type"))
                .isEqualTo("application/json");
    }

    @Test
    void shouldHandleMarkdownCodeBlocksInResponse() throws Exception {
        // Given
        String sourceText = "Test text";
        String mockResponseWithMarkdown = """
                {
                  "choices": [{
                    "message": {
                      "content": "```json\\n[{\\"front\\": \\"Q1\\", \\"back\\": \\"A1\\"}]\\n```"
                    }
                  }]
                }
                """;

        when(aiRestTemplate.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class),
                eq(String.class))).thenReturn(ResponseEntity.ok(mockResponseWithMarkdown));

        // When/Then - Should not throw exception
        aiClientService.generateCandidatesFromText(sourceText, 10);

        verify(aiRestTemplate).exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class),
                eq(String.class));
    }
}
