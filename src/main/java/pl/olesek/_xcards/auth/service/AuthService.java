package pl.olesek._xcards.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import pl.olesek._xcards.auth.dto.request.LoginRequest;
import pl.olesek._xcards.auth.dto.request.RefreshTokenRequest;
import pl.olesek._xcards.auth.dto.request.RegisterRequest;
import pl.olesek._xcards.auth.dto.response.AuthResponse;
import pl.olesek._xcards.auth.dto.response.RefreshTokenResponse;
import pl.olesek._xcards.auth.exception.InvalidCredentialsException;
import pl.olesek._xcards.auth.exception.InvalidTokenException;
import pl.olesek._xcards.auth.exception.RateLimitExceededException;
import pl.olesek._xcards.auth.exception.UserAlreadyExistsException;
import pl.olesek._xcards.common.exception.AccountDisabledException;
import pl.olesek._xcards.ratelimit.service.RateLimitService;
import pl.olesek._xcards.security.service.JwtService;
import pl.olesek._xcards.security.service.TokenBlacklistService;
import pl.olesek._xcards.user.UserEntity;
import pl.olesek._xcards.user.UserRepository;

import java.time.Duration;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;

    private final JwtService jwtService;

    private final PasswordEncoder passwordEncoder;

    private final TokenBlacklistService tokenBlacklistService;

    private final RateLimitService rateLimitService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase();

        if (userRepository.existsByEmail(email)) {
            throw new UserAlreadyExistsException(email);
        }

        UserEntity user = new UserEntity();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole("USER");
        user.setEnabled(true);
        user.setMonthlyAiLimit(100);
        user.setAiUsageInCurrentMonth(0);

        userRepository.save(user);

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        log.info("User registered: {}", email);
        return AuthResponse.from(user, accessToken, refreshToken);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request, String ipAddress) {
        if (!rateLimitService.tryConsume(ipAddress, 5, Duration.ofMinutes(15))) {
            throw new RateLimitExceededException(
                    "Too many login attempts. Please try again in 15 minutes");
        }

        String email = request.email().trim().toLowerCase();

        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(InvalidCredentialsException::new);

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }

        if (!user.getEnabled()) {
            throw new AccountDisabledException("Account is disabled");
        }

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        log.info("User logged in: {}", email);
        return AuthResponse.from(user, accessToken, refreshToken);
    }

    public RefreshTokenResponse refreshToken(RefreshTokenRequest request) {
        String refreshToken = request.refreshToken();

        jwtService.validateToken(refreshToken);

        if (tokenBlacklistService.isBlacklisted(refreshToken)) {
            throw new InvalidTokenException("Token has been revoked");
        }

        UUID userId = jwtService.getUserIdFromToken(refreshToken);

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new InvalidTokenException("Invalid token"));

        tokenBlacklistService.blacklist(refreshToken, Duration.ofDays(7));

        String newAccessToken = jwtService.generateAccessToken(user);
        String newRefreshToken = jwtService.generateRefreshToken(user);

        log.debug("Token refreshed for user: {}", userId);
        return new RefreshTokenResponse(newAccessToken, newRefreshToken);
    }

    public void logout(UUID userId, String accessToken, String refreshToken) {
        tokenBlacklistService.blacklist(accessToken, Duration.ofMinutes(15));

        if (refreshToken != null) {
            tokenBlacklistService.blacklist(refreshToken, Duration.ofDays(7));
        }

        log.info("User logged out: {}", userId);
    }
}

