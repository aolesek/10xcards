package pl.olesek._xcards.deck.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import pl.olesek._xcards.deck.DeckEntity;
import pl.olesek._xcards.deck.DeckRepository;
import pl.olesek._xcards.deck.dto.CreateDeckRequest;
import pl.olesek._xcards.deck.dto.DeckResponse;
import pl.olesek._xcards.deck.dto.PageInfo;
import pl.olesek._xcards.deck.dto.PagedDeckResponse;
import pl.olesek._xcards.deck.dto.StudyFlashcardDto;
import pl.olesek._xcards.deck.dto.StudySessionResponse;
import pl.olesek._xcards.deck.dto.UpdateDeckRequest;
import pl.olesek._xcards.deck.exception.DeckAlreadyExistsException;
import pl.olesek._xcards.deck.exception.DeckNotFoundException;
import pl.olesek._xcards.deck.mapper.DeckMapper;
import pl.olesek._xcards.flashcard.FlashcardEntity;
import pl.olesek._xcards.flashcard.FlashcardRepository;
import pl.olesek._xcards.flashcard.FlashcardRepository.FlashcardCountProjection;
import pl.olesek._xcards.user.UserRepository;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DeckService {

    private final DeckRepository deckRepository;
    private final FlashcardRepository flashcardRepository;
    private final UserRepository userRepository;
    private final DeckMapper deckMapper;

    @Transactional(readOnly = true)
    public PagedDeckResponse getAllDecks(UUID userId, Pageable pageable) {
        log.debug("Fetching decks for user: {}, page: {}, sort: {}", 
                  userId, pageable.getPageNumber(), pageable.getSort());

        Page<DeckEntity> page = deckRepository.findByUserId(userId, pageable);

        if (page.isEmpty()) {
            log.debug("No decks found for user: {}", userId);
            return createEmptyPagedResponse(page);
        }

        // Log deck order for debugging
        if (log.isDebugEnabled()) {
            page.getContent().forEach(deck -> 
                log.debug("Deck: id={}, name={}, createdAt={}", 
                          deck.getId(), deck.getName(), deck.getCreatedAt()));
        }

        // Prevent N+1: fetch flashcard counts for all decks in a single query
        List<UUID> deckIds =
                page.getContent().stream().map(DeckEntity::getId).toList();

        List<FlashcardCountProjection> flashcardCounts =
                flashcardRepository.countByDeckIdIn(deckIds);

        log.debug("Found {} decks for user: {}", page.getTotalElements(), userId);
        return deckMapper.toPagedResponse(page, flashcardCounts);
    }

    @Transactional(readOnly = true)
    public DeckResponse getDeckById(UUID deckId, UUID userId) {
        log.debug("Fetching deck: {} for user: {}", deckId, userId);

        DeckEntity deck = deckRepository.findByIdAndUserId(deckId, userId)
                .orElseThrow(() -> new DeckNotFoundException(
                        "Deck not found with id: " + deckId));

        int flashcardCount = (int) flashcardRepository.countByDeckId(deckId);

        log.debug("Deck found: {}, flashcardCount: {}", deckId, flashcardCount);
        return deckMapper.toResponse(deck, flashcardCount);
    }

    @Transactional
    public DeckResponse createDeck(CreateDeckRequest request, UUID userId) {
        String trimmedName = request.name().trim();

        log.debug("Creating deck for user: {}, name: {}", userId, trimmedName);

        if (trimmedName.isEmpty()) {
            throw new IllegalArgumentException("Deck name cannot be empty after trimming");
        }

        if (deckRepository.existsByUserIdAndName(userId, trimmedName)) {
            throw new DeckAlreadyExistsException(
                    "Deck with name '" + trimmedName + "' already exists");
        }

        DeckEntity deck = new DeckEntity();
        deck.setUser(userRepository.getReferenceById(userId));
        deck.setName(trimmedName);

        DeckEntity savedDeck = deckRepository.save(deck);

        log.info("Deck created successfully: deckId={}, userId={}", savedDeck.getId(),
                userId);
        return deckMapper.toResponse(savedDeck, 0);
    }

    @Transactional
    public DeckResponse updateDeck(UUID deckId, UpdateDeckRequest request, UUID userId) {
        log.debug("Updating deck: {} for user: {}", deckId, userId);

        DeckEntity deck = deckRepository.findByIdAndUserId(deckId, userId)
                .orElseThrow(() -> new DeckNotFoundException(
                        "Deck not found with id: " + deckId));

        String trimmedName = request.name().trim();

        if (trimmedName.isEmpty()) {
            throw new IllegalArgumentException("Deck name cannot be empty after trimming");
        }

        if (!deck.getName().equals(trimmedName)) {
            if (deckRepository.existsByUserIdAndNameAndIdNot(userId, trimmedName, deckId)) {
                throw new DeckAlreadyExistsException(
                        "Deck with name '" + trimmedName + "' already exists");
            }
            deck.setName(trimmedName);
        }

        DeckEntity updatedDeck = deckRepository.save(deck);
        int flashcardCount = (int) flashcardRepository.countByDeckId(deckId);

        log.info("Deck updated successfully: deckId={}, userId={}", deckId, userId);
        return deckMapper.toResponse(updatedDeck, flashcardCount);
    }

    @Transactional
    public void deleteDeck(UUID deckId, UUID userId) {
        log.debug("Deleting deck: {} for user: {}", deckId, userId);

        DeckEntity deck = deckRepository.findByIdAndUserId(deckId, userId)
                .orElseThrow(() -> new DeckNotFoundException(
                        "Deck not found with id: " + deckId));

        deckRepository.delete(deck);

        log.info("Deck deleted successfully: deckId={}, userId={}", deckId, userId);
    }

    @Transactional(readOnly = true)
    public StudySessionResponse getStudySession(UUID deckId, boolean shuffle, UUID userId) {
        log.debug("Getting study session: deckId={}, userId={}, shuffle={}", deckId, userId, shuffle);

        // Authorization check - single query for both existence and ownership verification
        DeckEntity deck = deckRepository.findByIdAndUserId(deckId, userId)
                .orElseThrow(() -> new DeckNotFoundException("Deck not found with id: " + deckId));

        // Fetch flashcards with appropriate ordering
        List<FlashcardEntity> flashcards = shuffle
                ? flashcardRepository.findByDeckIdInRandomOrder(deckId)
                : flashcardRepository.findByDeckIdOrderByCreatedAtDesc(deckId);

        log.debug("Study session loaded: deckId={}, cardCount={}", deckId, flashcards.size());

        // Monitor large datasets
        if (flashcards.size() > 1000) {
            log.warn("Large study session: deckId={}, cardCount={}", deckId, flashcards.size());
        }

        // Map to simplified DTOs
        List<StudyFlashcardDto> flashcardDtos = flashcards.stream()
                .map(f -> new StudyFlashcardDto(f.getId(), f.getFront(), f.getBack()))
                .toList();

        return new StudySessionResponse(
                deck.getId(),
                deck.getName(),
                flashcardDtos.size(),
                flashcardDtos);
    }

    private PagedDeckResponse createEmptyPagedResponse(Page<DeckEntity> page) {
        PageInfo pageInfo = new PageInfo(page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
        return new PagedDeckResponse(List.of(), pageInfo);
    }
}

