package pl.olesek._xcards.ai.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import pl.olesek._xcards.ai.dto.request.GenerateFlashcardsRequest;
import pl.olesek._xcards.ai.dto.request.UpdateCandidatesRequest;
import pl.olesek._xcards.ai.dto.response.AIGenerationResponse;
import pl.olesek._xcards.ai.dto.response.PagedAIGenerationResponse;
import pl.olesek._xcards.ai.dto.response.SaveCandidatesResponse;
import pl.olesek._xcards.ai.dto.response.UpdateCandidatesResponse;
import pl.olesek._xcards.ai.service.AIGenerationService;

import java.net.URI;
import java.util.UUID;

/**
 * REST controller for AI-powered flashcard generation. Provides endpoints for generating, managing,
 * and saving flashcard candidates.
 */
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "AI Generations", description = "AI flashcard generation endpoints")
public class AIGenerationController {

    private final AIGenerationService aiGenerationService;

    /**
     * Generate flashcard candidates from source text using AI.
     * 
     * @param request the generation request containing deckId, sourceText, and requestedCandidatesCount
     * @param authentication the authenticated user
     * @return 201 Created with generation session and candidates
     */
    @PostMapping("/generate")
    @Operation(summary = "Generate flashcard candidates",
            description = "Generate flashcard candidates from source text using AI. "
                    + "Requires 500-10000 characters of text. "
                    + "Number of candidates is configurable (1-100, default 10). "
                    + "Subject to rate limiting (10 requests/minute) and monthly limit (100 generations/month).",
            security = @SecurityRequirement(name = "bearer-jwt"))
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201",
                    description = "Flashcard candidates generated successfully"),
            @ApiResponse(responseCode = "400",
                    description = "Invalid request - source text length out of range (500-10000 chars)"),
            @ApiResponse(responseCode = "401", description = "Unauthorized - invalid or missing JWT token"),
            @ApiResponse(responseCode = "403",
                    description = "Forbidden - deck doesn't belong to user OR monthly AI limit exceeded (100/month)"),
            @ApiResponse(responseCode = "404", description = "Not Found - deck doesn't exist"),
            @ApiResponse(responseCode = "429",
                    description = "Too Many Requests - rate limit exceeded (10 requests/minute)"),
            @ApiResponse(responseCode = "503",
                    description = "Service Unavailable - AI service is temporarily unavailable")})
    public ResponseEntity<AIGenerationResponse> generateFlashcards(
            @Valid @RequestBody GenerateFlashcardsRequest request,
            Authentication authentication) {

        UUID userId = (UUID) authentication.getPrincipal();
        log.debug("POST /api/ai/generate - userId: {}, deckId: {}, textLength: {}, requestedCount: {}", 
                userId, request.deckId(), request.sourceText().length(), 
                request.requestedCandidatesCount());

        AIGenerationResponse response = aiGenerationService.generateFlashcards(request, userId);

        URI location = URI.create("/api/ai/generations/" + response.id());
        return ResponseEntity.created(location).body(response);
    }

    /**
     * List all AI generation sessions for the authenticated user.
     * 
     * @param page page number (default 0)
     * @param size page size (default 20)
     * @param sort sort field and direction (default createdAt,desc)
     * @param authentication the authenticated user
     * @return 200 OK with paginated list of generation sessions
     */
    @GetMapping("/generations")
    @Operation(summary = "List AI generation sessions",
            description = "Get paginated list of all AI generation sessions for authenticated user",
            security = @SecurityRequirement(name = "bearer-jwt"))
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200",
                    description = "Generation sessions retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")})
    public ResponseEntity<PagedAIGenerationResponse> getAllGenerations(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort,
            Authentication authentication) {

        UUID userId = (UUID) authentication.getPrincipal();
        log.debug("GET /api/ai/generations - userId: {}, page: {}, size: {}", userId, page, size);

        size = Math.min(size, 100);
        Pageable pageable = createPageable(page, size, sort);
        PagedAIGenerationResponse response = aiGenerationService.getAllGenerations(userId, pageable);

        return ResponseEntity.ok(response);
    }

    /**
     * Get AI generation session by ID with all candidates and their statuses.
     * 
     * @param generationId the generation session ID
     * @param authentication the authenticated user
     * @return 200 OK with generation session details
     */
    @GetMapping("/generations/{generationId}")
    @Operation(summary = "Get AI generation session",
            description = "Retrieve an AI generation session with all flashcard candidates and their current statuses. "
                    + "Only the owner can access their generation sessions.",
            security = @SecurityRequirement(name = "bearer-jwt"))
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200",
                    description = "Generation session retrieved successfully"),
            @ApiResponse(responseCode = "401",
                    description = "Unauthorized - invalid or missing JWT token"),
            @ApiResponse(responseCode = "403",
                    description = "Forbidden - generation doesn't belong to user"),
            @ApiResponse(responseCode = "404",
                    description = "Not Found - generation session doesn't exist")})
    public ResponseEntity<AIGenerationResponse> getGeneration(@PathVariable UUID generationId,
            Authentication authentication) {

        UUID userId = (UUID) authentication.getPrincipal();
        log.debug("GET /api/ai/generations/{} - userId: {}", generationId, userId);

        AIGenerationResponse response = aiGenerationService.getGeneration(generationId, userId);
        return ResponseEntity.ok(response);
    }

    /**
     * Update the status of flashcard candidates (accept, reject, or edit).
     * 
     * @param generationId the generation session ID
     * @param request the update request with candidate changes
     * @param authentication the authenticated user
     * @return 200 OK with update confirmation
     */
    @PatchMapping("/generations/{generationId}/candidates")
    @Operation(summary = "Update candidate statuses",
            description = "Update the status of flashcard candidates to accepted, rejected, or edited. "
                    + "When status is 'edited', both editedFront and editedBack must be provided. "
                    + "Multiple candidates can be updated in a single request.",
            security = @SecurityRequirement(name = "bearer-jwt"))
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Candidates updated successfully"),
            @ApiResponse(responseCode = "400",
                    description = "Bad Request - invalid status, missing edited fields, or candidate ID not found"),
            @ApiResponse(responseCode = "401",
                    description = "Unauthorized - invalid or missing JWT token"),
            @ApiResponse(responseCode = "403",
                    description = "Forbidden - generation doesn't belong to user"),
            @ApiResponse(responseCode = "404",
                    description = "Not Found - generation session doesn't exist")})
    public ResponseEntity<UpdateCandidatesResponse> updateCandidates(
            @PathVariable UUID generationId, @Valid @RequestBody UpdateCandidatesRequest request,
            Authentication authentication) {

        UUID userId = (UUID) authentication.getPrincipal();
        log.debug("PATCH /api/ai/generations/{}/candidates - userId: {}, candidateCount: {}",
                generationId, userId, request.candidates().size());

        UpdateCandidatesResponse response =
                aiGenerationService.updateCandidates(generationId, request, userId);
        return ResponseEntity.ok(response);
    }

    /**
     * Save accepted and edited candidates as flashcards in the deck.
     * 
     * @param generationId the generation session ID
     * @param authentication the authenticated user
     * @return 201 Created with count and IDs of saved flashcards
     */
    @PostMapping("/generations/{generationId}/save")
    @Operation(summary = "Save accepted candidates as flashcards",
            description = "Save all accepted and edited candidates as flashcards in the target deck. "
                    + "Only candidates with status 'accepted' or 'edited' will be saved. "
                    + "Accepted candidates use the AI-generated text (source=AI), "
                    + "while edited candidates use the modified text (source=AI_EDITED). "
                    + "At least one candidate must be accepted or edited.",
            security = @SecurityRequirement(name = "bearer-jwt"))
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201",
                    description = "Flashcards created successfully from candidates"),
            @ApiResponse(responseCode = "400",
                    description = "Bad Request - no accepted or edited candidates to save"),
            @ApiResponse(responseCode = "401",
                    description = "Unauthorized - invalid or missing JWT token"),
            @ApiResponse(responseCode = "403",
                    description = "Forbidden - generation doesn't belong to user"),
            @ApiResponse(responseCode = "404",
                    description = "Not Found - generation doesn't exist OR deck was deleted")})
    public ResponseEntity<SaveCandidatesResponse> saveAcceptedCandidates(
            @PathVariable UUID generationId, Authentication authentication) {

        UUID userId = (UUID) authentication.getPrincipal();
        log.debug("POST /api/ai/generations/{}/save - userId: {}", generationId, userId);

        SaveCandidatesResponse response =
                aiGenerationService.saveAcceptedCandidates(generationId, userId);
        return ResponseEntity.status(201).body(response);
    }

    private Pageable createPageable(int page, int size, String sort) {
        Sort.Direction direction = Sort.Direction.DESC;
        String sortField = "createdAt";

        if (sort.contains(",")) {
            String[] sortParts = sort.split(",");
            sortField = sortParts[0];
            direction = sortParts[1].equalsIgnoreCase("asc") ? Sort.Direction.ASC
                    : Sort.Direction.DESC;
        }

        return PageRequest.of(page, size, Sort.by(direction, sortField));
    }
}
