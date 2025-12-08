package pl.olesek._xcards.flashcard.mapper;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import pl.olesek._xcards.ai.AIGenerationEntity;
import pl.olesek._xcards.deck.DeckEntity;
import pl.olesek._xcards.flashcard.FlashcardEntity;
import pl.olesek._xcards.flashcard.FlashcardSource;
import pl.olesek._xcards.flashcard.dto.FlashcardResponse;
import pl.olesek._xcards.flashcard.dto.PagedFlashcardResponse;
import pl.olesek._xcards.user.UserEntity;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class FlashcardMapperTest {

    private FlashcardMapper flashcardMapper;
    private FlashcardEntity testFlashcard;
    private DeckEntity testDeck;
    private AIGenerationEntity testGeneration;

    @BeforeEach
    void setUp() {
        flashcardMapper = new FlashcardMapper();

        UserEntity testUser = new UserEntity();
        testUser.setId(UUID.randomUUID());
        testUser.setEmail("test@example.com");

        testDeck = new DeckEntity();
        testDeck.setId(UUID.randomUUID());
        testDeck.setName("Biology 101");
        testDeck.setUser(testUser);

        testGeneration = new AIGenerationEntity();
        testGeneration.setId(UUID.randomUUID());

        testFlashcard = new FlashcardEntity();
        testFlashcard.setId(UUID.randomUUID());
        testFlashcard.setDeck(testDeck);
        testFlashcard.setFront("What is photosynthesis?");
        testFlashcard.setBack("The process by which plants convert light energy into chemical energy");
        testFlashcard.setSource(FlashcardSource.AI);
        testFlashcard.setGeneration(testGeneration);
        testFlashcard.setCreatedAt(Instant.now());
        testFlashcard.setUpdatedAt(Instant.now());
    }

    @Test
    void shouldMapEntityToResponseWithAllFields() {
        FlashcardResponse response = flashcardMapper.toResponse(testFlashcard);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(testFlashcard.getId());
        assertThat(response.deckId()).isEqualTo(testDeck.getId());
        assertThat(response.front()).isEqualTo("What is photosynthesis?");
        assertThat(response.back()).isEqualTo("The process by which plants convert light energy into chemical energy");
        assertThat(response.source()).isEqualTo("ai");
        assertThat(response.generationId()).isEqualTo(testGeneration.getId());
        assertThat(response.createdAt()).isEqualTo(testFlashcard.getCreatedAt());
        assertThat(response.updatedAt()).isEqualTo(testFlashcard.getUpdatedAt());
    }

    @Test
    void shouldMapEntityToResponseWithNullGeneration() {
        testFlashcard.setSource(FlashcardSource.MANUAL);
        testFlashcard.setGeneration(null);

        FlashcardResponse response = flashcardMapper.toResponse(testFlashcard);

        assertThat(response).isNotNull();
        assertThat(response.source()).isEqualTo("manual");
        assertThat(response.generationId()).isNull();
    }

    @Test
    void shouldMapAiEditedSource() {
        testFlashcard.setSource(FlashcardSource.AI_EDITED);

        FlashcardResponse response = flashcardMapper.toResponse(testFlashcard);

        assertThat(response).isNotNull();
        assertThat(response.source()).isEqualTo("ai-edited");
    }

    @Test
    void shouldMapPageToPagedResponse() {
        FlashcardEntity flashcard2 = new FlashcardEntity();
        flashcard2.setId(UUID.randomUUID());
        flashcard2.setDeck(testDeck);
        flashcard2.setFront("What is mitosis?");
        flashcard2.setBack("Cell division process");
        flashcard2.setSource(FlashcardSource.MANUAL);
        flashcard2.setGeneration(null);
        flashcard2.setCreatedAt(Instant.now());
        flashcard2.setUpdatedAt(Instant.now());

        Page<FlashcardEntity> page = new PageImpl<>(
                List.of(testFlashcard, flashcard2),
                PageRequest.of(0, 50),
                2);

        PagedFlashcardResponse response = flashcardMapper.toPagedResponse(page);

        assertThat(response).isNotNull();
        assertThat(response.content()).hasSize(2);
        assertThat(response.page().number()).isEqualTo(0);
        assertThat(response.page().size()).isEqualTo(50);
        assertThat(response.page().totalElements()).isEqualTo(2);
        assertThat(response.page().totalPages()).isEqualTo(1);

        assertThat(response.content().get(0).id()).isEqualTo(testFlashcard.getId());
        assertThat(response.content().get(1).id()).isEqualTo(flashcard2.getId());
    }

    @Test
    void shouldMapEmptyPageToEmptyPagedResponse() {
        Page<FlashcardEntity> emptyPage = Page.empty(PageRequest.of(0, 50));

        PagedFlashcardResponse response = flashcardMapper.toPagedResponse(emptyPage);

        assertThat(response).isNotNull();
        assertThat(response.content()).isEmpty();
        assertThat(response.page().number()).isEqualTo(0);
        assertThat(response.page().totalElements()).isEqualTo(0);
        assertThat(response.page().totalPages()).isEqualTo(0);
    }
}

