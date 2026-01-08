package pl.olesek._xcards.ai.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO for candidate update operation.
 */
public record UpdateCandidatesResponse(

        @Schema(description = "Generation session UUID",
                example = "123e4567-e89b-12d3-a456-426614174000")
        UUID id,

        @Schema(description = "Number of candidates updated", example = "3")
        Integer updatedCandidatesCount,

        @Schema(description = "Update timestamp", example = "2025-01-20T13:15:00Z")
        Instant updatedAt) {
}
