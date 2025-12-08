package pl.olesek._xcards.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PasswordResetService {

    private final UserRepository userRepository;

    private final PasswordEncoder passwordEncoder;

    private final EmailService emailService;

    private final RateLimitService rateLimitService;

    @Transactional
    public MessageResponse requestPasswordReset(String email) {
        String normalizedEmail = email.trim().toLowerCase();

        if (!rateLimitService.tryConsume("password-reset:" + normalizedEmail, 3,
                Duration.ofHours(1))) {
            throw new RateLimitExceededException(
                    "Too many password reset requests. Please try again in 1 hour");
        }

        UserEntity user = userRepository.findByEmail(normalizedEmail).orElse(null);

        if (user != null) {
            String resetToken = UUID.randomUUID().toString();
            Instant expiry = Instant.now().plus(Duration.ofHours(24));

            user.setPasswordResetToken(resetToken);
            user.setPasswordResetTokenExpiry(expiry);
            userRepository.save(user);

            emailService.sendPasswordResetEmail(normalizedEmail, resetToken);
            log.info("Password reset requested for: {}", normalizedEmail);
        } else {
            log.debug("Password reset requested for non-existent email: {}", normalizedEmail);
        }

        return new MessageResponse(
                "If an account exists with this email, a password reset link has been sent.");
    }

    @Transactional
    public MessageResponse confirmPasswordReset(PasswordResetConfirmDto request) {
        UserEntity user = userRepository.findByPasswordResetToken(request.token())
                .orElseThrow(() -> new InvalidTokenException("Invalid password reset token"));

        if (user.getPasswordResetTokenExpiry() == null
                || Instant.now().isAfter(user.getPasswordResetTokenExpiry())) {
            throw new TokenExpiredException("Password reset token has expired");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setPasswordResetToken(null);
        user.setPasswordResetTokenExpiry(null);
        userRepository.save(user);

        log.info("Password reset confirmed for user: {}", user.getId());
        return new MessageResponse("Password has been reset successfully.");
    }
}

