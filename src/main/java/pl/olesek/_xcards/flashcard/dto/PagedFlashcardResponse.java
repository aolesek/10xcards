package pl.olesek._xcards.flashcard.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import pl.olesek._xcards.deck.dto.PageInfo;

import java.util.List;

@Schema(description = "Paginated list of flashcards")
public record PagedFlashcardResponse(
        @Schema(description = "List of flashcards in the current page")
        List<FlashcardResponse> content,

        @Schema(description = "Pagination metadata")
        PageInfo page) {}


