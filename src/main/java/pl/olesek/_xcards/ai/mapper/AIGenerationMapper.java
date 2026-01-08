package pl.olesek._xcards.ai.mapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Component;

import pl.olesek._xcards.ai.AIGenerationEntity;
import pl.olesek._xcards.ai.dto.response.AIGenerationResponse;
import pl.olesek._xcards.ai.dto.response.CandidateDto;
import pl.olesek._xcards.ai.model.CandidateModel;

import java.util.List;

/**
 * Mapper for converting between AIGenerationEntity and DTOs. Handles JSONB
 * serialization/deserialization of candidates.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AIGenerationMapper {

    private final ObjectMapper objectMapper;

    /**
     * Converts AIGenerationEntity to AIGenerationResponse DTO.
     * 
     * @param entity the entity to convert
     * @return the response DTO
     */
    public AIGenerationResponse toResponse(AIGenerationEntity entity) {
        List<CandidateDto> candidateDtos = deserializeCandidates(entity.getCandidates()).stream()
                .map(this::toCandidateDto).toList();

        return new AIGenerationResponse(entity.getId(),
                entity.getDeck() != null ? entity.getDeck().getId() : null, entity.getAiModel(),
                entity.getSourceTextHash(), entity.getSourceTextLength(),
                entity.getGeneratedCandidatesCount(), candidateDtos, entity.getCreatedAt(),
                entity.getUpdatedAt());
    }

    /**
     * Converts CandidateModel to CandidateDto.
     * 
     * @param model the internal model
     * @return the DTO for API response
     */
    public CandidateDto toCandidateDto(CandidateModel model) {
        return new CandidateDto(model.id(), model.front(), model.back(), model.status(),
                model.editedFront(), model.editedBack());
    }

    /**
     * Deserializes JSONB string to List of CandidateModel.
     * 
     * @param json the JSONB string from database
     * @return list of candidate models
     */
    public List<CandidateModel> deserializeCandidates(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<List<CandidateModel>>() {});
        } catch (JsonProcessingException e) {
            log.error("Failed to deserialize candidates JSON: {}", json, e);
            throw new IllegalArgumentException("Failed to parse candidates JSON", e);
        }
    }

    /**
     * Serializes List of CandidateModel to JSONB string.
     * 
     * @param candidates the list of candidates to serialize
     * @return JSONB string for database storage
     */
    public String serializeCandidates(List<CandidateModel> candidates) {
        try {
            return objectMapper.writeValueAsString(candidates);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize candidates to JSON", e);
            throw new IllegalArgumentException("Failed to serialize candidates to JSON", e);
        }
    }
}
