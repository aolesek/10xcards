package pl.olesek._xcards.auth.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

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
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private JwtService jwtService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private TokenBlacklistService tokenBlacklistService;

    @Mock
    private RateLimitService rateLimitService;

    @InjectMocks
    private AuthService authService;

    private UserEntity testUser;

    @BeforeEach
    void setUp() {
        testUser = new UserEntity();
        testUser.setId(UUID.randomUUID());
        testUser.setEmail("test@example.com");
        testUser.setPasswordHash("hashedPassword");
        testUser.setRole("USER");
        testUser.setEnabled(true);
        testUser.setMonthlyAiLimit(100);
        testUser.setAiUsageInCurrentMonth(0);
    }

    @Test
    void shouldRegisterNewUser() {
        RegisterRequest request = new RegisterRequest("test@example.com", "Password123!");

        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashedPassword");
        when(userRepository.save(any(UserEntity.class))).thenReturn(testUser);
        when(jwtService.generateAccessToken(any())).thenReturn("accessToken");
        when(jwtService.generateRefreshToken(any())).thenReturn("refreshToken");

        AuthResponse response = authService.register(request);

        assertThat(response).isNotNull();
        assertThat(response.email()).isEqualTo("test@example.com");
        assertThat(response.accessToken()).isEqualTo("accessToken");
        assertThat(response.refreshToken()).isEqualTo("refreshToken");
        verify(userRepository).save(any(UserEntity.class));
    }

    @Test
    void shouldThrowExceptionWhenEmailAlreadyExists() {
        RegisterRequest request = new RegisterRequest("test@example.com", "Password123!");

        when(userRepository.existsByEmail(anyString())).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(UserAlreadyExistsException.class);
    }

    @Test
    void shouldLoginSuccessfully() {
        LoginRequest request = new LoginRequest("test@example.com", "Password123!");
        String ipAddress = "127.0.0.1";

        when(rateLimitService.tryConsume(eq(ipAddress), eq(5), any(Duration.class)))
                .thenReturn(true);
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
        when(jwtService.generateAccessToken(any())).thenReturn("accessToken");
        when(jwtService.generateRefreshToken(any())).thenReturn("refreshToken");

        AuthResponse response = authService.login(request, ipAddress);

        assertThat(response).isNotNull();
        assertThat(response.email()).isEqualTo("test@example.com");
        verify(rateLimitService).tryConsume(eq(ipAddress), eq(5), any(Duration.class));
    }

    @Test
    void shouldThrowExceptionWhenRateLimitExceeded() {
        LoginRequest request = new LoginRequest("test@example.com", "Password123!");
        String ipAddress = "127.0.0.1";

        when(rateLimitService.tryConsume(eq(ipAddress), eq(5), any(Duration.class)))
                .thenReturn(false);

        assertThatThrownBy(() -> authService.login(request, ipAddress))
                .isInstanceOf(RateLimitExceededException.class);
    }

    @Test
    void shouldThrowExceptionWhenInvalidCredentials() {
        LoginRequest request = new LoginRequest("test@example.com", "WrongPassword");
        String ipAddress = "127.0.0.1";

        when(rateLimitService.tryConsume(eq(ipAddress), eq(5), any(Duration.class)))
                .thenReturn(true);
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);

        assertThatThrownBy(() -> authService.login(request, ipAddress))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void shouldThrowExceptionWhenAccountDisabled() {
        LoginRequest request = new LoginRequest("test@example.com", "Password123!");
        String ipAddress = "127.0.0.1";
        testUser.setEnabled(false);

        when(rateLimitService.tryConsume(eq(ipAddress), eq(5), any(Duration.class)))
                .thenReturn(true);
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);

        assertThatThrownBy(() -> authService.login(request, ipAddress))
                .isInstanceOf(AccountDisabledException.class);
    }

    @Test
    void shouldRefreshTokenSuccessfully() {
        RefreshTokenRequest request = new RefreshTokenRequest("refreshToken");
        UUID userId = testUser.getId();

        when(jwtService.validateToken(anyString())).thenReturn(true);
        when(tokenBlacklistService.isBlacklisted(anyString())).thenReturn(false);
        when(jwtService.getUserIdFromToken(anyString())).thenReturn(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        when(jwtService.generateAccessToken(any())).thenReturn("newAccessToken");
        when(jwtService.generateRefreshToken(any())).thenReturn("newRefreshToken");

        RefreshTokenResponse response = authService.refreshToken(request);

        assertThat(response).isNotNull();
        assertThat(response.accessToken()).isEqualTo("newAccessToken");
        assertThat(response.refreshToken()).isEqualTo("newRefreshToken");
        verify(tokenBlacklistService).blacklist(eq("refreshToken"), any(Duration.class));
    }

    @Test
    void shouldThrowExceptionWhenTokenBlacklisted() {
        RefreshTokenRequest request = new RefreshTokenRequest("refreshToken");

        when(jwtService.validateToken(anyString())).thenReturn(true);
        when(tokenBlacklistService.isBlacklisted(anyString())).thenReturn(true);

        assertThatThrownBy(() -> authService.refreshToken(request))
                .isInstanceOf(InvalidTokenException.class).hasMessageContaining("revoked");
    }

    @Test
    void shouldLogoutSuccessfully() {
        UUID userId = UUID.randomUUID();
        String accessToken = "accessToken";
        String refreshToken = "refreshToken";

        authService.logout(userId, accessToken, refreshToken);

        verify(tokenBlacklistService).blacklist(eq(accessToken), any(Duration.class));
        verify(tokenBlacklistService).blacklist(eq(refreshToken), any(Duration.class));
    }

    @Test
    void shouldLogoutWithoutRefreshToken() {
        UUID userId = UUID.randomUUID();
        String accessToken = "accessToken";

        authService.logout(userId, accessToken, null);

        verify(tokenBlacklistService).blacklist(eq(accessToken), any(Duration.class));
        verify(tokenBlacklistService, times(1)).blacklist(anyString(), any(Duration.class));
    }
}

