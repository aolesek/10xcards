package pl.olesek._xcards.ai.model;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.UUID;

/**
 * Internal model for JSONB serialization/deserialization of flashcard candidates. This model is
 * stored in the 'candidates' column of ai_generations table.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record CandidateModel(UUID id, String front, String back, String status, String editedFront,
        String editedBack) {
}
