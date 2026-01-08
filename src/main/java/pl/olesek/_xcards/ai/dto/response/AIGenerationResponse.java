package pl.olesek._xcards.ai.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Response DTO containing AI generation session details with all candidates.
 */
public record AIGenerationResponse(

        @Schema(description = "Generation session UUID",
                example = "123e4567-e89b-12d3-a456-426614174000")
        UUID id,

        @Schema(description = "Target deck UUID", example = "123e4567-e89b-12d3-a456-426614174000")
        UUID deckId,

        @Schema(description = "AI model used for generation", example = "openai/gpt-4")
        String aiModel,

        @Schema(description = "SHA-256 hash of source text",
                example = "5d41402abc4b2a76b9719d911017c592")
        String sourceTextHash,

        @Schema(description = "Length of source text in characters", example = "1523")
        Integer sourceTextLength,

        @Schema(description = "Number of generated candidates", example = "8")
        Integer generatedCandidatesCount,

        @Schema(description = "List of flashcard candidates")
        List<CandidateDto> candidates,

        @Schema(description = "Creation timestamp", example = "2025-01-20T13:00:00Z")
        Instant createdAt,

        @Schema(description = "Last update timestamp", example = "2025-01-20T13:00:00Z")
        Instant updatedAt) {
}
