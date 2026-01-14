# API Endpoint Implementation Plan: Study Mode - Get Study Session

## 1. Przegląd punktu końcowego

Endpoint umożliwia pobranie fiszek z wybranego zestawu do sesji nauki. Główne funkcje:
- Pobieranie wszystkich fiszek z określonego deck
- Opcjonalna randomizacja kolejności (domyślnie włączona)
- Weryfikacja własności zestawu (authorization check)
- Uproszczona struktura odpowiedzi (tylko id, front, back)

## 2. Szczegóły żądania

### Metoda i URL
```
GET /api/decks/{deckId}/study
```

### Parametry
- **deckId** (path, required): UUID zestawu
- **shuffle** (query, optional): boolean, default: `true` - czy losować kolejność
- **Authorization** (header, required): `Bearer {token}`

### Przykłady
```http
GET /api/decks/550e8400-e29b-41d4-a716-446655440000/study?shuffle=true
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 3. Wykorzystywane typy

### Nowe DTOs do utworzenia

**StudyFlashcardDto**
```java
package pl.olesek._xcards.deck.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;

@Schema(description = "Simplified flashcard for study session")
public record StudyFlashcardDto(
    @Schema(description = "Unique identifier", example = "550e8400-e29b-41d4-a716-446655440001")
    UUID id,
    
    @Schema(description = "Question", example = "What is mitosis?")
    String front,
    
    @Schema(description = "Answer", example = "Cell division process")
    String back
) {}
```

**StudySessionResponse**
```java
package pl.olesek._xcards.deck.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import java.util.UUID;

@Schema(description = "Study session with flashcards")
public record StudySessionResponse(
    @Schema(description = "Deck identifier", example = "550e8400-e29b-41d4-a716-446655440000")
    UUID deckId,
    
    @Schema(description = "Deck name", example = "Biology 101")
    String deckName,
    
    @Schema(description = "Total cards count", example = "45")
    int totalCards,
    
    @Schema(description = "Flashcards list")
    List<StudyFlashcardDto> flashcards
) {}
```

### Istniejące typy do wykorzystania
- **DeckEntity** - encja deck
- **FlashcardEntity** - encja flashcard
- **DeckNotFoundException** - wyjątek 404
- **ForbiddenException** - wyjątek 403 (opcjonalnie)
- **ErrorResponse** - standardowy error response

## 4. Szczegóły odpowiedzi

### Sukces - 200 OK
```json
{
  "deckId": "550e8400-e29b-41d4-a716-446655440000",
  "deckName": "Biology 101",
  "totalCards": 45,
  "flashcards": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "front": "What is mitosis?",
      "back": "Cell division process"
    }
  ]
}
```

**Uwagi:**
- Pusta lista jeśli deck nie ma fiszek
- Kolejność: shuffle=true → losowa, shuffle=false → createdAt DESC

### Błędy

| Status | Scenariusz | Message |
|--------|-----------|---------|
| 400 | Nieprawidłowy UUID | "Invalid UUID string: {value}" |
| 401 | Brak/zły token | "Invalid or missing authentication token" |
| 403 | Cudzy deck (opcjonalnie) | "You do not have permission..." |
| 404 | Deck nie istnieje | "Deck not found with id: {deckId}" |
| 500 | Błąd serwera | "An unexpected error occurred" |

**Zalecenie autoryzacji:**
- **Opcja 1** (zalecana): `findByIdAndUserId()` → zwróć 404 dla nieistniejącego/cudzego deck (jedno zapytanie, lepsze bezpieczeństwo)
- **Opcja 2**: Osobne sprawdzenie → rozróżnij 403 i 404 (lepsze UX, dwa zapytania)

## 5. Względy bezpieczeństwa

### Uwierzytelnianie
- JWT weryfikowany przez Spring Security
- `Authentication.getPrincipal()` zwraca `UUID userId`

### Autoryzacja
```java
// Zalecane: jedno zapytanie, nie ujawnia czy deck istnieje
DeckEntity deck = deckRepository.findByIdAndUserId(deckId, userId)
    .orElseThrow(() -> new DeckNotFoundException("Deck not found with id: " + deckId));
```

### Walidacja
- UUID: automatyczna przez Spring (400 przy błędzie)
- shuffle: automatyczna konwersja boolean
- Własność deck: sprawdzenie userId

### Zagrożenia i zabezpieczenia
- **SQL Injection**: JPA używa parametryzowanych zapytań ✓
- **Authorization Bypass**: Sprawdzenie deck.userId == userId ✓
- **Mass Data Exposure**: Tylko niezbędne pola (id, front, back) ✓
- **Large Datasets**: Rozważ limit 1000 kart lub log warning

### Logowanie
```java
log.debug("GET /api/decks/{}/study - userId: {}, shuffle: {}", deckId, userId, shuffle);
log.warn("Large study session: deckId={}, cardCount={}", deckId, flashcards.size()); // jeśli >1000
```

## 6. Obsługa błędów

Wszystkie wyjątki są obsługiwane przez istniejący `GlobalExceptionHandler`:
- `DeckNotFoundException` → 404
- `ForbiddenException` → 403 (jeśli używasz)
- `IllegalArgumentException` → 400
- `Exception` → 500 (z logowaniem pełnego stack trace)

## 7. Wydajność

### Potencjalne wąskie gardła
1. **ORDER BY RANDOM()** - kosztowne dla >500 kart
   - Alternatywa: randomizuj w Javie `Collections.shuffle()`
   
2. **Duże zestawy** - >1000 kart = duże response
   - Rozwiązanie: limit lub paginacja w przyszłości

### Optymalizacje
- `@Transactional(readOnly = true)` na metodzie service
- Brak N+1: deck i flashcards w osobnych zapytaniach, nie dostępuj `flashcard.getDeck()`
- Indeksy: `flashcards.deck_id`, opcjonalnie `(deck_id, created_at)`

### Monitoring
```java
if (flashcards.size() > 1000) {
    log.warn("Large study session: deckId={}, cardCount={}", deckId, flashcards.size());
}
```

## 8. Etapy wdrożenia

### Krok 1: Repository - FlashcardRepository
Dodaj metodę dla uporządkowanych fiszek (shuffle=false):

```java
@Repository
public interface FlashcardRepository extends JpaRepository<FlashcardEntity, UUID> {
    
    // Już istnieje dla shuffle=true:
    // @Query("SELECT f FROM FlashcardEntity f WHERE f.deck.id = :deckId ORDER BY FUNCTION('RANDOM')")
    // List<FlashcardEntity> findByDeckIdInRandomOrder(@Param("deckId") UUID deckId);
    
    // Dodaj dla shuffle=false:
    List<FlashcardEntity> findByDeckIdOrderByCreatedAtDesc(UUID deckId);
}
```

### Krok 2: DTOs
Utwórz `StudyFlashcardDto.java` i `StudySessionResponse.java` w `pl.olesek._xcards.deck.dto` (kod w sekcji 3).

### Krok 3: Service - DeckService
Dodaj metodę do `DeckService`:

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class DeckService {
    
    private final DeckRepository deckRepository;
    private final FlashcardRepository flashcardRepository;
    // ... existing fields
    
    @Transactional(readOnly = true)
    public StudySessionResponse getStudySession(UUID deckId, boolean shuffle, UUID userId) {
        log.debug("Getting study session: deckId={}, userId={}, shuffle={}", deckId, userId, shuffle);
        
        // Authorization check
        DeckEntity deck = deckRepository.findByIdAndUserId(deckId, userId)
            .orElseThrow(() -> new DeckNotFoundException("Deck not found with id: " + deckId));
        
        // Fetch flashcards
        List<FlashcardEntity> flashcards = shuffle 
            ? flashcardRepository.findByDeckIdInRandomOrder(deckId)
            : flashcardRepository.findByDeckIdOrderByCreatedAtDesc(deckId);
        
        log.debug("Study session loaded: deckId={}, cardCount={}", deckId, flashcards.size());
        
        if (flashcards.size() > 1000) {
            log.warn("Large study session: deckId={}, cardCount={}", deckId, flashcards.size());
        }
        
        // Map to DTOs
        List<StudyFlashcardDto> flashcardDtos = flashcards.stream()
            .map(f -> new StudyFlashcardDto(f.getId(), f.getFront(), f.getBack()))
            .toList();
        
        return new StudySessionResponse(
            deck.getId(),
            deck.getName(),
            flashcardDtos.size(),
            flashcardDtos
        );
    }
}
```

### Krok 4: Controller - DeckController
Dodaj endpoint do `DeckController`:

```java
@RestController
@RequestMapping("/api/decks")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Decks", description = "Deck management endpoints")
public class DeckController {
    
    private final DeckService deckService;
    // ... existing methods
    
    @GetMapping("/{deckId}/study")
    @Operation(
        summary = "Get study session",
        description = "Get flashcards for study session with optional randomization",
        security = @SecurityRequirement(name = "bearer-jwt")
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Success"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "403", description = "Forbidden"),
        @ApiResponse(responseCode = "404", description = "Not Found")
    })
    public ResponseEntity<StudySessionResponse> getStudySession(
            @PathVariable UUID deckId,
            @RequestParam(defaultValue = "true") boolean shuffle,
            Authentication authentication) {
        
        UUID userId = (UUID) authentication.getPrincipal();
        log.debug("GET /api/decks/{}/study - userId: {}, shuffle: {}", deckId, userId, shuffle);
        
        StudySessionResponse response = deckService.getStudySession(deckId, shuffle, userId);
        return ResponseEntity.ok(response);
    }
}
```

### Krok 5: Weryfikacja
1. Sprawdź czy aplikacja się kompiluje: `mvn clean compile`
2. Uruchom aplikację: `mvn spring-boot:run`
3. Sprawdź OpenAPI docs: `http://localhost:8080/swagger-ui.html`
4. Przetestuj manualnie (Postman/cURL):
   ```bash
   curl -X GET "http://localhost:8080/api/decks/{deckId}/study?shuffle=true" \
     -H "Authorization: Bearer {token}"
   ```

### Krok 6: Deploy
1. Uruchom testy: `mvn test`
2. Zbuduj: `mvn clean package`
3. Deploy i monitoruj logi przez pierwsze 30 minut
4. Śledź metryki: response time, error rate, liczba żądań

## 9. Podsumowanie

**Kluczowe punkty implementacji:**
- Endpoint: `GET /api/decks/{deckId}/study`
- Service: metoda w `DeckService.getStudySession()`
- Nowe DTOs: `StudySessionResponse`, `StudyFlashcardDto`
- Autoryzacja: `findByIdAndUserId()` dla bezpieczeństwa i wydajności
- Randomizacja: `ORDER BY RANDOM()` lub `ORDER BY created_at DESC`
- Bezpieczeństwo: sprawdzenie własności deck przed zwróceniem danych
- Wydajność: `@Transactional(readOnly=true)`, monitoring dużych zestawów
- Obsługa błędów: już istniejący GlobalExceptionHandler

**Kolejne kroki (opcjonalnie):**
- Dodaj paginację dla zestawów >1000 kart
- Rozważ cache dla często używanych zestawów
- Dodaj metryki biznesowe (analytics)
