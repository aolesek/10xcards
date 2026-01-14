package pl.olesek._xcards.deck.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.UUID;

@Schema(description = "Simplified flashcard for study session")
public record StudyFlashcardDto(
        @Schema(description = "Unique identifier", example = "550e8400-e29b-41d4-a716-446655440001")
        UUID id,

        @Schema(description = "Question", example = "What is mitosis?")
        String front,

        @Schema(description = "Answer", example = "Cell division process")
        String back) {
}
