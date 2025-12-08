package pl.olesek._xcards.deck.service;

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
import pl.olesek._xcards.deck.dto.CreateDeckRequest;
import pl.olesek._xcards.deck.dto.DeckResponse;
import pl.olesek._xcards.deck.dto.PagedDeckResponse;
import pl.olesek._xcards.deck.dto.UpdateDeckRequest;
import pl.olesek._xcards.deck.exception.DeckAlreadyExistsException;
import pl.olesek._xcards.deck.exception.DeckNotFoundException;
import pl.olesek._xcards.deck.mapper.DeckMapper;
import pl.olesek._xcards.flashcard.FlashcardRepository;
import pl.olesek._xcards.user.UserEntity;
import pl.olesek._xcards.user.UserRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DeckServiceTest {

    @Mock
    private DeckRepository deckRepository;

    @Mock
    private FlashcardRepository flashcardRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private DeckMapper deckMapper;

    @InjectMocks
    private DeckService deckService;

    private UUID userId;
    private UUID deckId;
    private DeckEntity testDeck;
    private UserEntity testUser;
    private DeckResponse testDeckResponse;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        deckId = UUID.randomUUID();

        testUser = new UserEntity();
        testUser.setId(userId);
        testUser.setEmail("test@example.com");

        testDeck = new DeckEntity();
        testDeck.setId(deckId);
        testDeck.setName("Biology 101");
        testDeck.setUser(testUser);
        testDeck.setCreatedAt(Instant.now());
        testDeck.setUpdatedAt(Instant.now());

        testDeckResponse = new DeckResponse(deckId, "Biology 101", 45,
                testDeck.getCreatedAt(), testDeck.getUpdatedAt());
    }

    @Test
    void shouldGetAllDecksWithPagination() {
        Pageable pageable = PageRequest.of(0, 20);
        Page<DeckEntity> page = new PageImpl<>(List.of(testDeck));
        PagedDeckResponse expectedResponse =
                new PagedDeckResponse(List.of(testDeckResponse), null);

        when(deckRepository.findByUserId(userId, pageable)).thenReturn(page);
        when(flashcardRepository.countByDeckIdIn(anyList())).thenReturn(List.of());
        when(deckMapper.toPagedResponse(eq(page), anyList())).thenReturn(expectedResponse);

        PagedDeckResponse response = deckService.getAllDecks(userId, pageable);

        assertThat(response).isNotNull();
        assertThat(response.content()).hasSize(1);
        verify(deckRepository).findByUserId(userId, pageable);
        verify(flashcardRepository).countByDeckIdIn(List.of(deckId));
    }

    @Test
    void shouldReturnEmptyPagedResponseWhenNoDecks() {
        Pageable pageable = PageRequest.of(0, 20);
        Page<DeckEntity> emptyPage = Page.empty();

        when(deckRepository.findByUserId(userId, pageable)).thenReturn(emptyPage);

        PagedDeckResponse response = deckService.getAllDecks(userId, pageable);

        assertThat(response).isNotNull();
        assertThat(response.content()).isEmpty();
        verify(deckRepository).findByUserId(userId, pageable);
    }

    @Test
    void shouldGetDeckByIdSuccessfully() {
        when(deckRepository.findByIdAndUserId(deckId, userId))
                .thenReturn(Optional.of(testDeck));
        when(flashcardRepository.countByDeckId(deckId)).thenReturn(45L);
        when(deckMapper.toResponse(testDeck, 45)).thenReturn(testDeckResponse);

        DeckResponse response = deckService.getDeckById(deckId, userId);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(deckId);
        assertThat(response.name()).isEqualTo("Biology 101");
        assertThat(response.flashcardCount()).isEqualTo(45);
        verify(deckRepository).findByIdAndUserId(deckId, userId);
    }

    @Test
    void shouldThrowExceptionWhenDeckNotFoundById() {
        when(deckRepository.findByIdAndUserId(deckId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> deckService.getDeckById(deckId, userId))
                .isInstanceOf(DeckNotFoundException.class)
                .hasMessageContaining("Deck not found with id: " + deckId);
    }

    @Test
    void shouldCreateDeckSuccessfully() {
        CreateDeckRequest request = new CreateDeckRequest("Biology 101");

        when(deckRepository.existsByUserIdAndName(userId, "Biology 101")).thenReturn(false);
        when(userRepository.getReferenceById(userId)).thenReturn(testUser);
        when(deckRepository.save(any(DeckEntity.class))).thenReturn(testDeck);
        when(deckMapper.toResponse(testDeck, 0)).thenReturn(testDeckResponse);

        DeckResponse response = deckService.createDeck(request, userId);

        assertThat(response).isNotNull();
        assertThat(response.name()).isEqualTo("Biology 101");
        verify(deckRepository).existsByUserIdAndName(userId, "Biology 101");
        verify(deckRepository).save(any(DeckEntity.class));
    }

    @Test
    void shouldTrimDeckNameWhenCreating() {
        CreateDeckRequest request = new CreateDeckRequest("  Biology 101  ");

        when(deckRepository.existsByUserIdAndName(userId, "Biology 101")).thenReturn(false);
        when(userRepository.getReferenceById(userId)).thenReturn(testUser);
        when(deckRepository.save(any(DeckEntity.class))).thenReturn(testDeck);
        when(deckMapper.toResponse(testDeck, 0)).thenReturn(testDeckResponse);

        DeckResponse response = deckService.createDeck(request, userId);

        assertThat(response).isNotNull();
        verify(deckRepository).existsByUserIdAndName(userId, "Biology 101");
    }

    @Test
    void shouldThrowExceptionWhenDeckNameEmptyAfterTrimming() {
        CreateDeckRequest request = new CreateDeckRequest("   ");

        assertThatThrownBy(() -> deckService.createDeck(request, userId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Deck name cannot be empty after trimming");
    }

    @Test
    void shouldThrowExceptionWhenDeckAlreadyExists() {
        CreateDeckRequest request = new CreateDeckRequest("Biology 101");

        when(deckRepository.existsByUserIdAndName(userId, "Biology 101")).thenReturn(true);

        assertThatThrownBy(() -> deckService.createDeck(request, userId))
                .isInstanceOf(DeckAlreadyExistsException.class)
                .hasMessageContaining("Deck with name 'Biology 101' already exists");
    }

    @Test
    void shouldUpdateDeckSuccessfully() {
        UpdateDeckRequest request = new UpdateDeckRequest("Advanced Biology");
        DeckEntity updatedDeck = new DeckEntity();
        updatedDeck.setId(deckId);
        updatedDeck.setName("Advanced Biology");
        updatedDeck.setUser(testUser);
        updatedDeck.setCreatedAt(testDeck.getCreatedAt());
        updatedDeck.setUpdatedAt(Instant.now());

        DeckResponse updatedResponse = new DeckResponse(deckId, "Advanced Biology", 45,
                updatedDeck.getCreatedAt(), updatedDeck.getUpdatedAt());

        when(deckRepository.findByIdAndUserId(deckId, userId))
                .thenReturn(Optional.of(testDeck));
        when(deckRepository.existsByUserIdAndNameAndIdNot(userId, "Advanced Biology", deckId))
                .thenReturn(false);
        when(deckRepository.save(testDeck)).thenReturn(updatedDeck);
        when(flashcardRepository.countByDeckId(deckId)).thenReturn(45L);
        when(deckMapper.toResponse(updatedDeck, 45)).thenReturn(updatedResponse);

        DeckResponse response = deckService.updateDeck(deckId, request, userId);

        assertThat(response).isNotNull();
        assertThat(response.name()).isEqualTo("Advanced Biology");
        verify(deckRepository).save(testDeck);
    }

    @Test
    void shouldNotCheckUniquenessWhenNameNotChanging() {
        UpdateDeckRequest request = new UpdateDeckRequest("Biology 101");

        when(deckRepository.findByIdAndUserId(deckId, userId))
                .thenReturn(Optional.of(testDeck));
        when(deckRepository.save(testDeck)).thenReturn(testDeck);
        when(flashcardRepository.countByDeckId(deckId)).thenReturn(45L);
        when(deckMapper.toResponse(testDeck, 45)).thenReturn(testDeckResponse);

        DeckResponse response = deckService.updateDeck(deckId, request, userId);

        assertThat(response).isNotNull();
        verify(deckRepository).save(testDeck);
    }

    @Test
    void shouldThrowExceptionWhenUpdatingNonExistentDeck() {
        UpdateDeckRequest request = new UpdateDeckRequest("Advanced Biology");

        when(deckRepository.findByIdAndUserId(deckId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> deckService.updateDeck(deckId, request, userId))
                .isInstanceOf(DeckNotFoundException.class)
                .hasMessageContaining("Deck not found with id: " + deckId);
    }

    @Test
    void shouldThrowExceptionWhenUpdatingToExistingName() {
        UpdateDeckRequest request = new UpdateDeckRequest("Chemistry 101");

        when(deckRepository.findByIdAndUserId(deckId, userId))
                .thenReturn(Optional.of(testDeck));
        when(deckRepository.existsByUserIdAndNameAndIdNot(userId, "Chemistry 101", deckId))
                .thenReturn(true);

        assertThatThrownBy(() -> deckService.updateDeck(deckId, request, userId))
                .isInstanceOf(DeckAlreadyExistsException.class)
                .hasMessageContaining("Deck with name 'Chemistry 101' already exists");
    }

    @Test
    void shouldThrowExceptionWhenUpdateNameEmptyAfterTrimming() {
        UpdateDeckRequest request = new UpdateDeckRequest("   ");

        when(deckRepository.findByIdAndUserId(deckId, userId))
                .thenReturn(Optional.of(testDeck));

        assertThatThrownBy(() -> deckService.updateDeck(deckId, request, userId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Deck name cannot be empty after trimming");
    }

    @Test
    void shouldDeleteDeckSuccessfully() {
        when(deckRepository.findByIdAndUserId(deckId, userId))
                .thenReturn(Optional.of(testDeck));

        deckService.deleteDeck(deckId, userId);

        verify(deckRepository).delete(testDeck);
    }

    @Test
    void shouldThrowExceptionWhenDeletingNonExistentDeck() {
        when(deckRepository.findByIdAndUserId(deckId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> deckService.deleteDeck(deckId, userId))
                .isInstanceOf(DeckNotFoundException.class)
                .hasMessageContaining("Deck not found with id: " + deckId);
    }
}

