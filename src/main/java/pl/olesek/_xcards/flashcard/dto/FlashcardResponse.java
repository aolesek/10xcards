package pl.olesek._xcards.flashcard.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.UUID;

@Schema(description = "Flashcard details")
public record FlashcardResponse(
        @Schema(description = "Unique identifier of the flashcard", example = "550e8400-e29b-41d4-a716-446655440000")
        UUID id,

        @Schema(description = "Unique identifier of the deck containing this flashcard", example = "550e8400-e29b-41d4-a716-446655440001")
        UUID deckId,

        @Schema(description = "Front side of the flashcard", example = "What is photosynthesis?")
        String front,

        @Schema(description = "Back side of the flashcard", example = "The process by which plants convert light energy into chemical energy")
        String back,

        @Schema(description = "Source of the flashcard", example = "ai", allowableValues = {"manual", "ai", "ai-edited"})
        String source,

        @Schema(description = "Unique identifier of the AI generation (null for manual flashcards)", example = "550e8400-e29b-41d4-a716-446655440002", nullable = true)
        UUID generationId,

        @Schema(description = "Timestamp when the flashcard was created", example = "2025-01-15T10:00:00Z")
        Instant createdAt,

        @Schema(description = "Timestamp when the flashcard was last updated", example = "2025-01-15T10:00:00Z")
        Instant updatedAt) {}


