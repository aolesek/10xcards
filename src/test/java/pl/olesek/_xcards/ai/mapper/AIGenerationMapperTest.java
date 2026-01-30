package pl.olesek._xcards.ai.mapper;

import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import pl.olesek._xcards.ai.AIGenerationEntity;
import pl.olesek._xcards.ai.dto.response.AIGenerationResponse;
import pl.olesek._xcards.ai.dto.response.CandidateDto;
import pl.olesek._xcards.ai.model.CandidateModel;
import pl.olesek._xcards.deck.DeckEntity;
import pl.olesek._xcards.user.UserEntity;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AIGenerationMapperTest {

    private AIGenerationMapper mapper;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        mapper = new AIGenerationMapper(objectMapper);
    }

    // ==================== serializeCandidates Tests ====================

    @Test
    void shouldSerializeCandidatesToJson() {
        // Given
        List<CandidateModel> candidates = List.of(
                new CandidateModel(UUID.randomUUID(), "What is Java?", "Programming language",
                        "pending", null, null),
                new CandidateModel(UUID.randomUUID(), "What is Spring?", "Java framework",
                        "accepted", null, null));

        // When
        String json = mapper.serializeCandidates(candidates);

        // Then
        assertThat(json).isNotNull();
        assertThat(json).contains("What is Java?");
        assertThat(json).contains("Programming language");
        assertThat(json).contains("What is Spring?");
        assertThat(json).contains("pending");
        assertThat(json).contains("accepted");
    }

    @Test
    void shouldSerializeEmptyList() {
        // Given
        List<CandidateModel> candidates = List.of();

        // When
        String json = mapper.serializeCandidates(candidates);

        // Then
        assertThat(json).isEqualTo("[]");
    }

    @Test
    void shouldSerializeCandidatesWithEditedFields() {
        // Given
        List<CandidateModel> candidates = List.of(new CandidateModel(UUID.randomUUID(),
                "Original front", "Original back", "edited", "Edited front", "Edited back"));

        // When
        String json = mapper.serializeCandidates(candidates);

        // Then
        assertThat(json).contains("Edited front");
        assertThat(json).contains("Edited back");
        assertThat(json).contains("edited");
    }

    // ==================== deserializeCandidates Tests ====================

    @Test
    void shouldDeserializeCandidatesFromJson() {
        // Given
        UUID candidateId = UUID.randomUUID();
        String json = """
                [
                  {
                    "id": "%s",
                    "front": "What is AI?",
                    "back": "Artificial Intelligence",
                    "status": "pending"
                  }
                ]
                """.formatted(candidateId);

        // When
        List<CandidateModel> candidates = mapper.deserializeCandidates(json);

        // Then
        assertThat(candidates).hasSize(1);
        assertThat(candidates.get(0).id()).isEqualTo(candidateId);
        assertThat(candidates.get(0).front()).isEqualTo("What is AI?");
        assertThat(candidates.get(0).back()).isEqualTo("Artificial Intelligence");
        assertThat(candidates.get(0).status()).isEqualTo("pending");
        assertThat(candidates.get(0).editedFront()).isNull();
        assertThat(candidates.get(0).editedBack()).isNull();
    }

    @Test
    void shouldDeserializeMultipleCandidates() {
        // Given
        UUID id1 = UUID.randomUUID();
        UUID id2 = UUID.randomUUID();
        String json = """
                [
                  {
                    "id": "%s",
                    "front": "Q1",
                    "back": "A1",
                    "status": "accepted"
                  },
                  {
                    "id": "%s",
                    "front": "Q2",
                    "back": "A2",
                    "status": "rejected"
                  }
                ]
                """.formatted(id1, id2);

        // When
        List<CandidateModel> candidates = mapper.deserializeCandidates(json);

        // Then
        assertThat(candidates).hasSize(2);
        assertThat(candidates.get(0).status()).isEqualTo("accepted");
        assertThat(candidates.get(1).status()).isEqualTo("rejected");
    }

    @Test
    void shouldDeserializeEmptyArray() {
        // Given
        String json = "[]";

        // When
        List<CandidateModel> candidates = mapper.deserializeCandidates(json);

        // Then
        assertThat(candidates).isEmpty();
    }

    @Test
    void shouldHandleInvalidJson() {
        // Given
        String invalidJson = "{ this is not valid json }";

        // When/Then
        assertThatThrownBy(() -> mapper.deserializeCandidates(invalidJson))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Failed to parse candidates JSON");
    }

    @Test
    void shouldHandleNullFieldsInJson() {
        // Given
        UUID candidateId = UUID.randomUUID();
        String json = """
                [
                  {
                    "id": "%s",
                    "front": "Question",
                    "back": "Answer",
                    "status": "pending",
                    "editedFront": null,
                    "editedBack": null
                  }
                ]
                """.formatted(candidateId);

        // When
        List<CandidateModel> candidates = mapper.deserializeCandidates(json);

        // Then
        assertThat(candidates).hasSize(1);
        assertThat(candidates.get(0).editedFront()).isNull();
        assertThat(candidates.get(0).editedBack()).isNull();
    }

    // ==================== toResponse Tests ====================

    @Test
    void shouldConvertEntityToResponse() {
        // Given
        UUID generationId = UUID.randomUUID();
        UUID deckId = UUID.randomUUID();
        UUID candidateId = UUID.randomUUID();

        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());

        DeckEntity deck = new DeckEntity();
        deck.setId(deckId);
        deck.setUser(user);

        String candidatesJson = """
                [
                  {
                    "id": "%s",
                    "front": "Test Q",
                    "back": "Test A",
                    "status": "pending"
                  }
                ]
                """.formatted(candidateId);

        AIGenerationEntity entity = new AIGenerationEntity();
        entity.setId(generationId);
        entity.setDeck(deck);
        entity.setUser(user);
        entity.setAiModel("openai/gpt-4");
        entity.setSourceTextHash("hash123");
        entity.setSourceTextLength(1000);
        entity.setGeneratedCandidatesCount(1);
        entity.setCandidates(candidatesJson);
        entity.setCreatedAt(Instant.now());
        entity.setUpdatedAt(Instant.now());

        // When
        AIGenerationResponse response = mapper.toResponse(entity);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(generationId);
        assertThat(response.deckId()).isEqualTo(deckId);
        assertThat(response.aiModel()).isEqualTo("openai/gpt-4");
        assertThat(response.sourceTextHash()).isEqualTo("hash123");
        assertThat(response.sourceTextLength()).isEqualTo(1000);
        assertThat(response.generatedCandidatesCount()).isEqualTo(1);
        assertThat(response.candidates()).hasSize(1);
        assertThat(response.candidates().get(0).front()).isEqualTo("Test Q");
    }

    @Test
    void shouldHandleNullDeckInEntity() {
        // Given
        AIGenerationEntity entity = new AIGenerationEntity();
        entity.setId(UUID.randomUUID());
        entity.setDeck(null); // Deck został usunięty
        entity.setAiModel("openai/gpt-4");
        entity.setSourceTextHash("hash");
        entity.setSourceTextLength(500);
        entity.setGeneratedCandidatesCount(0);
        entity.setCandidates("[]");
        entity.setCreatedAt(Instant.now());
        entity.setUpdatedAt(Instant.now());

        // When
        AIGenerationResponse response = mapper.toResponse(entity);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.deckId()).isNull();
    }

    // ==================== toCandidateDto Tests ====================

    @Test
    void shouldConvertCandidateModelToDto() {
        // Given
        UUID candidateId = UUID.randomUUID();
        CandidateModel model = new CandidateModel(candidateId, "Front text", "Back text",
                "accepted", null, null);

        // When
        CandidateDto dto = mapper.toCandidateDto(model);

        // Then
        assertThat(dto).isNotNull();
        assertThat(dto.id()).isEqualTo(candidateId);
        assertThat(dto.front()).isEqualTo("Front text");
        assertThat(dto.back()).isEqualTo("Back text");
        assertThat(dto.status()).isEqualTo("accepted");
        assertThat(dto.editedFront()).isNull();
        assertThat(dto.editedBack()).isNull();
    }

    @Test
    void shouldConvertEditedCandidateModelToDto() {
        // Given
        UUID candidateId = UUID.randomUUID();
        CandidateModel model = new CandidateModel(candidateId, "Original front", "Original back",
                "edited", "Edited front", "Edited back");

        // When
        CandidateDto dto = mapper.toCandidateDto(model);

        // Then
        assertThat(dto).isNotNull();
        assertThat(dto.status()).isEqualTo("edited");
        assertThat(dto.editedFront()).isEqualTo("Edited front");
        assertThat(dto.editedBack()).isEqualTo("Edited back");
    }
}
