package pl.olesek._xcards.ai.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import pl.olesek._xcards.ai.AIGenerationEntity;
import pl.olesek._xcards.ai.AIGenerationRepository;
import pl.olesek._xcards.ai.dto.request.CandidateUpdateDto;
import pl.olesek._xcards.ai.dto.request.GenerateFlashcardsRequest;
import pl.olesek._xcards.ai.dto.request.UpdateCandidatesRequest;
import pl.olesek._xcards.ai.dto.response.AIGenerationResponse;
import pl.olesek._xcards.ai.dto.response.SaveCandidatesResponse;
import pl.olesek._xcards.ai.dto.response.UpdateCandidatesResponse;
import pl.olesek._xcards.ai.exception.AIGenerationNotFoundException;
import pl.olesek._xcards.ai.exception.ForbiddenException;
import pl.olesek._xcards.ai.exception.InvalidCandidateUpdateException;
import pl.olesek._xcards.ai.exception.MonthlyAILimitExceededException;
import pl.olesek._xcards.ai.exception.NoAcceptedCandidatesException;
import pl.olesek._xcards.ai.mapper.AIGenerationMapper;
import pl.olesek._xcards.ai.model.AIGenerationMode;
import pl.olesek._xcards.ai.model.AIModel;
import pl.olesek._xcards.ai.model.CandidateModel;
import pl.olesek._xcards.auth.exception.RateLimitExceededException;
import pl.olesek._xcards.deck.DeckEntity;
import pl.olesek._xcards.deck.DeckRepository;
import pl.olesek._xcards.deck.exception.DeckNotFoundException;
import pl.olesek._xcards.flashcard.FlashcardEntity;
import pl.olesek._xcards.flashcard.FlashcardRepository;
import pl.olesek._xcards.flashcard.FlashcardSource;
import pl.olesek._xcards.ratelimit.service.RateLimitService;
import pl.olesek._xcards.user.UserEntity;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AIGenerationServiceTest {

    @Mock
    private AIGenerationRepository aiGenerationRepository;

    @Mock
    private DeckRepository deckRepository;

    @Mock
    private FlashcardRepository flashcardRepository;

    @Mock
    private AIClientService aiClientService;

    @Mock
    private AIGenerationMapper mapper;

    @Mock
    private RateLimitService rateLimitService;

    @InjectMocks
    private AIGenerationService aiGenerationService;

    private UUID userId;
    private UUID deckId;
    private UUID generationId;
    private DeckEntity testDeck;
    private UserEntity testUser;
    private AIGenerationEntity testGeneration;
    private List<CandidateModel> testCandidates;
    private String candidatesJson;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        deckId = UUID.randomUUID();
        generationId = UUID.randomUUID();

        // Set config values
        ReflectionTestUtils.setField(aiGenerationService, "monthlyLimit", 100);
        ReflectionTestUtils.setField(aiGenerationService, "rateLimitPerMinute", 10);
        ReflectionTestUtils.setField(aiGenerationService, "aiModel", "openai/gpt-4");

        // Setup test user
        testUser = new UserEntity();
        testUser.setId(userId);
        testUser.setEmail("test@example.com");

        // Setup test deck
        testDeck = new DeckEntity();
        testDeck.setId(deckId);
        testDeck.setName("Biology 101");
        testDeck.setUser(testUser);
        testDeck.setCreatedAt(Instant.now());

        // Setup test candidates
        testCandidates = List.of(
                new CandidateModel(UUID.randomUUID(), "What is photosynthesis?",
                        "Process of converting light", "pending", null, null),
                new CandidateModel(UUID.randomUUID(), "What is ATP?", "Energy molecule", "pending",
                        null, null));

        candidatesJson = """
                [
                  {"id": "123", "front": "Q1", "back": "A1", "status": "pending"},
                  {"id": "456", "front": "Q2", "back": "A2", "status": "pending"}
                ]
                """;

        // Setup test generation
        testGeneration = new AIGenerationEntity();
        testGeneration.setId(generationId);
        testGeneration.setUser(testUser);
        testGeneration.setDeck(testDeck);
        testGeneration.setAiModel("openai/gpt-4");
        testGeneration.setSourceTextHash("hash123");
        testGeneration.setSourceTextLength(1000);
        testGeneration.setGeneratedCandidatesCount(2);
        testGeneration.setCandidates(candidatesJson);
        testGeneration.setCreatedAt(Instant.now());
        testGeneration.setUpdatedAt(Instant.now());
    }

    // ==================== generateFlashcards Tests ====================

    @Test
    void shouldGenerateFlashcardsSuccessfully() {
        // Given
        String sourceText = "Photosynthesis is the process...";
        GenerateFlashcardsRequest request = new GenerateFlashcardsRequest(deckId, sourceText, 10, AIModel.GPT_4O_MINI,
                AIGenerationMode.KNOWLEDGE_ASSIMILATION);

        when(deckRepository.findByIdAndUserId(deckId, userId))
                .thenReturn(Optional.of(testDeck));
        when(rateLimitService.tryConsume(anyString(), anyInt(), any(Duration.class)))
                .thenReturn(true);
        when(aiGenerationRepository.findByUserIdOrderByCreatedAtDesc(userId))
                .thenReturn(List.of());
        when(aiClientService.generateCandidatesFromText(anyString(), anyInt(), anyString(), any()))
                .thenReturn(testCandidates);
        when(mapper.serializeCandidates(any())).thenReturn(candidatesJson);
        when(aiGenerationRepository.save(any(AIGenerationEntity.class)))
                .thenReturn(testGeneration);
        when(mapper.toResponse(any())).thenReturn(new AIGenerationResponse(generationId, deckId,
                "openai/gpt-4", "hash", 1000, 2, List.of(), Instant.now(), Instant.now()));

        // When
        AIGenerationResponse response = aiGenerationService.generateFlashcards(request, userId);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(generationId);
        verify(aiGenerationRepository).save(any(AIGenerationEntity.class));
    }

    @Test
    void shouldThrowExceptionWhenDeckNotFound() {
        // Given
        GenerateFlashcardsRequest request = new GenerateFlashcardsRequest(deckId, "Test text", 10, AIModel.GPT_4O_MINI,
                AIGenerationMode.KNOWLEDGE_ASSIMILATION);

        when(deckRepository.findByIdAndUserId(deckId, userId)).thenReturn(Optional.empty());
        when(deckRepository.existsById(deckId)).thenReturn(false);

        // When/Then
        assertThatThrownBy(() -> aiGenerationService.generateFlashcards(request, userId))
                .isInstanceOf(DeckNotFoundException.class)
                .hasMessageContaining("Deck not found with id: " + deckId);
    }

    @Test
    void shouldThrowForbiddenWhenDeckBelongsToAnotherUser() {
        // Given
        GenerateFlashcardsRequest request = new GenerateFlashcardsRequest(deckId, "Test text", 10, AIModel.GPT_4O_MINI,
                AIGenerationMode.KNOWLEDGE_ASSIMILATION);

        when(deckRepository.findByIdAndUserId(deckId, userId)).thenReturn(Optional.empty());
        when(deckRepository.existsById(deckId)).thenReturn(true);

        // When/Then
        assertThatThrownBy(() -> aiGenerationService.generateFlashcards(request, userId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("You don't have access to this deck");
    }

    @Test
    void shouldThrowExceptionWhenRateLimitExceeded() {
        // Given
        GenerateFlashcardsRequest request = new GenerateFlashcardsRequest(deckId, "Test text", 10, AIModel.GPT_4O_MINI,
                AIGenerationMode.KNOWLEDGE_ASSIMILATION);

        when(deckRepository.findByIdAndUserId(deckId, userId))
                .thenReturn(Optional.of(testDeck));
        when(rateLimitService.tryConsume(anyString(), anyInt(), any(Duration.class)))
                .thenReturn(false);

        // When/Then
        assertThatThrownBy(() -> aiGenerationService.generateFlashcards(request, userId))
                .isInstanceOf(RateLimitExceededException.class)
                .hasMessageContaining("Too many AI generation requests");
    }

    @Test
    void shouldThrowExceptionWhenMonthlyLimitExceeded() {
        // Given
        GenerateFlashcardsRequest request = new GenerateFlashcardsRequest(deckId, "Test text", 10, AIModel.GPT_4O_MINI,
                AIGenerationMode.KNOWLEDGE_ASSIMILATION);

        // Create 100 generations from this month (all within current month)
        // Use seconds instead of hours/minutes to ensure all generations are within the current month
        List<AIGenerationEntity> generations =
                java.util.stream.IntStream.range(0, 100).mapToObj(i -> {
                    AIGenerationEntity gen = new AIGenerationEntity();
                    // Set all generations to be within this month (subtract seconds to stay in current month)
                    gen.setCreatedAt(Instant.now().minus(i, ChronoUnit.SECONDS));
                    return gen;
                }).toList();

        when(deckRepository.findByIdAndUserId(deckId, userId))
                .thenReturn(Optional.of(testDeck));
        when(rateLimitService.tryConsume(anyString(), anyInt(), any(Duration.class)))
                .thenReturn(true);
        when(aiGenerationRepository.findByUserIdOrderByCreatedAtDesc(userId))
                .thenReturn(generations);

        // When/Then
        assertThatThrownBy(() -> aiGenerationService.generateFlashcards(request, userId))
                .isInstanceOf(MonthlyAILimitExceededException.class)
                .hasMessageContaining("Monthly AI generation limit exceeded");
    }

    // ==================== getGeneration Tests ====================

    @Test
    void shouldGetGenerationSuccessfully() {
        // Given
        when(aiGenerationRepository.findByIdAndUserId(generationId, userId))
                .thenReturn(Optional.of(testGeneration));
        when(mapper.toResponse(testGeneration)).thenReturn(new AIGenerationResponse(generationId,
                deckId, "openai/gpt-4", "hash", 1000, 2, List.of(), Instant.now(), Instant.now()));

        // When
        AIGenerationResponse response = aiGenerationService.getGeneration(generationId, userId);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(generationId);
        verify(aiGenerationRepository).findByIdAndUserId(generationId, userId);
    }

    @Test
    void shouldThrowExceptionWhenGenerationNotFound() {
        // Given
        when(aiGenerationRepository.findByIdAndUserId(generationId, userId))
                .thenReturn(Optional.empty());
        when(aiGenerationRepository.existsById(generationId)).thenReturn(false);

        // When/Then
        assertThatThrownBy(() -> aiGenerationService.getGeneration(generationId, userId))
                .isInstanceOf(AIGenerationNotFoundException.class)
                .hasMessageContaining("Generation not found with id: " + generationId);
    }

    @Test
    void shouldThrowForbiddenWhenGenerationBelongsToAnotherUser() {
        // Given
        when(aiGenerationRepository.findByIdAndUserId(generationId, userId))
                .thenReturn(Optional.empty());
        when(aiGenerationRepository.existsById(generationId)).thenReturn(true);

        // When/Then
        assertThatThrownBy(() -> aiGenerationService.getGeneration(generationId, userId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("You don't have access to this generation");
    }

    // ==================== updateCandidates Tests ====================

    @Test
    void shouldUpdateCandidatesSuccessfully() {
        // Given
        UUID candidateId = UUID.randomUUID();
        List<CandidateModel> candidates = List.of(new CandidateModel(candidateId, "Q1", "A1",
                "pending", null, null));

        CandidateUpdateDto update = new CandidateUpdateDto(candidateId, "accepted", null, null);
        UpdateCandidatesRequest request = new UpdateCandidatesRequest(List.of(update));

        when(aiGenerationRepository.findByIdAndUserId(generationId, userId))
                .thenReturn(Optional.of(testGeneration));
        when(mapper.deserializeCandidates(anyString())).thenReturn(candidates);
        when(mapper.serializeCandidates(any())).thenReturn(candidatesJson);
        when(aiGenerationRepository.save(any())).thenReturn(testGeneration);

        // When
        UpdateCandidatesResponse response =
                aiGenerationService.updateCandidates(generationId, request, userId);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.updatedCandidatesCount()).isEqualTo(1);
        verify(aiGenerationRepository).save(any(AIGenerationEntity.class));
    }

    @Test
    void shouldThrowExceptionWhenCandidateIdNotFound() {
        // Given
        UUID candidateId = UUID.randomUUID();
        UUID nonExistentId = UUID.randomUUID();
        List<CandidateModel> candidates = List.of(new CandidateModel(candidateId, "Q1", "A1",
                "pending", null, null));

        CandidateUpdateDto update = new CandidateUpdateDto(nonExistentId, "accepted", null, null);
        UpdateCandidatesRequest request = new UpdateCandidatesRequest(List.of(update));

        when(aiGenerationRepository.findByIdAndUserId(generationId, userId))
                .thenReturn(Optional.of(testGeneration));
        when(mapper.deserializeCandidates(anyString())).thenReturn(candidates);

        // When/Then
        assertThatThrownBy(
                () -> aiGenerationService.updateCandidates(generationId, request, userId))
                .isInstanceOf(InvalidCandidateUpdateException.class)
                .hasMessageContaining("Candidate not found with id: " + nonExistentId);
    }

    @Test
    void shouldThrowExceptionWhenEditedStatusMissingEditedFront() {
        // Given
        UUID candidateId = UUID.randomUUID();
        List<CandidateModel> candidates = List.of(new CandidateModel(candidateId, "Q1", "A1",
                "pending", null, null));

        CandidateUpdateDto update = new CandidateUpdateDto(candidateId, "edited", null, "New back");
        UpdateCandidatesRequest request = new UpdateCandidatesRequest(List.of(update));

        when(aiGenerationRepository.findByIdAndUserId(generationId, userId))
                .thenReturn(Optional.of(testGeneration));
        when(mapper.deserializeCandidates(anyString())).thenReturn(candidates);

        // When/Then
        assertThatThrownBy(
                () -> aiGenerationService.updateCandidates(generationId, request, userId))
                .isInstanceOf(InvalidCandidateUpdateException.class)
                .hasMessageContaining("editedFront is required when status is 'edited'");
    }

    // ==================== saveAcceptedCandidates Tests ====================

    @Test
    void shouldSaveAcceptedCandidatesSuccessfully() {
        // Given
        UUID candidateId1 = UUID.randomUUID();
        UUID candidateId2 = UUID.randomUUID();
        List<CandidateModel> candidates = List.of(
                new CandidateModel(candidateId1, "Q1", "A1", "accepted", null, null),
                new CandidateModel(candidateId2, "Q2", "A2", "rejected", null, null));

        when(aiGenerationRepository.findByIdAndUserId(generationId, userId))
                .thenReturn(Optional.of(testGeneration));
        when(mapper.deserializeCandidates(anyString())).thenReturn(candidates);
        when(flashcardRepository.saveAll(any())).thenReturn(List.of(new FlashcardEntity()));

        // When
        SaveCandidatesResponse response =
                aiGenerationService.saveAcceptedCandidates(generationId, userId);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.savedCount()).isEqualTo(1);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<FlashcardEntity>> captor =
                (ArgumentCaptor<List<FlashcardEntity>>) (ArgumentCaptor<?>) ArgumentCaptor
                        .forClass(List.class);
        verify(flashcardRepository).saveAll(captor.capture());

        List<FlashcardEntity> savedFlashcards = captor.getValue();
        assertThat(savedFlashcards).hasSize(1);
        assertThat(savedFlashcards.get(0).getSource()).isEqualTo(FlashcardSource.AI);
    }

    @Test
    void shouldSaveEditedCandidatesWithEditedText() {
        // Given
        UUID candidateId = UUID.randomUUID();
        List<CandidateModel> candidates =
                List.of(new CandidateModel(candidateId, "Q1", "A1", "edited", "Edited Q", "Edited A"));

        when(aiGenerationRepository.findByIdAndUserId(generationId, userId))
                .thenReturn(Optional.of(testGeneration));
        when(mapper.deserializeCandidates(anyString())).thenReturn(candidates);
        when(flashcardRepository.saveAll(any())).thenReturn(List.of(new FlashcardEntity()));

        // When
        aiGenerationService.saveAcceptedCandidates(generationId, userId);

        // Then
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<FlashcardEntity>> captor =
                (ArgumentCaptor<List<FlashcardEntity>>) (ArgumentCaptor<?>) ArgumentCaptor
                        .forClass(List.class);
        verify(flashcardRepository).saveAll(captor.capture());

        List<FlashcardEntity> savedFlashcards = captor.getValue();
        assertThat(savedFlashcards).hasSize(1);
        assertThat(savedFlashcards.get(0).getFront()).isEqualTo("Edited Q");
        assertThat(savedFlashcards.get(0).getBack()).isEqualTo("Edited A");
        assertThat(savedFlashcards.get(0).getSource()).isEqualTo(FlashcardSource.AI_EDITED);
    }

    @Test
    void shouldThrowExceptionWhenNoAcceptedCandidates() {
        // Given
        UUID candidateId = UUID.randomUUID();
        List<CandidateModel> candidates =
                List.of(new CandidateModel(candidateId, "Q1", "A1", "rejected", null, null));

        when(aiGenerationRepository.findByIdAndUserId(generationId, userId))
                .thenReturn(Optional.of(testGeneration));
        when(mapper.deserializeCandidates(anyString())).thenReturn(candidates);

        // When/Then
        assertThatThrownBy(() -> aiGenerationService.saveAcceptedCandidates(generationId, userId))
                .isInstanceOf(NoAcceptedCandidatesException.class).hasMessageContaining(
                        "No accepted or edited candidates to save. Please accept or edit at least one candidate.");
    }

    @Test
    void shouldThrowExceptionWhenDeckWasDeleted() {
        // Given
        testGeneration.setDeck(null); // Deck was deleted

        UUID candidateId = UUID.randomUUID();
        List<CandidateModel> candidates =
                List.of(new CandidateModel(candidateId, "Q1", "A1", "accepted", null, null));

        when(aiGenerationRepository.findByIdAndUserId(generationId, userId))
                .thenReturn(Optional.of(testGeneration));
        when(mapper.deserializeCandidates(anyString())).thenReturn(candidates);

        // When/Then
        assertThatThrownBy(() -> aiGenerationService.saveAcceptedCandidates(generationId, userId))
                .isInstanceOf(DeckNotFoundException.class).hasMessageContaining(
                        "The deck for this generation has been deleted. Cannot save flashcards.");
    }
}
