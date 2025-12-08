package pl.olesek._xcards.flashcard.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FlashcardService {

    private final FlashcardRepository flashcardRepository;
    private final DeckRepository deckRepository;
    private final FlashcardMapper flashcardMapper;

    @Transactional(readOnly = true)
    public PagedFlashcardResponse getFlashcardsByDeck(UUID deckId, UUID userId, Pageable pageable,
            FlashcardSource source) {
        log.debug("Fetching flashcards for deck: {}, user: {}, source: {}, page: {}",
                deckId, userId, source, pageable.getPageNumber());

        deckRepository.findByIdAndUserId(deckId, userId)
                .orElseThrow(() -> new DeckNotFoundException("Deck not found with id: " + deckId));

        Page<FlashcardEntity> page;
        if (source != null) {
            page = flashcardRepository.findByDeckIdAndSource(deckId, source, pageable);
            log.debug("Found {} flashcards with source {} in deck: {}",
                    page.getTotalElements(), source.getDatabaseValue(), deckId);
        } else {
            page = flashcardRepository.findByDeckId(deckId, pageable);
            log.debug("Found {} flashcards in deck: {}", page.getTotalElements(), deckId);
        }

        return flashcardMapper.toPagedResponse(page);
    }

    @Transactional(readOnly = true)
    public FlashcardResponse getFlashcardById(UUID flashcardId, UUID userId) {
        log.debug("Fetching flashcard: {} for user: {}", flashcardId, userId);

        FlashcardEntity flashcard = flashcardRepository.findByIdAndDeckUserId(flashcardId, userId)
                .orElseThrow(() -> new FlashcardNotFoundException(flashcardId));

        log.debug("Flashcard found: {}, deckId: {}", flashcardId, flashcard.getDeck().getId());
        return flashcardMapper.toResponse(flashcard);
    }

    @Transactional
    public FlashcardResponse createFlashcard(UUID deckId, CreateFlashcardRequest request, UUID userId) {
        log.debug("Creating flashcard for deck: {}, user: {}", deckId, userId);

        deckRepository.findByIdAndUserId(deckId, userId)
                .orElseThrow(() -> new DeckNotFoundException("Deck not found with id: " + deckId));

        String trimmedFront = request.front().trim();
        String trimmedBack = request.back().trim();

        if (trimmedFront.isEmpty()) {
            throw new IllegalArgumentException("Front cannot be empty after trimming");
        }
        if (trimmedBack.isEmpty()) {
            throw new IllegalArgumentException("Back cannot be empty after trimming");
        }

        FlashcardEntity flashcard = new FlashcardEntity();
        flashcard.setDeck(deckRepository.getReferenceById(deckId));
        flashcard.setFront(trimmedFront);
        flashcard.setBack(trimmedBack);
        flashcard.setSource(FlashcardSource.MANUAL);
        flashcard.setGeneration(null);

        FlashcardEntity savedFlashcard = flashcardRepository.save(flashcard);

        log.info("Flashcard created successfully: flashcardId={}, deckId={}, userId={}",
                savedFlashcard.getId(), deckId, userId);
        return flashcardMapper.toResponse(savedFlashcard);
    }

    @Transactional
    public FlashcardResponse updateFlashcard(UUID flashcardId, UpdateFlashcardRequest request, UUID userId) {
        log.debug("Updating flashcard: {} for user: {}", flashcardId, userId);

        FlashcardEntity flashcard = flashcardRepository.findByIdAndDeckUserId(flashcardId, userId)
                .orElseThrow(() -> new FlashcardNotFoundException(flashcardId));

        String trimmedFront = request.front().trim();
        String trimmedBack = request.back().trim();

        if (trimmedFront.isEmpty()) {
            throw new IllegalArgumentException("Front cannot be empty after trimming");
        }
        if (trimmedBack.isEmpty()) {
            throw new IllegalArgumentException("Back cannot be empty after trimming");
        }

        flashcard.setFront(trimmedFront);
        flashcard.setBack(trimmedBack);

        // Automatic source change: ai -> ai-edited
        if (flashcard.getSource() == FlashcardSource.AI) {
            flashcard.setSource(FlashcardSource.AI_EDITED);
            log.debug("Flashcard source changed from 'ai' to 'ai-edited' for flashcardId: {}", flashcardId);
        }

        FlashcardEntity updatedFlashcard = flashcardRepository.save(flashcard);

        log.info("Flashcard updated successfully: flashcardId={}, userId={}, source={}",
                flashcardId, userId, updatedFlashcard.getSource().getDatabaseValue());
        return flashcardMapper.toResponse(updatedFlashcard);
    }

    @Transactional
    public void deleteFlashcard(UUID flashcardId, UUID userId) {
        log.debug("Deleting flashcard: {} for user: {}", flashcardId, userId);

        FlashcardEntity flashcard =
                flashcardRepository.findByIdAndDeckUserId(flashcardId, userId)
                        .orElseThrow(() -> new FlashcardNotFoundException(flashcardId));

        flashcardRepository.delete(flashcard);

        log.info("Flashcard deleted successfully: flashcardId={}, userId={}", flashcardId,
                userId);
    }
}

