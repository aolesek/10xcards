package pl.olesek._xcards.deck.controller;

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

import pl.olesek._xcards.deck.dto.CreateDeckRequest;
import pl.olesek._xcards.deck.dto.DeckResponse;
import pl.olesek._xcards.deck.dto.PagedDeckResponse;
import pl.olesek._xcards.deck.dto.UpdateDeckRequest;
import pl.olesek._xcards.deck.service.DeckService;

import java.net.URI;
import java.util.UUID;

@RestController
@RequestMapping("/api/decks")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Decks", description = "Deck management endpoints")
public class DeckController {

    private final DeckService deckService;

    @GetMapping
    @Operation(summary = "List user's decks",
            description = "Get all decks owned by authenticated user with pagination",
            security = @SecurityRequirement(name = "bearer-jwt"))
    @ApiResponses(value = {@ApiResponse(responseCode = "200",
            description = "Decks retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")})
    public ResponseEntity<PagedDeckResponse> getAllDecks(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort,
            Authentication authentication) {

        UUID userId = (UUID) authentication.getPrincipal();
        log.debug("GET /api/decks - userId: {}, page: {}, size: {}", userId, page, size);

        size = Math.min(size, 100);

        Pageable pageable = createPageable(page, size, sort);
        PagedDeckResponse response = deckService.getAllDecks(userId, pageable);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{deckId}")
    @Operation(summary = "Get single deck",
            description = "Get details of a specific deck",
            security = @SecurityRequirement(name = "bearer-jwt"))
    @ApiResponses(value = {@ApiResponse(responseCode = "200",
            description = "Deck retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "404", description = "Deck not found")})
    public ResponseEntity<DeckResponse> getDeck(@PathVariable UUID deckId,
            Authentication authentication) {

        UUID userId = (UUID) authentication.getPrincipal();
        log.debug("GET /api/decks/{} - userId: {}", deckId, userId);

        DeckResponse response = deckService.getDeckById(deckId, userId);
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @Operation(summary = "Create new deck",
            description = "Create a new deck for authenticated user",
            security = @SecurityRequirement(name = "bearer-jwt"))
    @ApiResponses(value = {@ApiResponse(responseCode = "201",
            description = "Deck created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid input"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "409",
                    description = "Deck with this name already exists")})
    public ResponseEntity<DeckResponse> createDeck(
            @Valid @RequestBody CreateDeckRequest request, Authentication authentication) {

        UUID userId = (UUID) authentication.getPrincipal();
        log.debug("POST /api/decks - userId: {}, name: {}", userId, request.name());

        DeckResponse response = deckService.createDeck(request, userId);

        URI location = URI.create("/api/decks/" + response.id());
        return ResponseEntity.created(location).body(response);
    }

    @PutMapping("/{deckId}")
    @Operation(summary = "Update deck", description = "Update deck name",
            security = @SecurityRequirement(name = "bearer-jwt"))
    @ApiResponses(value = {@ApiResponse(responseCode = "200",
            description = "Deck updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid input"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "404", description = "Deck not found"),
            @ApiResponse(responseCode = "409",
                    description = "Another deck with this name already exists")})
    public ResponseEntity<DeckResponse> updateDeck(@PathVariable UUID deckId,
            @Valid @RequestBody UpdateDeckRequest request, Authentication authentication) {

        UUID userId = (UUID) authentication.getPrincipal();
        log.debug("PUT /api/decks/{} - userId: {}, name: {}", deckId, userId,
                request.name());

        DeckResponse response = deckService.updateDeck(deckId, request, userId);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{deckId}")
    @Operation(summary = "Delete deck",
            description = "Delete deck and all associated flashcards",
            security = @SecurityRequirement(name = "bearer-jwt"))
    @ApiResponses(value = {@ApiResponse(responseCode = "204",
            description = "Deck deleted successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "404", description = "Deck not found")})
    public ResponseEntity<Void> deleteDeck(@PathVariable UUID deckId,
            Authentication authentication) {

        UUID userId = (UUID) authentication.getPrincipal();
        log.debug("DELETE /api/decks/{} - userId: {}", deckId, userId);

        deckService.deleteDeck(deckId, userId);
        return ResponseEntity.noContent().build();
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

