package pl.olesek._xcards.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import pl.olesek._xcards.auth.validation.ValidPassword;

public record RegisterRequest(
        @NotNull(message = "Email is required") @Email(message = "Invalid email format") @Size(
                max = 255,
                message = "Email must not exceed 255 characters") String email,

        @NotNull(message = "Password is required") @ValidPassword String password) {
}

