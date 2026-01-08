package pl.olesek._xcards.deck.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Paginated list of decks")
public record PagedDeckResponse(
        @Schema(description = "List of decks in the current page")
        List<DeckResponse> content,
        @Schema(description = "Pagination metadata")
        PageInfo page) {}


