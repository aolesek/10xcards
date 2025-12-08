package pl.olesek._xcards.security.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import pl.olesek._xcards.auth.exception.InvalidTokenException;
import pl.olesek._xcards.auth.exception.TokenExpiredException;
import pl.olesek._xcards.user.UserEntity;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private JwtService jwtService;

    private UserEntity testUser;

    @BeforeEach
    void setUp() {
        String secret = "test-secret-key-that-is-at-least-256-bits-long-for-security";
        jwtService = new JwtService(secret, 900000L, 604800000L);

        testUser = new UserEntity();
        testUser.setId(UUID.randomUUID());
        testUser.setEmail("test@example.com");
        testUser.setRole("USER");
    }

    @Test
    void shouldGenerateAccessToken() {
        String token = jwtService.generateAccessToken(testUser);

        assertThat(token).isNotNull().isNotEmpty();
    }

    @Test
    void shouldGenerateRefreshToken() {
        String token = jwtService.generateRefreshToken(testUser);

        assertThat(token).isNotNull().isNotEmpty();
    }

    @Test
    void shouldValidateToken() {
        String token = jwtService.generateAccessToken(testUser);

        boolean valid = jwtService.validateToken(token);

        assertThat(valid).isTrue();
    }

    @Test
    void shouldThrowExceptionForInvalidToken() {
        String invalidToken = "invalid.token.here";

        assertThatThrownBy(() -> jwtService.validateToken(invalidToken))
                .isInstanceOf(InvalidTokenException.class);
    }

    @Test
    void shouldExtractUserIdFromToken() {
        String token = jwtService.generateAccessToken(testUser);

        UUID userId = jwtService.getUserIdFromToken(token);

        assertThat(userId).isEqualTo(testUser.getId());
    }

    @Test
    void shouldExtractEmailFromAccessToken() {
        String token = jwtService.generateAccessToken(testUser);

        String email = jwtService.getEmailFromToken(token);

        assertThat(email).isEqualTo(testUser.getEmail());
    }

    @Test
    void shouldExtractRoleFromAccessToken() {
        String token = jwtService.generateAccessToken(testUser);

        String role = jwtService.getRoleFromToken(token);

        assertThat(role).isEqualTo(testUser.getRole());
    }

    @Test
    void shouldReturnAccessTokenType() {
        String token = jwtService.generateAccessToken(testUser);

        String type = jwtService.getTokenType(token);

        assertThat(type).isEqualTo("access");
    }

    @Test
    void shouldReturnRefreshTokenType() {
        String token = jwtService.generateRefreshToken(testUser);

        String type = jwtService.getTokenType(token);

        assertThat(type).isEqualTo("refresh");
    }

    @Test
    void shouldThrowExceptionForExpiredToken() {
        JwtService shortLivedJwtService = new JwtService(
                "test-secret-key-that-is-at-least-256-bits-long-for-security", 1L, 1L);

        String token = shortLivedJwtService.generateAccessToken(testUser);

        try {
            Thread.sleep(100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        assertThatThrownBy(() -> shortLivedJwtService.validateToken(token))
                .isInstanceOf(TokenExpiredException.class);
    }
}

