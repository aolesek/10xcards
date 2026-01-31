package pl.olesek._xcards.ai.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * DTO for updating a single flashcard candidate status.
 */
public record CandidateUpdateDto(

        @NotNull(message = "Candidate ID is required")
        @Schema(description = "Candidate UUID", example = "123e4567-e89b-12d3-a456-426614174000")
        UUID id,

        @NotNull(message = "Status is required")
        @Pattern(regexp = "accepted|rejected|edited|pending",
                message = "Status must be: accepted, rejected, edited, or pending")
        @Schema(description = "New status for the candidate",
                allowableValues = {"accepted", "rejected", "edited", "pending"}, example = "accepted")
        String status,

        @Size(max = 500, message = "Edited front cannot exceed 500 characters")
        @Schema(description = "Edited front text (required if status=edited)", nullable = true,
                example = "What is the process of photosynthesis?")
        String editedFront,

        @Size(max = 500, message = "Edited back cannot exceed 500 characters")
        @Schema(description = "Edited back text (required if status=edited)", nullable = true,
                example = "Photosynthesis is the process by which plants convert...")
        String editedBack) {
}
