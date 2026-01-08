package pl.olesek._xcards.deck.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.UUID;

@Schema(description = "Deck response with details")
public record DeckResponse(
        @Schema(description = "Unique identifier of the deck", example = "550e8400-e29b-41d4-a716-446655440000")
        UUID id,
        @Schema(description = "Name of the deck", example = "Biology 101")
        String name,
        @Schema(description = "Number of flashcards in the deck", example = "45")
        int flashcardCount,
        @Schema(description = "Timestamp when the deck was created", example = "2025-01-10T09:00:00Z")
        Instant createdAt,
        @Schema(description = "Timestamp when the deck was last updated", example = "2025-01-15T14:30:00Z")
        Instant updatedAt) {}


