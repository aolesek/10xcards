package pl.olesek._xcards.email.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import pl.olesek._xcards.email.template.PasswordResetEmailTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final RestTemplate emailRestTemplate;

    @Value("${resend.api-key}")
    private String apiKey;

    @Value("${resend.from-email:onboarding@resend.dev}")
    private String fromEmail;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Async
    public void sendPasswordResetEmail(String toEmail, String resetToken) {
        try {
            String resetLink = frontendUrl + "/password-reset/confirm?token=" + resetToken;
            String emailText = PasswordResetEmailTemplate.generate(resetLink);

            // Prepare Resend API request
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("from", fromEmail);
            requestBody.put("to", toEmail);
            requestBody.put("subject", "Password Reset Request - 10xCards");
            requestBody.put("text", emailText);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            // Send via Resend API
            String resendApiUrl = "https://api.resend.com/emails";
            emailRestTemplate.postForEntity(resendApiUrl, request, String.class);

            log.info("Password reset email sent successfully to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send password reset email to: {}", toEmail, e);
            // Don't throw exception - security: don't reveal if email delivery failed
        }
    }
}

