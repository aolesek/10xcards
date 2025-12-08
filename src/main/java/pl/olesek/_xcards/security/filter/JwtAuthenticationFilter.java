package pl.olesek._xcards.security.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.lang.NonNull;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import pl.olesek._xcards.auth.exception.InvalidTokenException;
import pl.olesek._xcards.auth.exception.TokenExpiredException;
import pl.olesek._xcards.security.JwtAuthentication;
import pl.olesek._xcards.security.service.JwtService;
import pl.olesek._xcards.security.service.TokenBlacklistService;

import java.io.IOException;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String AUTHORIZATION_HEADER = "Authorization";

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;

    private final TokenBlacklistService tokenBlacklistService;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response, @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        String token = extractTokenFromHeader(request);

        if (token != null) {
            try {
                if (jwtService.validateToken(token)) {
                    if (tokenBlacklistService.isBlacklisted(token)) {
                        log.warn("Attempt to use blacklisted token");
                        filterChain.doFilter(request, response);
                        return;
                    }

                    UUID userId = jwtService.getUserIdFromToken(token);
                    String role = jwtService.getRoleFromToken(token);

                    JwtAuthentication authentication = new JwtAuthentication(userId, role);

                    SecurityContextHolder.getContext().setAuthentication(authentication);

                    log.debug("User authenticated: {} with role: {}", userId, role);
                }
            } catch (InvalidTokenException | TokenExpiredException e) {
                log.debug("Token validation failed: {}", e.getMessage());
                SecurityContextHolder.clearContext();
            } catch (Exception e) {
                log.error("Unexpected error during JWT authentication", e);
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(request, response);
    }

    private String extractTokenFromHeader(HttpServletRequest request) {
        String authHeader = request.getHeader(AUTHORIZATION_HEADER);

        if (authHeader != null && authHeader.startsWith(BEARER_PREFIX)) {
            return authHeader.substring(BEARER_PREFIX.length());
        }

        return null;
    }
}

