package pl.olesek._xcards.auth.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import pl.olesek._xcards.auth.dto.request.LoginRequest;
import pl.olesek._xcards.auth.dto.request.PasswordResetConfirmDto;
import pl.olesek._xcards.auth.dto.request.PasswordResetRequestDto;
import pl.olesek._xcards.auth.dto.request.RefreshTokenRequest;
import pl.olesek._xcards.auth.dto.request.RegisterRequest;
import pl.olesek._xcards.auth.dto.response.AuthResponse;
import pl.olesek._xcards.auth.dto.response.RefreshTokenResponse;
import pl.olesek._xcards.auth.dto.response.UserInfoResponse;
import pl.olesek._xcards.auth.service.AuthService;
import pl.olesek._xcards.auth.service.PasswordResetService;
import pl.olesek._xcards.common.dto.MessageResponse;
import pl.olesek._xcards.common.util.RequestContextUtil;

import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Authentication", description = "User authentication and password management endpoints")
public class AuthController {

    private final AuthService authService;

    private final PasswordResetService passwordResetService;

    @PostMapping("/register")
    @Operation(summary = "Register new user", description = "Creates a new user account and returns JWT tokens")
    @ApiResponses(value = {@ApiResponse(responseCode = "201", description = "User registered successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid input data"),
            @ApiResponse(responseCode = "409", description = "Email already exists")})
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        log.debug("Register request for email: {}", request.email());
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    @Operation(summary = "Login user", description = "Authenticates user and returns JWT tokens")
    @ApiResponses(value = {@ApiResponse(responseCode = "200", description = "Login successful"),
            @ApiResponse(responseCode = "401", description = "Invalid credentials"),
            @ApiResponse(responseCode = "429", description = "Too many login attempts")})
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        String ipAddress = RequestContextUtil.getClientIpAddress(httpRequest);
        log.debug("Login request for email: {} from IP: {}", request.email(), ipAddress);
        AuthResponse response = authService.login(request, ipAddress);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh access token", description = "Generates new access and refresh tokens")
    @ApiResponses(value = {@ApiResponse(responseCode = "200", description = "Token refreshed successfully"),
            @ApiResponse(responseCode = "401", description = "Invalid or expired refresh token")})
    public ResponseEntity<RefreshTokenResponse> refresh(
            @Valid @RequestBody RefreshTokenRequest request) {
        log.debug("Refresh token request");
        RefreshTokenResponse response = authService.refreshToken(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout user", description = "Invalidates current access and refresh tokens",
            security = @SecurityRequirement(name = "bearer-jwt"))
    @ApiResponses(value = {@ApiResponse(responseCode = "204", description = "Logout successful"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")})
    public ResponseEntity<Void> logout(@RequestHeader("Authorization") String authHeader,
            Authentication authentication) {
        UUID userId = (UUID) authentication.getPrincipal();
        String accessToken = authHeader.substring(7); // Remove "Bearer "

        log.debug("Logout request for user: {}", userId);
        authService.logout(userId, accessToken, null);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    @Operation(summary = "Get current user", description = "Returns information about the currently authenticated user",
            security = @SecurityRequirement(name = "bearer-jwt"))
    @ApiResponses(value = {@ApiResponse(responseCode = "200", description = "User info retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")})
    public ResponseEntity<UserInfoResponse> getCurrentUser(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            log.warn("Attempted to get current user without valid authentication");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        UUID userId = (UUID) authentication.getPrincipal();
        log.debug("Get current user request for: {}", userId);
        UserInfoResponse response = authService.getCurrentUser(userId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/password-reset/request")
    @Operation(summary = "Request password reset", description = "Sends password reset email to user")
    @ApiResponses(value = {@ApiResponse(responseCode = "200", description = "Request processed"),
            @ApiResponse(responseCode = "429", description = "Too many requests")})
    public ResponseEntity<MessageResponse> requestPasswordReset(
            @Valid @RequestBody PasswordResetRequestDto request) {
        log.debug("Password reset request for email: {}", request.email());
        MessageResponse response = passwordResetService.requestPasswordReset(request.email());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/password-reset/confirm")
    @Operation(summary = "Confirm password reset", description = "Sets new password using reset token")
    @ApiResponses(value = {@ApiResponse(responseCode = "200", description = "Password reset successful"),
            @ApiResponse(responseCode = "400", description = "Invalid token"),
            @ApiResponse(responseCode = "410", description = "Token expired")})
    public ResponseEntity<MessageResponse> confirmPasswordReset(
            @Valid @RequestBody PasswordResetConfirmDto request) {
        log.debug("Password reset confirmation");
        MessageResponse response = passwordResetService.confirmPasswordReset(request);
        return ResponseEntity.ok(response);
    }
}

