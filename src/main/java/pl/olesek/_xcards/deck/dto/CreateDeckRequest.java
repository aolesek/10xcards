package pl.olesek._xcards.deck.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Request to create a new deck")
public record CreateDeckRequest(
        @NotBlank(message = "Deck name cannot be blank")
        @Size(max = 100, message = "Deck name cannot exceed 100 characters")
        @Schema(description = "Name of the deck", example = "Biology 101")
        String name) {}

