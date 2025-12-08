package pl.olesek._xcards.flashcard.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Request to update an existing flashcard")
public record UpdateFlashcardRequest(
        @NotBlank(message = "Front cannot be blank")
        @Size(max = 500, message = "Front cannot exceed 500 characters")
        @Schema(description = "Updated front side of the flashcard", example = "What is mitosis? (Updated)", requiredMode = Schema.RequiredMode.REQUIRED)
        String front,

        @NotBlank(message = "Back cannot be blank")
        @Size(max = 500, message = "Back cannot exceed 500 characters")
        @Schema(description = "Updated back side of the flashcard", example = "Cell division process that produces two genetically identical daughter cells from one parent cell", requiredMode = Schema.RequiredMode.REQUIRED)
        String back) {}

