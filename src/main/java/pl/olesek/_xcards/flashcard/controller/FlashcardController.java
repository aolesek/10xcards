package pl.olesek._xcards.flashcard.controller;

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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pl.olesek._xcards.flashcard.FlashcardSource;
import pl.olesek._xcards.flashcard.dto.CreateFlashcardRequest;
import pl.olesek._xcards.flashcard.dto.FlashcardResponse;
import pl.olesek._xcards.flashcard.dto.PagedFlashcardResponse;
import pl.olesek._xcards.flashcard.dto.UpdateFlashcardRequest;
import pl.olesek._xcards.flashcard.service.FlashcardService;

import java.net.URI;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Flashcards", description = "Flashcard management endpoints")
public class FlashcardController {

    private final FlashcardService flashcardService;

    @GetMapping("/decks/{deckId}/flashcards")
    @Operation(summary = "List flashcards in deck",
            description = "Get all flashcards in a specific deck with pagination and optional filtering by source",
            security = @SecurityRequirement(name = "bearer-jwt"))
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200",
                    description = "Flashcards retrieved successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid source parameter"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "404",
                    description = "Deck not found or belongs to another user")})
    public ResponseEntity<PagedFlashcardResponse> getFlashcardsInDeck(
            @PathVariable UUID deckId, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort,
            @RequestParam(required = false) String source, Authentication authentication) {

        UUID userId = (UUID) authentication.getPrincipal();
        log.debug("GET /api/decks/{}/flashcards - userId: {}, page: {}, size: {}, source: {}",
                deckId, userId, page, size, source);

        size = Math.min(size, 100);
        FlashcardSource sourceEnum = parseSourceParameter(source);
        Pageable pageable = createPageable(page, size, sort);

        PagedFlashcardResponse response =
                flashcardService.getFlashcardsByDeck(deckId, userId, pageable, sourceEnum);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/flashcards/{flashcardId}")
    @Operation(summary = "Get single flashcard",
            description = "Get details of a specific flashcard",
            security = @SecurityRequirement(name = "bearer-jwt"))
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200",
                    description = "Flashcard retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "404",
                    description = "Flashcard not found or belongs to another user")})
    public ResponseEntity<FlashcardResponse> getFlashcard(@PathVariable UUID flashcardId,
            Authentication authentication) {

        UUID userId = (UUID) authentication.getPrincipal();
        log.debug("GET /api/flashcards/{} - userId: {}", flashcardId, userId);

        FlashcardResponse response = flashcardService.getFlashcardById(flashcardId, userId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/decks/{deckId}/flashcards")
    @Operation(summary = "Create manual flashcard",
            description = "Create a new manual flashcard in a specific deck",
            security = @SecurityRequirement(name = "bearer-jwt"))
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201",
                    description = "Flashcard created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid input"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "404",
                    description = "Deck not found or belongs to another user")})
    public ResponseEntity<FlashcardResponse> createFlashcard(@PathVariable UUID deckId,
            @Valid @RequestBody CreateFlashcardRequest request,
            Authentication authentication) {

        UUID userId = (UUID) authentication.getPrincipal();
        log.debug("POST /api/decks/{}/flashcards - userId: {}", deckId, userId);

        FlashcardResponse response = flashcardService.createFlashcard(deckId, request, userId);

        URI location = URI.create("/api/flashcards/" + response.id());
        return ResponseEntity.created(location).body(response);
    }

    @PutMapping("/flashcards/{flashcardId}")
    @Operation(summary = "Update flashcard",
            description = "Update an existing flashcard. Automatically changes source from 'ai' to 'ai-edited' for AI-generated flashcards",
            security = @SecurityRequirement(name = "bearer-jwt"))
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200",
                    description = "Flashcard updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid input"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "404",
                    description = "Flashcard not found or belongs to another user")})
    public ResponseEntity<FlashcardResponse> updateFlashcard(@PathVariable UUID flashcardId,
            @Valid @RequestBody UpdateFlashcardRequest request,
            Authentication authentication) {

        UUID userId = (UUID) authentication.getPrincipal();
        log.debug("PUT /api/flashcards/{} - userId: {}", flashcardId, userId);

        FlashcardResponse response = flashcardService.updateFlashcard(flashcardId, request, userId);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/flashcards/{flashcardId}")
    @Operation(summary = "Delete flashcard", description = "Delete a specific flashcard",
            security = @SecurityRequirement(name = "bearer-jwt"))
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204",
                    description = "Flashcard deleted successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "404",
                    description = "Flashcard not found or belongs to another user")})
    public ResponseEntity<Void> deleteFlashcard(@PathVariable UUID flashcardId,
            Authentication authentication) {

        UUID userId = (UUID) authentication.getPrincipal();
        log.debug("DELETE /api/flashcards/{} - userId: {}", flashcardId, userId);

        flashcardService.deleteFlashcard(flashcardId, userId);
        return ResponseEntity.noContent().build();
    }

    private Pageable createPageable(int page, int size, String sort) {
        Sort.Direction direction = Sort.Direction.DESC;
        String sortField = "createdAt";

        if (sort.contains(",")) {
            String[] sortParts = sort.split(",");
            sortField = sortParts[0].trim();
            direction = sortParts[1].trim().equalsIgnoreCase("asc") ? Sort.Direction.ASC
                    : Sort.Direction.DESC;
        }

        // Add secondary sort by ID to ensure stable ordering when primary field values are equal
        Sort sortObj = Sort.by(direction, sortField).and(Sort.by(Sort.Direction.DESC, "id"));
        Pageable pageable = PageRequest.of(page, size, sortObj);

        log.debug("Created Pageable: page={}, size={}, sort={} (field={}, direction={}) + secondary sort by id DESC",
                page, size, sort, sortField, direction);

        return pageable;
    }

    private FlashcardSource parseSourceParameter(String source) {
        if (source == null || source.isBlank()) {
            return null;
        }

        return switch (source.toLowerCase()) {
            case "manual" -> FlashcardSource.MANUAL;
            case "ai" -> FlashcardSource.AI;
            case "ai-edited" -> FlashcardSource.AI_EDITED;
            default -> throw new IllegalArgumentException(
                    "Invalid source value: " + source + ". Must be one of: manual, ai, ai-edited");
        };
    }
}

