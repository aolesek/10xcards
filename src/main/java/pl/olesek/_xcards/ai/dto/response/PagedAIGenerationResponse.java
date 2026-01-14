package pl.olesek._xcards.ai.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

import pl.olesek._xcards.deck.dto.PageInfo;

import java.util.List;

@Schema(description = "Paginated list of AI generations")
public record PagedAIGenerationResponse(
        @Schema(description = "List of AI generations in the current page")
        List<AIGenerationResponse> content,

        @Schema(description = "Pagination metadata")
        PageInfo page) {
}
