package pl.olesek._xcards.flashcard.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import pl.olesek._xcards.deck.DeckEntity;
import pl.olesek._xcards.deck.DeckRepository;
import pl.olesek._xcards.deck.exception.DeckNotFoundException;
import pl.olesek._xcards.flashcard.FlashcardEntity;
import pl.olesek._xcards.flashcard.FlashcardRepository;
import pl.olesek._xcards.flashcard.FlashcardSource;
import pl.olesek._xcards.flashcard.dto.CreateFlashcardRequest;
import pl.olesek._xcards.flashcard.dto.FlashcardResponse;
import pl.olesek._xcards.flashcard.dto.PagedFlashcardResponse;
import pl.olesek._xcards.flashcard.dto.UpdateFlashcardRequest;
import pl.olesek._xcards.flashcard.exception.FlashcardNotFoundException;
import pl.olesek._xcards.flashcard.mapper.FlashcardMapper;
import pl.olesek._xcards.user.UserEntity;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FlashcardServiceTest {

    @Mock
    private FlashcardRepository flashcardRepository;

    @Mock
    private DeckRepository deckRepository;

    @Mock
    private FlashcardMapper flashcardMapper;

    @InjectMocks
    private FlashcardService flashcardService;

    private UUID userId;
    private UUID deckId;
    private UUID flashcardId;
    private DeckEntity testDeck;
    private FlashcardEntity testFlashcard;
    private FlashcardResponse testFlashcardResponse;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        deckId = UUID.randomUUID();
        flashcardId = UUID.randomUUID();

        UserEntity testUser = new UserEntity();
        testUser.setId(userId);
        testUser.setEmail("test@example.com");

        testDeck = new DeckEntity();
        testDeck.setId(deckId);
        testDeck.setName("Biology 101");
        testDeck.setUser(testUser);
        testDeck.setCreatedAt(Instant.now());
        testDeck.setUpdatedAt(Instant.now());

        testFlashcard = new FlashcardEntity();
        testFlashcard.setId(flashcardId);
        testFlashcard.setDeck(testDeck);
        testFlashcard.setFront("What is photosynthesis?");
        testFlashcard.setBack("The process by which plants convert light energy into chemical energy");
        testFlashcard.setSource(FlashcardSource.AI);
        testFlashcard.setGeneration(null);
        testFlashcard.setCreatedAt(Instant.now());
        testFlashcard.setUpdatedAt(Instant.now());

        testFlashcardResponse = new FlashcardResponse(
                flashcardId,
                deckId,
                "What is photosynthesis?",
                "The process by which plants convert light energy into chemical energy",
                "ai",
                null,
                testFlashcard.getCreatedAt(),
                testFlashcard.getUpdatedAt());
    }

    @Test
    void shouldGetFlashcardsByDeckWithoutSourceFilter() {
        Pageable pageable = PageRequest.of(0, 50);
        Page<FlashcardEntity> page = new PageImpl<>(List.of(testFlashcard));
        PagedFlashcardResponse expectedResponse = new PagedFlashcardResponse(List.of(testFlashcardResponse), null);

        when(deckRepository.findByIdAndUserId(deckId, userId)).thenReturn(Optional.of(testDeck));
        when(flashcardRepository.findByDeckId(deckId, pageable)).thenReturn(page);
        when(flashcardMapper.toPagedResponse(page)).thenReturn(expectedResponse);

        PagedFlashcardResponse response = flashcardService.getFlashcardsByDeck(deckId, userId, pageable, null);

        assertThat(response).isNotNull();
        assertThat(response.content()).hasSize(1);
        verify(deckRepository).findByIdAndUserId(deckId, userId);
        verify(flashcardRepository).findByDeckId(deckId, pageable);
    }

    @Test
    void shouldGetFlashcardsByDeckWithSourceFilter() {
        Pageable pageable = PageRequest.of(0, 50);
        Page<FlashcardEntity> page = new PageImpl<>(List.of(testFlashcard));
        PagedFlashcardResponse expectedResponse = new PagedFlashcardResponse(List.of(testFlashcardResponse), null);

        when(deckRepository.findByIdAndUserId(deckId, userId)).thenReturn(Optional.of(testDeck));
        when(flashcardRepository.findByDeckIdAndSource(deckId, FlashcardSource.AI, pageable)).thenReturn(page);
        when(flashcardMapper.toPagedResponse(page)).thenReturn(expectedResponse);

        PagedFlashcardResponse response =
                flashcardService.getFlashcardsByDeck(deckId, userId, pageable, FlashcardSource.AI);

        assertThat(response).isNotNull();
        assertThat(response.content()).hasSize(1);
        verify(deckRepository).findByIdAndUserId(deckId, userId);
        verify(flashcardRepository).findByDeckIdAndSource(deckId, FlashcardSource.AI, pageable);
    }

    @Test
    void shouldThrowExceptionWhenDeckNotFoundInGetFlashcards() {
        Pageable pageable = PageRequest.of(0, 50);

        when(deckRepository.findByIdAndUserId(deckId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> flashcardService.getFlashcardsByDeck(deckId, userId, pageable, null))
                .isInstanceOf(DeckNotFoundException.class)
                .hasMessageContaining("Deck not found with id: " + deckId);
    }

    @Test
    void shouldGetFlashcardByIdSuccessfully() {
        when(flashcardRepository.findByIdAndDeckUserId(flashcardId, userId))
                .thenReturn(Optional.of(testFlashcard));
        when(flashcardMapper.toResponse(testFlashcard)).thenReturn(testFlashcardResponse);

        FlashcardResponse response = flashcardService.getFlashcardById(flashcardId, userId);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(flashcardId);
        assertThat(response.front()).isEqualTo("What is photosynthesis?");
        verify(flashcardRepository).findByIdAndDeckUserId(flashcardId, userId);
    }

    @Test
    void shouldThrowExceptionWhenFlashcardNotFoundById() {
        when(flashcardRepository.findByIdAndDeckUserId(flashcardId, userId))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> flashcardService.getFlashcardById(flashcardId, userId))
                .isInstanceOf(FlashcardNotFoundException.class)
                .hasMessageContaining("Flashcard not found with id: " + flashcardId);
    }

    @Test
    void shouldCreateFlashcardSuccessfully() {
        CreateFlashcardRequest request = new CreateFlashcardRequest(
                "What is mitosis?",
                "Cell division process");

        when(deckRepository.findByIdAndUserId(deckId, userId)).thenReturn(Optional.of(testDeck));
        when(deckRepository.getReferenceById(deckId)).thenReturn(testDeck);
        when(flashcardRepository.save(any(FlashcardEntity.class))).thenReturn(testFlashcard);
        when(flashcardMapper.toResponse(testFlashcard)).thenReturn(testFlashcardResponse);

        FlashcardResponse response = flashcardService.createFlashcard(deckId, request, userId);

        assertThat(response).isNotNull();
        verify(deckRepository).findByIdAndUserId(deckId, userId);
        verify(flashcardRepository).save(any(FlashcardEntity.class));
    }

    @Test
    void shouldTrimFlashcardContentWhenCreating() {
        CreateFlashcardRequest request = new CreateFlashcardRequest(
                "  What is mitosis?  ",
                "  Cell division process  ");

        when(deckRepository.findByIdAndUserId(deckId, userId)).thenReturn(Optional.of(testDeck));
        when(deckRepository.getReferenceById(deckId)).thenReturn(testDeck);
        when(flashcardRepository.save(any(FlashcardEntity.class))).thenReturn(testFlashcard);
        when(flashcardMapper.toResponse(testFlashcard)).thenReturn(testFlashcardResponse);

        FlashcardResponse response = flashcardService.createFlashcard(deckId, request, userId);

        assertThat(response).isNotNull();
        verify(flashcardRepository).save(any(FlashcardEntity.class));
    }

    @Test
    void shouldThrowExceptionWhenFrontEmptyAfterTrimming() {
        CreateFlashcardRequest request = new CreateFlashcardRequest("   ", "Back content");

        when(deckRepository.findByIdAndUserId(deckId, userId)).thenReturn(Optional.of(testDeck));

        assertThatThrownBy(() -> flashcardService.createFlashcard(deckId, request, userId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Front cannot be empty after trimming");
    }

    @Test
    void shouldThrowExceptionWhenBackEmptyAfterTrimming() {
        CreateFlashcardRequest request = new CreateFlashcardRequest("Front content", "   ");

        when(deckRepository.findByIdAndUserId(deckId, userId)).thenReturn(Optional.of(testDeck));

        assertThatThrownBy(() -> flashcardService.createFlashcard(deckId, request, userId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Back cannot be empty after trimming");
    }

    @Test
    void shouldThrowExceptionWhenDeckNotFoundInCreate() {
        CreateFlashcardRequest request = new CreateFlashcardRequest("Front", "Back");

        when(deckRepository.findByIdAndUserId(deckId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> flashcardService.createFlashcard(deckId, request, userId))
                .isInstanceOf(DeckNotFoundException.class)
                .hasMessageContaining("Deck not found with id: " + deckId);
    }

    @Test
    void shouldUpdateFlashcardSuccessfully() {
        UpdateFlashcardRequest request = new UpdateFlashcardRequest(
                "What is mitosis? (Updated)",
                "Cell division process that produces two identical cells");

        when(flashcardRepository.findByIdAndDeckUserId(flashcardId, userId))
                .thenReturn(Optional.of(testFlashcard));
        when(flashcardRepository.save(testFlashcard)).thenReturn(testFlashcard);
        when(flashcardMapper.toResponse(testFlashcard)).thenReturn(testFlashcardResponse);

        FlashcardResponse response = flashcardService.updateFlashcard(flashcardId, request, userId);

        assertThat(response).isNotNull();
        verify(flashcardRepository).save(testFlashcard);
    }

    @Test
    void shouldChangeSourceFromAiToAiEditedWhenUpdating() {
        testFlashcard.setSource(FlashcardSource.AI);
        UpdateFlashcardRequest request = new UpdateFlashcardRequest("Updated front", "Updated back");

        when(flashcardRepository.findByIdAndDeckUserId(flashcardId, userId))
                .thenReturn(Optional.of(testFlashcard));
        when(flashcardRepository.save(testFlashcard)).thenReturn(testFlashcard);
        when(flashcardMapper.toResponse(testFlashcard)).thenReturn(testFlashcardResponse);

        flashcardService.updateFlashcard(flashcardId, request, userId);

        assertThat(testFlashcard.getSource()).isEqualTo(FlashcardSource.AI_EDITED);
        verify(flashcardRepository).save(testFlashcard);
    }

    @Test
    void shouldKeepManualSourceWhenUpdating() {
        testFlashcard.setSource(FlashcardSource.MANUAL);
        UpdateFlashcardRequest request = new UpdateFlashcardRequest("Updated front", "Updated back");

        when(flashcardRepository.findByIdAndDeckUserId(flashcardId, userId))
                .thenReturn(Optional.of(testFlashcard));
        when(flashcardRepository.save(testFlashcard)).thenReturn(testFlashcard);
        when(flashcardMapper.toResponse(testFlashcard)).thenReturn(testFlashcardResponse);

        flashcardService.updateFlashcard(flashcardId, request, userId);

        assertThat(testFlashcard.getSource()).isEqualTo(FlashcardSource.MANUAL);
        verify(flashcardRepository).save(testFlashcard);
    }

    @Test
    void shouldKeepAiEditedSourceWhenUpdating() {
        testFlashcard.setSource(FlashcardSource.AI_EDITED);
        UpdateFlashcardRequest request = new UpdateFlashcardRequest("Updated front", "Updated back");

        when(flashcardRepository.findByIdAndDeckUserId(flashcardId, userId))
                .thenReturn(Optional.of(testFlashcard));
        when(flashcardRepository.save(testFlashcard)).thenReturn(testFlashcard);
        when(flashcardMapper.toResponse(testFlashcard)).thenReturn(testFlashcardResponse);

        flashcardService.updateFlashcard(flashcardId, request, userId);

        assertThat(testFlashcard.getSource()).isEqualTo(FlashcardSource.AI_EDITED);
        verify(flashcardRepository).save(testFlashcard);
    }

    @Test
    void shouldThrowExceptionWhenFlashcardNotFoundInUpdate() {
        UpdateFlashcardRequest request = new UpdateFlashcardRequest("Front", "Back");

        when(flashcardRepository.findByIdAndDeckUserId(flashcardId, userId))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> flashcardService.updateFlashcard(flashcardId, request, userId))
                .isInstanceOf(FlashcardNotFoundException.class)
                .hasMessageContaining("Flashcard not found with id: " + flashcardId);
    }

    @Test
    void shouldThrowExceptionWhenUpdateFrontEmptyAfterTrimming() {
        UpdateFlashcardRequest request = new UpdateFlashcardRequest("   ", "Back content");

        when(flashcardRepository.findByIdAndDeckUserId(flashcardId, userId))
                .thenReturn(Optional.of(testFlashcard));

        assertThatThrownBy(() -> flashcardService.updateFlashcard(flashcardId, request, userId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Front cannot be empty after trimming");
    }

    @Test
    void shouldThrowExceptionWhenUpdateBackEmptyAfterTrimming() {
        UpdateFlashcardRequest request = new UpdateFlashcardRequest("Front content", "   ");

        when(flashcardRepository.findByIdAndDeckUserId(flashcardId, userId))
                .thenReturn(Optional.of(testFlashcard));

        assertThatThrownBy(() -> flashcardService.updateFlashcard(flashcardId, request, userId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Back cannot be empty after trimming");
    }

    @Test
    void shouldDeleteFlashcardSuccessfully() {
        when(flashcardRepository.findByIdAndDeckUserId(flashcardId, userId))
                .thenReturn(Optional.of(testFlashcard));

        flashcardService.deleteFlashcard(flashcardId, userId);

        verify(flashcardRepository).delete(testFlashcard);
    }

    @Test
    void shouldThrowExceptionWhenFlashcardNotFoundInDelete() {
        when(flashcardRepository.findByIdAndDeckUserId(flashcardId, userId))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> flashcardService.deleteFlashcard(flashcardId, userId))
                .isInstanceOf(FlashcardNotFoundException.class)
                .hasMessageContaining("Flashcard not found with id: " + flashcardId);
    }
}

