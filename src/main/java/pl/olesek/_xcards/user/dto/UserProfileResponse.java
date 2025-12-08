package pl.olesek._xcards.user.dto;

import pl.olesek._xcards.user.UserEntity;

import java.time.Instant;
import java.util.UUID;

public record UserProfileResponse(UUID id, String email, String role, Integer monthlyAiLimit,
        Integer aiUsageInCurrentMonth, Instant createdAt, Instant updatedAt) {

    public static UserProfileResponse from(UserEntity user) {
        return new UserProfileResponse(user.getId(), user.getEmail(), user.getRole(),
                user.getMonthlyAiLimit(), user.getAiUsageInCurrentMonth(), user.getCreatedAt(),
                user.getUpdatedAt());
    }
}

