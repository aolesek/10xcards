package pl.olesek._xcards.deck.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Request to update a deck")
public record UpdateDeckRequest(
        @NotBlank(message = "Deck name cannot be blank")
        @Size(max = 100, message = "Deck name cannot exceed 100 characters")
        @Schema(description = "New name of the deck", example = "Advanced Biology")
        String name) {}

