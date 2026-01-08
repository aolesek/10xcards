package pl.olesek._xcards.ai.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.UUID;

/**
 * DTO representing a single flashcard candidate in responses.
 */
public record CandidateDto(

        @Schema(description = "Candidate UUID", example = "123e4567-e89b-12d3-a456-426614174000")
        UUID id,

        @Schema(description = "Front of flashcard (question)",
                example = "What is photosynthesis?")
        String front,

        @Schema(description = "Back of flashcard (answer)",
                example = "The process by which plants convert light energy...")
        String back,

        @Schema(description = "Current status of the candidate",
                allowableValues = {"pending", "accepted", "rejected", "edited"},
                example = "pending")
        String status,

        @Schema(description = "Edited front text (null if not edited)", nullable = true)
        String editedFront,

        @Schema(description = "Edited back text (null if not edited)", nullable = true)
        String editedBack) {
}
