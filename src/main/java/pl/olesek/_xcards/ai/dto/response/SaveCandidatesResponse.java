package pl.olesek._xcards.ai.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;
import java.util.UUID;

/**
 * Response DTO for saving accepted/edited candidates as flashcards.
 */
public record SaveCandidatesResponse(

        @Schema(description = "Number of flashcards saved", example = "5")
        Integer savedCount,

        @Schema(description = "List of created flashcard UUIDs")
        List<UUID> flashcardIds) {
}
