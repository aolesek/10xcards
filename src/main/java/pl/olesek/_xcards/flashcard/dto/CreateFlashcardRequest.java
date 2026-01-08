package pl.olesek._xcards.flashcard.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Request to create a new manual flashcard")
public record CreateFlashcardRequest(
        @NotBlank(message = "Front cannot be blank")
        @Size(max = 500, message = "Front cannot exceed 500 characters")
        @Schema(description = "Front side of the flashcard", example = "What is mitosis?", requiredMode = Schema.RequiredMode.REQUIRED)
        String front,

        @NotBlank(message = "Back cannot be blank")
        @Size(max = 500, message = "Back cannot exceed 500 characters")
        @Schema(description = "Back side of the flashcard", example = "Cell division process that produces two identical daughter cells", requiredMode = Schema.RequiredMode.REQUIRED)
        String back) {}


