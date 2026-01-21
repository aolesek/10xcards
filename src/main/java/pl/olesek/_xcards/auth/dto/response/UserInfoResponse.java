package pl.olesek._xcards.auth.dto.response;

import pl.olesek._xcards.user.UserEntity;

import java.util.UUID;

/**
 * Response DTO for current user information (without tokens)
 */
public record UserInfoResponse(UUID id, String email, String role, Integer monthlyAiLimit,
        Integer aiUsageInCurrentMonth) {

    public static UserInfoResponse from(UserEntity user) {
        return new UserInfoResponse(user.getId(), user.getEmail(), user.getRole(),
                user.getMonthlyAiLimit(), user.getAiUsageInCurrentMonth());
    }
}
