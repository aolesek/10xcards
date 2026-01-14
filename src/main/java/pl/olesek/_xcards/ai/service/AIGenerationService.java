package pl.olesek._xcards.ai.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import pl.olesek._xcards.ai.AIGenerationEntity;
import pl.olesek._xcards.ai.AIGenerationRepository;
import pl.olesek._xcards.ai.dto.request.GenerateFlashcardsRequest;
import pl.olesek._xcards.ai.dto.request.UpdateCandidatesRequest;
import pl.olesek._xcards.ai.dto.response.AIGenerationResponse;
import pl.olesek._xcards.ai.dto.response.PagedAIGenerationResponse;
import pl.olesek._xcards.ai.dto.response.SaveCandidatesResponse;
import pl.olesek._xcards.ai.dto.response.UpdateCandidatesResponse;
import pl.olesek._xcards.ai.exception.AIGenerationNotFoundException;
import pl.olesek._xcards.ai.exception.ForbiddenException;
import pl.olesek._xcards.ai.exception.InvalidCandidateUpdateException;
import pl.olesek._xcards.ai.exception.MonthlyAILimitExceededException;
import pl.olesek._xcards.ai.exception.NoAcceptedCandidatesException;
import pl.olesek._xcards.ai.mapper.AIGenerationMapper;
import pl.olesek._xcards.ai.model.CandidateModel;
import pl.olesek._xcards.auth.exception.RateLimitExceededException;
import pl.olesek._xcards.deck.DeckEntity;
import pl.olesek._xcards.deck.DeckRepository;
import pl.olesek._xcards.deck.exception.DeckNotFoundException;
import pl.olesek._xcards.flashcard.FlashcardEntity;
import pl.olesek._xcards.flashcard.FlashcardRepository;
import pl.olesek._xcards.flashcard.FlashcardSource;
import pl.olesek._xcards.ratelimit.service.RateLimitService;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for managing AI-powered flashcard generation. Handles generation, retrieval, updates, and
 * saving of flashcard candidates.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AIGenerationService {

    private final AIGenerationRepository aiGenerationRepository;
    private final DeckRepository deckRepository;
    private final FlashcardRepository flashcardRepository;
    private final AIClientService aiClientService;
    private final AIGenerationMapper mapper;
    private final RateLimitService rateLimitService;

    @Value("${app.ai.monthly-generation-limit}")
    private int monthlyLimit;

    @Value("${app.ai.rate-limit-per-minute}")
    private int rateLimitPerMinute;

    @Value("${app.ai.openrouter.model}")
    private String aiModel;

    /**
     * Generates flashcard candidates from source text using AI.
     * 
     * @param request the generation request containing deckId and sourceText
     * @param userId the authenticated user ID
     * @return response containing generation session with candidates
     * @throws DeckNotFoundException if deck not found
     * @throws ForbiddenException if deck doesn't belong to user
     * @throws RateLimitExceededException if rate limit exceeded
     * @throws MonthlyAILimitExceededException if monthly limit exceeded
     */
    @Transactional
    public AIGenerationResponse generateFlashcards(GenerateFlashcardsRequest request,
            UUID userId) {

        log.debug("Generating flashcards for deckId={}, userId={}", request.deckId(), userId);

        // 1. Verify deck ownership
        DeckEntity deck = verifyDeckOwnership(request.deckId(), userId);

        // 2. Check rate limit (10 requests per minute per user)
        String rateLimitKey = "ai-generate:" + userId;
        if (!rateLimitService.tryConsume(rateLimitKey, rateLimitPerMinute, Duration.ofMinutes(1))) {
            log.warn("Rate limit exceeded for user: {}", userId);
            throw new RateLimitExceededException(
                    "Too many AI generation requests. Please try again later.");
        }

        // 3. Check monthly AI limit
        checkMonthlyLimit(userId);

        // 4. Trim and hash source text
        String trimmedText = request.sourceText().trim();
        String sourceTextHash = hashSourceText(trimmedText);
        int sourceTextLength = trimmedText.length();

        // 5. Call AI service to generate candidates
        List<CandidateModel> candidates = aiClientService.generateCandidatesFromText(trimmedText);

        // 6. Create AIGenerationEntity
        AIGenerationEntity entity = new AIGenerationEntity();
        entity.setUser(deck.getUser());
        entity.setDeck(deck);
        entity.setAiModel(aiModel);
        entity.setSourceTextHash(sourceTextHash);
        entity.setSourceTextLength(sourceTextLength);
        entity.setGeneratedCandidatesCount(candidates.size());
        entity.setCandidates(mapper.serializeCandidates(candidates));

        // 7. Save to database
        AIGenerationEntity saved = aiGenerationRepository.save(entity);

        log.info("Generated {} candidates for user={}, generationId={}", candidates.size(), userId,
                saved.getId());

        // 8. Return mapped response
        return mapper.toResponse(saved);
    }

    /**
     * Retrieves an AI generation session by ID.
     * 
     * @param generationId the generation session ID
     * @param userId the authenticated user ID
     * @return response containing generation session with candidates
     * @throws AIGenerationNotFoundException if generation not found
     * @throws ForbiddenException if generation doesn't belong to user
     */
    @Transactional(readOnly = true)
    public AIGenerationResponse getGeneration(UUID generationId, UUID userId) {
        log.debug("Fetching generation: {} for user: {}", generationId, userId);

        AIGenerationEntity entity = aiGenerationRepository.findByIdAndUserId(generationId, userId)
                .orElseThrow(() -> {
                    // Check if generation exists at all
                    if (aiGenerationRepository.existsById(generationId)) {
                        log.warn("User {} attempted to access generation {} owned by another user",
                                userId, generationId);
                        throw new ForbiddenException("You don't have access to this generation");
                    } else {
                        log.warn("Generation not found: {}", generationId);
                        throw new AIGenerationNotFoundException(
                                "Generation not found with id: " + generationId);
                    }
                });

        log.debug("Generation found: {}, candidatesCount: {}", generationId,
                entity.getGeneratedCandidatesCount());

        return mapper.toResponse(entity);
    }

    /**
     * Updates the status of flashcard candidates (accept, reject, or edit).
     * 
     * @param generationId the generation session ID
     * @param request the update request with candidate changes
     * @param userId the authenticated user ID
     * @return response with update confirmation
     * @throws AIGenerationNotFoundException if generation not found
     * @throws ForbiddenException if generation doesn't belong to user
     * @throws InvalidCandidateUpdateException if update data is invalid
     */
    @Transactional
    public UpdateCandidatesResponse updateCandidates(UUID generationId,
            UpdateCandidatesRequest request, UUID userId) {

        log.debug("Updating candidates for generation: {}, userId: {}, candidateCount: {}",
                generationId, userId, request.candidates().size());

        // 1. Find generation by ID and userId (verify ownership)
        AIGenerationEntity entity = aiGenerationRepository.findByIdAndUserId(generationId, userId)
                .orElseThrow(() -> {
                    if (aiGenerationRepository.existsById(generationId)) {
                        log.warn("User {} attempted to update generation {} owned by another user",
                                userId, generationId);
                        throw new ForbiddenException("You don't have access to this generation");
                    } else {
                        log.warn("Generation not found: {}", generationId);
                        throw new AIGenerationNotFoundException(
                                "Generation not found with id: " + generationId);
                    }
                });

        // 2. Deserialize JSONB candidates
        List<CandidateModel> candidates = mapper.deserializeCandidates(entity.getCandidates());

        // 3. Create map for quick lookup
        Map<UUID, CandidateModel> candidateMap =
                candidates.stream().collect(Collectors.toMap(CandidateModel::id, c -> c));

        // 4. Validate all candidate IDs exist
        for (var update : request.candidates()) {
            if (!candidateMap.containsKey(update.id())) {
                throw new InvalidCandidateUpdateException(
                        "Candidate not found with id: " + update.id());
            }
        }

        // 5. Validate status="edited" requires editedFront and editedBack
        for (var update : request.candidates()) {
            if ("edited".equals(update.status())) {
                if (update.editedFront() == null || update.editedFront().trim().isEmpty()) {
                    throw new InvalidCandidateUpdateException(
                            "editedFront is required when status is 'edited' for candidate: "
                                    + update.id());
                }
                if (update.editedBack() == null || update.editedBack().trim().isEmpty()) {
                    throw new InvalidCandidateUpdateException(
                            "editedBack is required when status is 'edited' for candidate: "
                                    + update.id());
                }
            }
        }

        // 6. Apply updates to candidates list
        List<CandidateModel> updatedCandidates = new ArrayList<>();
        for (CandidateModel candidate : candidates) {
            CandidateModel updated = candidate;

            // Find matching update
            for (var update : request.candidates()) {
                if (update.id().equals(candidate.id())) {
                    // Create updated candidate model
                    updated = new CandidateModel(candidate.id(), candidate.front(),
                            candidate.back(), update.status(), update.editedFront(),
                            update.editedBack());
                    break;
                }
            }

            updatedCandidates.add(updated);
        }

        // 7. Serialize back to JSONB
        entity.setCandidates(mapper.serializeCandidates(updatedCandidates));

        // 8. Save entity (Hibernate will automatically UPDATE)
        AIGenerationEntity saved = aiGenerationRepository.save(entity);

        log.info("Updated {} candidates for generation: {}, userId: {}",
                request.candidates().size(), generationId, userId);

        // 9. Return response
        return new UpdateCandidatesResponse(saved.getId(), request.candidates().size(),
                saved.getUpdatedAt());
    }

    /**
     * Saves accepted and edited candidates as flashcards in the deck.
     * 
     * @param generationId the generation session ID
     * @param userId the authenticated user ID
     * @return response with count and IDs of saved flashcards
     * @throws AIGenerationNotFoundException if generation not found
     * @throws ForbiddenException if generation doesn't belong to user
     * @throws NoAcceptedCandidatesException if no candidates are accepted or edited
     * @throws DeckNotFoundException if deck was deleted
     */
    @Transactional
    public SaveCandidatesResponse saveAcceptedCandidates(UUID generationId, UUID userId) {
        log.debug("Saving accepted candidates for generation: {}, userId: {}", generationId,
                userId);

        // 1. Find generation by ID and userId
        AIGenerationEntity entity = aiGenerationRepository.findByIdAndUserId(generationId, userId)
                .orElseThrow(() -> {
                    if (aiGenerationRepository.existsById(generationId)) {
                        log.warn("User {} attempted to save generation {} owned by another user",
                                userId, generationId);
                        throw new ForbiddenException("You don't have access to this generation");
                    } else {
                        log.warn("Generation not found: {}", generationId);
                        throw new AIGenerationNotFoundException(
                                "Generation not found with id: " + generationId);
                    }
                });

        // 2. Deserialize JSONB candidates
        List<CandidateModel> candidates = mapper.deserializeCandidates(entity.getCandidates());

        // 3. Filter candidates: only status="accepted" or "edited"
        List<CandidateModel> candidatesToSave = candidates.stream()
                .filter(c -> "accepted".equals(c.status()) || "edited".equals(c.status()))
                .toList();

        // 4. Validate: list not empty
        if (candidatesToSave.isEmpty()) {
            log.warn("No accepted or edited candidates to save for generation: {}", generationId);
            throw new NoAcceptedCandidatesException(
                    "No accepted or edited candidates to save. Please accept or edit at least one candidate.");
        }

        // 5. Check deck still exists (generation.deck != null)
        if (entity.getDeck() == null) {
            log.warn("Deck was deleted for generation: {}", generationId);
            throw new DeckNotFoundException(
                    "The deck for this generation has been deleted. Cannot save flashcards.");
        }

        DeckEntity deck = entity.getDeck();

        // 6. Create FlashcardEntity list
        List<FlashcardEntity> flashcards = candidatesToSave.stream().map(candidate -> {
            FlashcardEntity flashcard = new FlashcardEntity();
            flashcard.setDeck(deck);
            flashcard.setGeneration(entity);

            // For "edited": use editedFront/editedBack, source=AI_EDITED
            // For "accepted": use front/back, source=AI
            if ("edited".equals(candidate.status())) {
                flashcard.setFront(candidate.editedFront());
                flashcard.setBack(candidate.editedBack());
                flashcard.setSource(FlashcardSource.AI_EDITED);
            } else { // "accepted"
                flashcard.setFront(candidate.front());
                flashcard.setBack(candidate.back());
                flashcard.setSource(FlashcardSource.AI);
            }

            return flashcard;
        }).toList();

        // 7. Batch save flashcards
        List<FlashcardEntity> savedFlashcards = flashcardRepository.saveAll(flashcards);

        // 8. Extract IDs and return response
        List<UUID> flashcardIds =
                savedFlashcards.stream().map(FlashcardEntity::getId).toList();

        log.info("Saved {} flashcards from generation: {}, userId: {}", savedFlashcards.size(),
                generationId, userId);

        return new SaveCandidatesResponse(savedFlashcards.size(), flashcardIds);
    }

    /**
     * Get paginated list of AI generations for a user.
     * 
     * @param userId the authenticated user ID
     * @param pageable pagination parameters
     * @return paginated list of AI generations
     */
    @Transactional(readOnly = true)
    public PagedAIGenerationResponse getAllGenerations(UUID userId,
            org.springframework.data.domain.Pageable pageable) {
        log.debug("Fetching AI generations for user: {}, page: {}", userId,
                pageable.getPageNumber());

        org.springframework.data.domain.Page<AIGenerationEntity> page =
                aiGenerationRepository.findByUserId(userId, pageable);

        List<AIGenerationResponse> content =
                page.getContent().stream().map(mapper::toResponse).toList();

        pl.olesek._xcards.deck.dto.PageInfo pageInfo =
                new pl.olesek._xcards.deck.dto.PageInfo(page.getNumber(), page.getSize(),
                        page.getTotalElements(), page.getTotalPages());

        log.debug("Found {} AI generations for user: {}", page.getTotalElements(), userId);
        return new PagedAIGenerationResponse(content, pageInfo);
    }

    /**
     * Verifies that the deck exists and belongs to the user.
     *
     * @param deckId the deck ID to verify
     * @param userId the user ID to verify ownership
     * @return the deck entity if found and owned by user
     * @throws DeckNotFoundException if deck not found
     * @throws ForbiddenException if deck doesn't belong to user
     */
    private DeckEntity verifyDeckOwnership(UUID deckId, UUID userId) {
        return deckRepository.findByIdAndUserId(deckId, userId).orElseThrow(() -> {
            // Check if deck exists at all
            if (deckRepository.existsById(deckId)) {
                log.warn("User {} attempted to access deck {} owned by another user", userId,
                        deckId);
                throw new ForbiddenException("You don't have access to this deck");
            } else {
                log.warn("Deck not found: {}", deckId);
                throw new DeckNotFoundException("Deck not found with id: " + deckId);
            }
        });
    }

    /**
     * Checks if user has exceeded monthly AI generation limit.
     * 
     * @param userId the user ID to check
     * @throws MonthlyAILimitExceededException if limit exceeded
     */
    private void checkMonthlyLimit(UUID userId) {
        YearMonth currentMonth = YearMonth.now();
        Instant firstDayOfMonth =
                currentMonth.atDay(1).atStartOfDay().toInstant(ZoneOffset.UTC);

        long generationCount = aiGenerationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().filter(gen -> gen.getCreatedAt().isAfter(firstDayOfMonth)).count();

        if (generationCount >= monthlyLimit) {
            log.warn("Monthly AI limit exceeded for user: {} (count: {})", userId,
                    generationCount);
            throw new MonthlyAILimitExceededException(
                    "Monthly AI generation limit exceeded. Limit: " + monthlyLimit);
        }
    }

    /**
     * Hashes source text using SHA-256.
     * 
     * @param sourceText the text to hash
     * @return SHA-256 hash as hex string
     */
    private String hashSourceText(String sourceText) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(sourceText.getBytes(StandardCharsets.UTF_8));

            // Convert to hex string
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();

        } catch (NoSuchAlgorithmException e) {
            log.error("SHA-256 algorithm not available", e);
            throw new IllegalStateException("Failed to hash source text", e);
        }
    }
}
