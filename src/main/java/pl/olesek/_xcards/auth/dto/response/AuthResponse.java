package pl.olesek._xcards.auth.dto.response;

import pl.olesek._xcards.user.UserEntity;

import java.util.UUID;

public record AuthResponse(UUID id, String email, String role, Integer monthlyAiLimit,
        Integer aiUsageInCurrentMonth, String accessToken, String refreshToken) {

    public static AuthResponse from(UserEntity user, String accessToken, String refreshToken) {
        return new AuthResponse(user.getId(), user.getEmail(), user.getRole(),
                user.getMonthlyAiLimit(), user.getAiUsageInCurrentMonth(), accessToken,
                refreshToken);
    }
}

