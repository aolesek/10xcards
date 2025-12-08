package pl.olesek._xcards.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;

public record PasswordResetRequestDto(
        @NotNull(message = "Email is required") @Email(
                message = "Invalid email format") String email) {
}

