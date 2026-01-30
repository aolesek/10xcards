package pl.olesek._xcards.auth.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import pl.olesek._xcards.auth.dto.request.PasswordResetConfirmDto;
import pl.olesek._xcards.auth.exception.InvalidTokenException;
import pl.olesek._xcards.auth.exception.RateLimitExceededException;
import pl.olesek._xcards.auth.exception.TokenExpiredException;
import pl.olesek._xcards.common.dto.MessageResponse;
import pl.olesek._xcards.email.service.EmailService;
import pl.olesek._xcards.ratelimit.service.RateLimitService;
import pl.olesek._xcards.user.UserEntity;
import pl.olesek._xcards.user.UserRepository;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private EmailService emailService;

    @Mock
    private RateLimitService rateLimitService;

    @InjectMocks
    private PasswordResetService passwordResetService;

    private UserEntity testUser;
    private String testEmail = "test@example.com";

    @BeforeEach
    void setUp() {
        testUser = new UserEntity();
        testUser.setId(UUID.randomUUID());
        testUser.setEmail(testEmail);
        testUser.setPasswordHash("oldHashedPassword");
        testUser.setEnabled(true);
    }

    // ==================== requestPasswordReset Tests ====================

    @Test
    void shouldRequestPasswordResetSuccessfully() {
        // Given
        when(rateLimitService.tryConsume(anyString(), eq(3), any(Duration.class)))
                .thenReturn(true);
        when(userRepository.findByEmail(testEmail)).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(UserEntity.class))).thenReturn(testUser);

        // When
        MessageResponse response = passwordResetService.requestPasswordReset(testEmail);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.message()).contains("password reset link has been sent");

        ArgumentCaptor<UserEntity> userCaptor = ArgumentCaptor.forClass(UserEntity.class);
        verify(userRepository).save(userCaptor.capture());

        UserEntity savedUser = userCaptor.getValue();
        assertThat(savedUser.getPasswordResetToken()).isNotNull();
        assertThat(savedUser.getPasswordResetTokenExpiry()).isNotNull();
        assertThat(savedUser.getPasswordResetTokenExpiry()).isAfter(Instant.now());

        verify(emailService).sendPasswordResetEmail(eq(testEmail), anyString());
        verify(rateLimitService).tryConsume(eq("password-reset:" + testEmail), eq(3),
                any(Duration.class));
    }

    @Test
    void shouldNotRevealWhetherEmailExists() {
        // Given - email nie istnieje
        when(rateLimitService.tryConsume(anyString(), eq(3), any(Duration.class)))
                .thenReturn(true);
        when(userRepository.findByEmail("nonexistent@example.com")).thenReturn(Optional.empty());

        // When
        MessageResponse response =
                passwordResetService.requestPasswordReset("nonexistent@example.com");

        // Then - ten sam komunikat co dla istniejącego email!
        assertThat(response).isNotNull();
        assertThat(response.message()).contains("password reset link has been sent");

        // Nie powinien wysłać emaila ani zapisać użytkownika
        verify(emailService, never()).sendPasswordResetEmail(anyString(), anyString());
        verify(userRepository, never()).save(any(UserEntity.class));
    }

    @Test
    void shouldNormalizeEmailBeforeProcessing() {
        // Given - email z spacjami i dużymi literami
        String unnormalizedEmail = "  Test@Example.COM  ";
        when(rateLimitService.tryConsume(anyString(), eq(3), any(Duration.class)))
                .thenReturn(true);
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(UserEntity.class))).thenReturn(testUser);

        // When
        passwordResetService.requestPasswordReset(unnormalizedEmail);

        // Then
        verify(userRepository).findByEmail("test@example.com");
        verify(rateLimitService).tryConsume(eq("password-reset:test@example.com"), eq(3),
                any(Duration.class));
    }

    @Test
    void shouldRateLimitPasswordResetRequests() {
        // Given - rate limit przekroczony
        when(rateLimitService.tryConsume(anyString(), eq(3), any(Duration.class)))
                .thenReturn(false);

        // When/Then
        assertThatThrownBy(() -> passwordResetService.requestPasswordReset(testEmail))
                .isInstanceOf(RateLimitExceededException.class)
                .hasMessageContaining("Too many password reset requests");

        // Nie powinien sprawdzać użytkownika ani wysyłać emaila
        verify(userRepository, never()).findByEmail(anyString());
        verify(emailService, never()).sendPasswordResetEmail(anyString(), anyString());
    }

    // ==================== confirmPasswordReset Tests ====================

    @Test
    void shouldConfirmPasswordResetWithValidToken() {
        // Given
        String resetToken = UUID.randomUUID().toString();
        String newPassword = "NewPassword123!";
        Instant futureExpiry = Instant.now().plus(Duration.ofHours(24));

        testUser.setPasswordResetToken(resetToken);
        testUser.setPasswordResetTokenExpiry(futureExpiry);

        PasswordResetConfirmDto request = new PasswordResetConfirmDto(resetToken, newPassword);

        when(userRepository.findByPasswordResetToken(resetToken))
                .thenReturn(Optional.of(testUser));
        when(passwordEncoder.encode(newPassword)).thenReturn("newHashedPassword");
        when(userRepository.save(any(UserEntity.class))).thenReturn(testUser);

        // When
        MessageResponse response = passwordResetService.confirmPasswordReset(request);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.message()).contains("Password has been reset successfully");

        ArgumentCaptor<UserEntity> userCaptor = ArgumentCaptor.forClass(UserEntity.class);
        verify(userRepository).save(userCaptor.capture());

        UserEntity savedUser = userCaptor.getValue();
        assertThat(savedUser.getPasswordHash()).isEqualTo("newHashedPassword");
        assertThat(savedUser.getPasswordResetToken()).isNull();
        assertThat(savedUser.getPasswordResetTokenExpiry()).isNull();

        verify(passwordEncoder).encode(newPassword);
    }

    @Test
    void shouldRejectInvalidToken() {
        // Given
        String invalidToken = "invalid-token";
        PasswordResetConfirmDto request = new PasswordResetConfirmDto(invalidToken, "NewPass123!");

        when(userRepository.findByPasswordResetToken(invalidToken)).thenReturn(Optional.empty());

        // When/Then
        assertThatThrownBy(() -> passwordResetService.confirmPasswordReset(request))
                .isInstanceOf(InvalidTokenException.class)
                .hasMessageContaining("Invalid password reset token");

        verify(userRepository, never()).save(any(UserEntity.class));
        verify(passwordEncoder, never()).encode(anyString());
    }

    @Test
    void shouldRejectExpiredToken() {
        // Given
        String resetToken = UUID.randomUUID().toString();
        Instant pastExpiry = Instant.now().minus(Duration.ofHours(1)); // wygasł godzinę temu

        testUser.setPasswordResetToken(resetToken);
        testUser.setPasswordResetTokenExpiry(pastExpiry);

        PasswordResetConfirmDto request = new PasswordResetConfirmDto(resetToken, "NewPass123!");

        when(userRepository.findByPasswordResetToken(resetToken))
                .thenReturn(Optional.of(testUser));

        // When/Then
        assertThatThrownBy(() -> passwordResetService.confirmPasswordReset(request))
                .isInstanceOf(TokenExpiredException.class)
                .hasMessageContaining("Password reset token has expired");

        verify(userRepository, never()).save(any(UserEntity.class));
        verify(passwordEncoder, never()).encode(anyString());
    }

    @Test
    void shouldRejectTokenWithNullExpiry() {
        // Given
        String resetToken = UUID.randomUUID().toString();

        testUser.setPasswordResetToken(resetToken);
        testUser.setPasswordResetTokenExpiry(null); // brak expiry

        PasswordResetConfirmDto request = new PasswordResetConfirmDto(resetToken, "NewPass123!");

        when(userRepository.findByPasswordResetToken(resetToken))
                .thenReturn(Optional.of(testUser));

        // When/Then
        assertThatThrownBy(() -> passwordResetService.confirmPasswordReset(request))
                .isInstanceOf(TokenExpiredException.class);

        verify(userRepository, never()).save(any(UserEntity.class));
    }
}
