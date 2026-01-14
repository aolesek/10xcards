package pl.olesek._xcards.deck.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;
import java.util.UUID;

@Schema(description = "Study session with flashcards")
public record StudySessionResponse(
        @Schema(description = "Deck identifier", example = "550e8400-e29b-41d4-a716-446655440000")
        UUID deckId,

        @Schema(description = "Deck name", example = "Biology 101")
        String deckName,

        @Schema(description = "Total cards count", example = "45")
        int totalCards,

        @Schema(description = "Flashcards list")
        List<StudyFlashcardDto> flashcards) {
}
