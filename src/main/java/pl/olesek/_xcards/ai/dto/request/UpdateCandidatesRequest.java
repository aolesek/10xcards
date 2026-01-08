package pl.olesek._xcards.ai.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * Request DTO for updating multiple flashcard candidates.
 */
public record UpdateCandidatesRequest(

        @NotNull(message = "Candidates list cannot be null")
        @NotEmpty(message = "Candidates list cannot be empty")
        @Valid
        @Schema(description = "List of candidate updates")
        List<CandidateUpdateDto> candidates) {
}
