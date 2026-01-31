package pl.olesek._xcards.email.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @Mock
    private RestTemplate emailRestTemplate;

    @InjectMocks
    private EmailService emailService;

    private String testApiKey = "test-api-key";
    private String testFromEmail = "noreply@10xcards.com";
    private String testFrontendUrl = "http://localhost:5173";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(emailService, "apiKey", testApiKey);
        ReflectionTestUtils.setField(emailService, "fromEmail", testFromEmail);
        ReflectionTestUtils.setField(emailService, "frontendUrl", testFrontendUrl);
    }

    @Test
    void shouldSendPasswordResetEmailSuccessfully() {
        // Given
        String toEmail = "test@example.com";
        String resetToken = "test-reset-token-123";
        String expectedUrl = "https://api.resend.com/emails";

        when(emailRestTemplate.postForEntity(eq(expectedUrl), any(HttpEntity.class), eq(String.class)))
                .thenReturn(ResponseEntity.ok("Success"));

        // When
        emailService.sendPasswordResetEmail(toEmail, resetToken);

        // Then
        verify(emailRestTemplate).postForEntity(eq(expectedUrl), any(HttpEntity.class), eq(String.class));
    }

    @Test
    void shouldIncludeCorrectResetLinkInEmail() {
        // Given
        String toEmail = "test@example.com";
        String resetToken = "test-token-456";
        String expectedResetLink = testFrontendUrl + "/password-reset/confirm?token=" + resetToken;
        String expectedUrl = "https://api.resend.com/emails";

        ArgumentCaptor<HttpEntity> requestCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        when(emailRestTemplate.postForEntity(eq(expectedUrl), any(HttpEntity.class), eq(String.class)))
                .thenReturn(ResponseEntity.ok("Success"));

        // When
        emailService.sendPasswordResetEmail(toEmail, resetToken);

        // Then
        verify(emailRestTemplate).postForEntity(eq(expectedUrl), requestCaptor.capture(), eq(String.class));

        HttpEntity<Map<String, Object>> capturedRequest = requestCaptor.getValue();
        Map<String, Object> requestBody = capturedRequest.getBody();

        assertThat(requestBody).isNotNull();
        assertThat(requestBody.get("to")).isEqualTo(toEmail);
        assertThat(requestBody.get("from")).isEqualTo(testFromEmail);
        assertThat(requestBody.get("subject")).isEqualTo("Password Reset Request - 10xCards");
        assertThat(requestBody.get("text")).asString().contains(expectedResetLink);
    }

    @Test
    void shouldNotPropagateRestClientExceptionToClient() {
        // Given
        String toEmail = "test@example.com";
        String resetToken = "test-token";
        String expectedUrl = "https://api.resend.com/emails";

        doThrow(new RestClientException("API unavailable"))
                .when(emailRestTemplate)
                .postForEntity(eq(expectedUrl), any(HttpEntity.class), eq(String.class));

        // When/Then - nie powinien rzucić wyjątku (security: nie ujawniać błędów wysyłki)
        assertThatCode(() -> emailService.sendPasswordResetEmail(toEmail, resetToken))
                .doesNotThrowAnyException();

        verify(emailRestTemplate).postForEntity(eq(expectedUrl), any(HttpEntity.class), eq(String.class));
    }

    @Test
    void shouldNotPropagateGenericExceptionToClient() {
        // Given
        String toEmail = "test@example.com";
        String resetToken = "test-token";
        String expectedUrl = "https://api.resend.com/emails";

        when(emailRestTemplate.postForEntity(eq(expectedUrl), any(HttpEntity.class), eq(String.class)))
                .thenThrow(new RuntimeException("Unexpected error"));

        // When/Then - nie powinien rzucić wyjątku
        assertThatCode(() -> emailService.sendPasswordResetEmail(toEmail, resetToken))
                .doesNotThrowAnyException();

        verify(emailRestTemplate).postForEntity(eq(expectedUrl), any(HttpEntity.class), eq(String.class));
    }

    @Test
    void shouldIncludeAuthorizationHeader() {
        // Given
        String toEmail = "test@example.com";
        String resetToken = "test-token";
        String expectedUrl = "https://api.resend.com/emails";

        ArgumentCaptor<HttpEntity> requestCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        when(emailRestTemplate.postForEntity(eq(expectedUrl), any(HttpEntity.class), eq(String.class)))
                .thenReturn(ResponseEntity.ok("Success"));

        // When
        emailService.sendPasswordResetEmail(toEmail, resetToken);

        // Then
        verify(emailRestTemplate).postForEntity(eq(expectedUrl), requestCaptor.capture(), eq(String.class));

        HttpEntity<Map<String, Object>> capturedRequest = requestCaptor.getValue();
        String authHeader = capturedRequest.getHeaders().getFirst("Authorization");

        assertThat(authHeader).isEqualTo("Bearer " + testApiKey);
    }
}
