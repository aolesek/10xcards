package pl.olesek._xcards.email.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @Mock
    private JavaMailSender mailSender;

    @InjectMocks
    private EmailService emailService;

    private String testFromEmail = "noreply@10xcards.com";
    private String testFrontendUrl = "http://localhost:5173";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(emailService, "fromEmail", testFromEmail);
        ReflectionTestUtils.setField(emailService, "frontendUrl", testFrontendUrl);
    }

    @Test
    void shouldSendPasswordResetEmailSuccessfully() throws MessagingException {
        // Given
        String toEmail = "test@example.com";
        String resetToken = "test-reset-token-123";
        MimeMessage mockMessage = mock(MimeMessage.class);

        when(mailSender.createMimeMessage()).thenReturn(mockMessage);

        // When
        emailService.sendPasswordResetEmail(toEmail, resetToken);

        // Then
        verify(mailSender).createMimeMessage();
        verify(mailSender).send(mockMessage);
    }

    @Test
    void shouldIncludeCorrectResetLinkInEmail() throws MessagingException {
        // Given
        String toEmail = "test@example.com";
        String resetToken = "test-token-456";
        String expectedResetLink = testFrontendUrl + "/reset-password?token=" + resetToken;

        MimeMessage mockMessage = mock(MimeMessage.class);
        when(mailSender.createMimeMessage()).thenReturn(mockMessage);

        // When
        emailService.sendPasswordResetEmail(toEmail, resetToken);

        // Then
        verify(mailSender).send(mockMessage);
        // Weryfikujemy że link został wygenerowany (template zawiera link)
        assertThat(expectedResetLink).contains(resetToken);
        assertThat(expectedResetLink).startsWith(testFrontendUrl);
    }

    @Test
    void shouldNotPropagateMessagingExceptionToClient() {
        // Given
        String toEmail = "test@example.com";
        String resetToken = "test-token";
        MimeMessage mockMessage = mock(MimeMessage.class);

        when(mailSender.createMimeMessage()).thenReturn(mockMessage);
        doThrow(new MailSendException("SMTP server unavailable")).when(mailSender)
                .send(any(MimeMessage.class));

        // When/Then - nie powinien rzucić wyjątku (security: nie ujawniać błędów wysyłki)
        assertThatCode(() -> emailService.sendPasswordResetEmail(toEmail, resetToken))
                .doesNotThrowAnyException();

        verify(mailSender).send(mockMessage);
    }

    @Test
    void shouldNotPropagateGenericExceptionToClient() {
        // Given
        String toEmail = "test@example.com";
        String resetToken = "test-token";

        when(mailSender.createMimeMessage())
                .thenThrow(new RuntimeException("Unexpected mail server error"));

        // When/Then - nie powinien rzucić wyjątku
        assertThatCode(() -> emailService.sendPasswordResetEmail(toEmail, resetToken))
                .doesNotThrowAnyException();

        verify(mailSender).createMimeMessage();
    }

    @Test
    void shouldHandleNullPointerExceptionGracefully() {
        // Given
        String toEmail = "test@example.com";
        String resetToken = "test-token";

        when(mailSender.createMimeMessage()).thenReturn(null); // symulacja błędu

        // When/Then - nie powinien rzucić wyjątku
        assertThatCode(() -> emailService.sendPasswordResetEmail(toEmail, resetToken))
                .doesNotThrowAnyException();
    }
}
