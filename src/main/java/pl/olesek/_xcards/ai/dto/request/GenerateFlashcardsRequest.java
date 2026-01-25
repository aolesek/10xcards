package pl.olesek._xcards.ai.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Request DTO for generating flashcards from source text using AI.
 */
public record GenerateFlashcardsRequest(

        @NotNull(message = "Deck ID is required")
        @Schema(description = "Target deck UUID", example = "123e4567-e89b-12d3-a456-426614174000")
        UUID deckId,

        @NotNull(message = "Source text is required")
        @Size(min = 500, max = 10000,
                message = "Source text must be between 500 and 10000 characters")
        @Schema(description = "Source text for flashcard generation",
                example = "Photosynthesis is the process by which plants convert light energy...")
        String sourceText,

        @Min(value = 1, message = "Requested candidates count must be at least 1")
        @Max(value = 100, message = "Requested candidates count must not exceed 100")
        @Schema(description = "Number of flashcard candidates to generate (1-100)", 
                example = "10", 
                defaultValue = "10")
        Integer requestedCandidatesCount) {
}
