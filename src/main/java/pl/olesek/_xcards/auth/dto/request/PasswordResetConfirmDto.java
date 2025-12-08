package pl.olesek._xcards.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import pl.olesek._xcards.auth.validation.ValidPassword;

public record PasswordResetConfirmDto(@NotBlank(message = "Token is required") String token,

        @NotNull(message = "New password is required") @ValidPassword String newPassword) {
}

