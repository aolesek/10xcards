# API Endpoint Implementation Plan: Flashcard Management

## 1. Przegląd punktów końcowych

Ten plan opisuje implementację 5 endpointów REST API do zarządzania fiszkami (flashcards) w aplikacji 10xcards. Fiszki są zawsze powiązane z talią (deck), która należy do konkretnego użytkownika. System obsługuje trzy źródła fiszek: ręczne (`manual`), wygenerowane przez AI (`ai`) oraz edytowane po wygenerowaniu przez AI (`ai-edited`).

**Kluczowe funkcjonalności:**
- Przeglądanie fiszek w talii z paginacją i filtrowaniem
- Wyświetlanie szczegółów pojedynczej fiszki
- Tworzenie nowych fiszek ręcznie
- Aktualizacja istniejących fiszek z automatyczną zmianą źródła
- Usuwanie fiszek

**Bezpieczeństwo:** Wszystkie endpointy wymagają uwierzytelnienia JWT i weryfikują, czy użytkownik ma dostęp do zasobów.

---

## 2. Endpoint 1: List Flashcards in Deck

### 2.1. Szczegóły żądania

- **Metoda HTTP:** `GET`
- **Struktura URL:** `/api/decks/{deckId}/flashcards`
- **Opis:** Pobiera listę wszystkich fiszek w danej talii z obsługą paginacji, sortowania i filtrowania

**Parametry:**
- **Wymagane:**
  - `deckId` (path parameter, UUID) - identyfikator talii
  - `Authorization: Bearer {token}` (header) - token JWT użytkownika

- **Opcjonalne (query parameters):**
  - `page` (int, default: 0) - numer strony (0-indexed)
  - `size` (int, default: 50, max: 100) - liczba elementów na stronie
  - `sort` (string, default: "createdAt,desc") - pole i kierunek sortowania (format: "field,direction")
  - `source` (string, optional) - filtrowanie po źródle: "manual", "ai", "ai-edited"

**Request Body:** Brak

### 2.2. Wykorzystywane typy

**Response DTO:**
```java
public record FlashcardResponse(
    UUID id,
    String front,
    String back,
    String source,  // "manual", "ai", "ai-edited"
    UUID generationId,  // nullable
    Instant createdAt,
    Instant updatedAt
)
```

**Paged Response DTO:**
```java
public record PagedFlashcardResponse(
    List<FlashcardResponse> content,
    PageInfo page  // reuse existing PageInfo from deck package
)
```

### 2.3. Szczegóły odpowiedzi

**Success Response: 200 OK**
```json
{
  "content": [
    {
      "id": "uuid",
      "front": "What is photosynthesis?",
      "back": "The process by which plants convert light energy into chemical energy",
      "source": "ai",
      "generationId": "uuid",
      "createdAt": "2025-01-15T10:00:00Z",
      "updatedAt": "2025-01-15T10:00:00Z"
    }
  ],
  "page": {
    "number": 0,
    "size": 50,
    "totalElements": 45,
    "totalPages": 1
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Brak lub nieprawidłowy token JWT
- `404 Not Found` - Talia nie istnieje lub należy do innego użytkownika (bezpieczeństwo przez niejawność)

### 2.4. Przepływ danych

1. **Controller** otrzymuje żądanie z parametrami page, size, sort, source
2. **Security Filter** weryfikuje JWT token i ekstraktuje userId
3. **Controller** waliduje i normalizuje parametry:
   - Limituje `size` do maksymalnie 100
   - Parsuje parametr `sort` na obiekt Pageable
   - Konwertuje `source` string na enum FlashcardSource (jeśli podany)
4. **Controller** wywołuje `FlashcardService.getFlashcardsByDeck(deckId, userId, pageable, source)`
5. **Service** weryfikuje istnienie talii i własność przez użytkownika:
   - Wywołuje `DeckRepository.findByIdAndUserId(deckId, userId)`
   - Rzuca `DeckNotFoundException` jeśli talia nie istnieje lub nie należy do użytkownika
6. **Service** pobiera fiszki z repozytorium:
   - Jeśli `source` jest null: wywołuje `FlashcardRepository.findByDeckId(deckId, pageable)`
   - Jeśli `source` jest podany: wywołuje `FlashcardRepository.findByDeckIdAndSource(deckId, source, pageable)`
7. **Service** używa **FlashcardMapper** do konwersji Page<FlashcardEntity> na PagedFlashcardResponse
8. **Controller** zwraca ResponseEntity z kodem 200 i body

### 2.5. Względy bezpieczeństwa

**Uwierzytelnianie:**
- Endpoint wymaga Bearer token JWT w nagłówku Authorization
- Spring Security automatycznie weryfikuje token przed wywołaniem metody kontrolera

**Autoryzacja:**
- Weryfikacja własności talii: sprawdzenie czy `deck.user.id == userId`
- Użycie metody `findByIdAndUserId` zapewnia, że użytkownik może zobaczyć tylko swoje talie
- Zwracanie 404 zamiast 403 dla braku dostępu (security through obscurity)

**Walidacja danych:**
- Parametr `size` jest limitowany do maksymalnie 100 (zapobieganie DoS)
- Parametr `source` jest walidowany jako enum (tylko dozwolone wartości)
- Parametr `sort` jest parsowany bezpiecznie z obsługą błędów

**Ochrona przed atakami:**
- IDOR (Insecure Direct Object Reference): mitigowane przez check userId
- SQL Injection: mitigowane przez JPA/Hibernate parametryzowane zapytania
- DoS przez duże page size: limitowanie do 100

### 2.6. Obsługa błędów

**DeckNotFoundException (404):**
- **Kiedy:** Talia nie istnieje lub należy do innego użytkownika
- **Komunikat:** "Deck not found with id: {deckId}"
- **Logowanie:** WARN level w GlobalExceptionHandler
- **Response:** ErrorResponse z statusem 404

**IllegalArgumentException (400):**
- **Kiedy:** Nieprawidłowa wartość parametru `source`
- **Komunikat:** "Invalid source value: {source}. Must be one of: manual, ai, ai-edited"
- **Logowanie:** WARN level w GlobalExceptionHandler
- **Response:** ErrorResponse z statusem 400

**InvalidTokenException (401):**
- **Kiedy:** Brak lub nieprawidłowy JWT token
- **Obsługa:** Automatyczna przez Spring Security i GlobalExceptionHandler

### 2.7. Rozważania dotyczące wydajności

**Paginacja:**
- Domyślny rozmiar strony: 50 elementów
- Maksymalny rozmiar strony: 100 elementów
- Użycie Spring Data Pageable dla efektywnych zapytań z LIMIT i OFFSET

**N+1 Problem:**
- Nie występuje - pobieramy tylko FlashcardEntity bez lazy-loaded relationships
- Pole `generation` jest nullable i nie jest pobierane domyślnie (LAZY)

**Indeksowanie:**
- Index na kolumnie `deck_id` (foreign key) - już istniejący
- Index na `(deck_id, source)` dla filtrowania - **do dodania w migracji**
- Index na `(deck_id, created_at)` dla sortowania - **do dodania w migracji**

**Caching:**
- Na tym etapie brak cachingu
- Możliwość dodania cache na poziomie serwisu w przyszłości (Spring Cache)

### 2.8. Etapy implementacji

1. **Rozszerzenie FlashcardRepository:**
   - Dodać metodę: `Page<FlashcardEntity> findByDeckId(UUID deckId, Pageable pageable)`
   - Dodać metodę: `Page<FlashcardEntity> findByDeckIdAndSource(UUID deckId, FlashcardSource source, Pageable pageable)`

2. **Utworzenie DTOs:**
   - Utworzyć `FlashcardResponse` record w pakiecie `pl.olesek._xcards.flashcard.dto`
   - Utworzyć `PagedFlashcardResponse` record w pakiecie `pl.olesek._xcards.flashcard.dto`

3. **Utworzenie FlashcardMapper:**
   - Utworzyć komponent `FlashcardMapper` w pakiecie `pl.olesek._xcards.flashcard.mapper`
   - Zaimplementować metodę: `FlashcardResponse toResponse(FlashcardEntity entity)`
   - Zaimplementować metodę: `PagedFlashcardResponse toPagedResponse(Page<FlashcardEntity> page)`

4. **Utworzenie FlashcardService:**
   - Utworzyć serwis `FlashcardService` w pakiecie `pl.olesek._xcards.flashcard.service`
   - Zaimplementować metodę `getFlashcardsByDeck(UUID deckId, UUID userId, Pageable pageable, FlashcardSource source)`
   - Dodać weryfikację własności talii przez `DeckRepository.findByIdAndUserId()`
   - Dodać logikę warunkowego filtrowania po source

5. **Utworzenie FlashcardController:**
   - Utworzyć kontroler `FlashcardController` w pakiecie `pl.olesek._xcards.flashcard.controller`
   - Dodać mapping: `@GetMapping("/api/decks/{deckId}/flashcards")`
   - Zaimplementować metodę z parametrami: page, size, sort, source
   - Dodać metodę pomocniczą `createPageable()` (podobnie jak w DeckController)
   - Dodać metodę pomocniczą `parseSourceParameter()` do konwersji String → FlashcardSource
   - Dodać adnotacje OpenAPI (@Operation, @ApiResponses)

6. **Testy jednostkowe:**
   - Testy FlashcardService: weryfikacja logiki biznesowej
   - Mockowanie DeckRepository i FlashcardRepository

7. **Testy integracyjne:**
   - Test poprawnego pobrania fiszek z paginacją
   - Test filtrowania po source
   - Test sortowania
   - Test dostępu do talii innego użytkownika (404)
   - Test nieistniejącej talii (404)

8. **Migracja bazy danych (opcjonalna, dla wydajności):**
   - Utworzyć plik Liquibase: `202512080900_add_flashcard_indexes.xml`
   - Dodać index: `CREATE INDEX idx_flashcards_deck_source ON flashcards(deck_id, source)`
   - Dodać index: `CREATE INDEX idx_flashcards_deck_created ON flashcards(deck_id, created_at DESC)`

---

## 3. Endpoint 2: Get Single Flashcard

### 3.1. Szczegóły żądania

- **Metoda HTTP:** `GET`
- **Struktura URL:** `/api/flashcards/{flashcardId}`
- **Opis:** Pobiera szczegóły pojedynczej fiszki

**Parametry:**
- **Wymagane:**
  - `flashcardId` (path parameter, UUID) - identyfikator fiszki
  - `Authorization: Bearer {token}` (header) - token JWT użytkownika

**Request Body:** Brak

### 3.2. Wykorzystywane typy

**Response DTO:**
```java
public record FlashcardResponse(
    UUID id,
    UUID deckId,  // dodatkowe pole w odpowiedzi dla single flashcard
    String front,
    String back,
    String source,
    UUID generationId,
    Instant createdAt,
    Instant updatedAt
)
```

**Uwaga:** FlashcardResponse będzie miał dwa konstruktory lub metody factory:
- Dla listy: bez `deckId` 
- Dla pojedynczej fiszki: z `deckId`

Alternatywnie możemy użyć tego samego DTO i zawsze wypełniać `deckId`.

### 3.3. Szczegóły odpowiedzi

**Success Response: 200 OK**
```json
{
  "id": "uuid",
  "deckId": "uuid",
  "front": "What is photosynthesis?",
  "back": "The process by which plants convert light energy into chemical energy",
  "source": "ai",
  "generationId": "uuid",
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-15T10:00:00Z"
}
```

**Error Responses:**
- `401 Unauthorized` - Brak lub nieprawidłowy token JWT
- `404 Not Found` - Fiszka nie istnieje lub należy do talii innego użytkownika

### 3.4. Przepływ danych

1. **Controller** otrzymuje żądanie z `flashcardId`
2. **Security Filter** weryfikuje JWT token i ekstraktuje userId
3. **Controller** wywołuje `FlashcardService.getFlashcardById(flashcardId, userId)`
4. **Service** pobiera fiszkę z repozytorium:
   - Wywołuje `FlashcardRepository.findById(flashcardId)`
   - Rzuca `FlashcardNotFoundException` jeśli fiszka nie istnieje
5. **Service** weryfikuje własność przez użytkownika:
   - Sprawdza `flashcard.getDeck().getUser().getId() == userId`
   - Rzuca `FlashcardNotFoundException` jeśli użytkownik nie jest właścicielem (bezpieczeństwo przez niejawność)
6. **Service** używa **FlashcardMapper** do konwersji FlashcardEntity na FlashcardResponse
7. **Controller** zwraca ResponseEntity z kodem 200 i body

**Alternatywny przepływ (optymalizacja):**
- Zamiast `findById` + check, użyć custom query: `findByIdAndDeckUserId(flashcardId, userId)`
- Pojedyncze zapytanie SQL z JOIN do tabeli decks i users
- Rzucić `FlashcardNotFoundException` jeśli Optional.empty()

### 3.5. Względy bezpieczeństwa

**Uwierzytelnianie:**
- Endpoint wymaga Bearer token JWT

**Autoryzacja:**
- Weryfikacja własności fiszki przez sprawdzenie właściciela talii
- Zwracanie 404 zamiast 403 dla braku dostępu (security through obscurity)

**Walidacja danych:**
- Walidacja UUID format (automatyczna przez Spring)

**Ochrona przed atakami:**
- IDOR: mitigowane przez check userId
- SQL Injection: mitigowane przez JPA

### 3.6. Obsługa błędów

**FlashcardNotFoundException (404):**
- **Kiedy:** Fiszka nie istnieje lub należy do talii innego użytkownika
- **Komunikat:** "Flashcard not found with id: {flashcardId}"
- **Logowanie:** WARN level w GlobalExceptionHandler
- **Response:** ErrorResponse z statusem 404

**InvalidTokenException (401):**
- **Kiedy:** Brak lub nieprawidłowy JWT token
- **Obsługa:** Automatyczna przez Spring Security

### 3.7. Rozważania dotyczące wydajności

**Lazy Loading:**
- FlashcardEntity ma LAZY relationship do DeckEntity i AIGenerationEntity
- Dla sprawdzenia userId potrzebujemy dostępu do `deck.user.id`
- Opcje:
  1. Eager fetch deck i user w custom query
  2. Użyć `@EntityGraph` dla tego endpointa
  3. Custom query z JOIN FETCH

**Rekomendacja:** Custom query z JOIN FETCH dla optymalnej wydajności:
```java
@Query("SELECT f FROM FlashcardEntity f JOIN FETCH f.deck d JOIN FETCH d.user WHERE f.id = :flashcardId AND d.user.id = :userId")
Optional<FlashcardEntity> findByIdAndDeckUserId(@Param("flashcardId") UUID flashcardId, @Param("userId") UUID userId);
```

### 3.8. Etapy implementacji

1. **Rozszerzenie FlashcardRepository:**
   - Dodać metodę: `Optional<FlashcardEntity> findByIdAndDeckUserId(UUID flashcardId, UUID userId)`
   - Użyć @Query z JOIN FETCH dla optymalizacji

2. **Utworzenie wyjątku:**
   - Utworzyć `FlashcardNotFoundException` extends RuntimeException w pakiecie `pl.olesek._xcards.flashcard.exception`

3. **Rozszerzenie GlobalExceptionHandler:**
   - Dodać handler dla `FlashcardNotFoundException` zwracający 404

4. **Aktualizacja FlashcardMapper:**
   - Upewnić się, że `toResponse()` uwzględnia pole `deckId`
   - `deckId` można pobrać z `entity.getDeck().getId()`

5. **Rozszerzenie FlashcardService:**
   - Zaimplementować metodę `getFlashcardById(UUID flashcardId, UUID userId)`
   - Użyć `findByIdAndDeckUserId` dla jednego zapytania SQL
   - Rzucić `FlashcardNotFoundException` jeśli nie znaleziono

6. **Rozszerzenie FlashcardController:**
   - Dodać mapping: `@GetMapping("/api/flashcards/{flashcardId}")`
   - Zaimplementować metodę wywołującą serwis
   - Dodać adnotacje OpenAPI

7. **Testy jednostkowe:**
   - Test poprawnego pobrania fiszki
   - Test braku dostępu do fiszki innego użytkownika
   - Test nieistniejącej fiszki

8. **Testy integracyjne:**
   - Test poprawnego pobrania fiszki
   - Test dostępu do fiszki innego użytkownika (404)
   - Test nieistniejącej fiszki (404)

---

## 4. Endpoint 3: Create Manual Flashcard

### 4.1. Szczegóły żądania

- **Metoda HTTP:** `POST`
- **Struktura URL:** `/api/decks/{deckId}/flashcards`
- **Opis:** Tworzy nową fiszkę ręcznie w danej talii

**Parametry:**
- **Wymagane:**
  - `deckId` (path parameter, UUID) - identyfikator talii
  - `Authorization: Bearer {token}` (header) - token JWT użytkownika

**Request Body:**
```json
{
  "front": "What is mitosis?",
  "back": "Cell division process that produces two identical daughter cells"
}
```

### 4.2. Wykorzystywane typy

**Request DTO:**
```java
public record CreateFlashcardRequest(
    @NotBlank(message = "Front cannot be blank")
    @Size(max = 500, message = "Front cannot exceed 500 characters")
    String front,
    
    @NotBlank(message = "Back cannot be blank")
    @Size(max = 500, message = "Back cannot exceed 500 characters")
    String back
)
```

**Response DTO:**
```java
public record FlashcardResponse(
    UUID id,
    String front,
    String back,
    String source,  // zawsze "manual"
    UUID generationId,  // zawsze null
    Instant createdAt,
    Instant updatedAt
)
```

### 4.3. Szczegóły odpowiedzi

**Success Response: 201 Created**
```json
{
  "id": "uuid",
  "front": "What is mitosis?",
  "back": "Cell division process that produces two identical daughter cells",
  "source": "manual",
  "generationId": null,
  "createdAt": "2025-01-20T12:00:00Z",
  "updatedAt": "2025-01-20T12:00:00Z"
}
```

**Headers:**
- `Location: /api/flashcards/{flashcardId}`

**Error Responses:**
- `400 Bad Request` - Front lub back jest puste po trimowaniu lub przekracza 500 znaków
- `401 Unauthorized` - Brak lub nieprawidłowy token JWT
- `404 Not Found` - Talia nie istnieje lub należy do innego użytkownika

### 4.4. Przepływ danych

1. **Controller** otrzymuje żądanie z `deckId` i `CreateFlashcardRequest`
2. **Spring Validation** automatycznie waliduje `@Valid CreateFlashcardRequest`:
   - Sprawdza `@NotBlank` dla front i back
   - Sprawdza `@Size(max = 500)` dla front i back
3. **Security Filter** weryfikuje JWT token i ekstraktuje userId
4. **Controller** wywołuje `FlashcardService.createFlashcard(deckId, request, userId)`
5. **Service** weryfikuje istnienie talii i własność:
   - Wywołuje `DeckRepository.findByIdAndUserId(deckId, userId)`
   - Rzuca `DeckNotFoundException` jeśli talia nie istnieje lub nie należy do użytkownika
6. **Service** trimuje dane wejściowe:
   - `String trimmedFront = request.front().trim()`
   - `String trimmedBack = request.back().trim()`
7. **Service** waliduje po trimowaniu:
   - Rzuca `IllegalArgumentException` jeśli `trimmedFront.isEmpty()` lub `trimmedBack.isEmpty()`
8. **Service** tworzy nową fiszkę:
   - Tworzy nowy `FlashcardEntity`
   - Ustawia `deck` jako reference: `deckRepository.getReferenceById(deckId)`
   - Ustawia `front` i `back` (trimowane wartości)
   - Ustawia `source` = `FlashcardSource.MANUAL`
   - Ustawia `generation` = `null`
9. **Service** zapisuje fiszkę:
   - `FlashcardEntity saved = flashcardRepository.save(flashcard)`
10. **Service** używa **FlashcardMapper** do konwersji na FlashcardResponse
11. **Controller** tworzy URI: `/api/flashcards/{flashcardId}`
12. **Controller** zwraca ResponseEntity.created(location).body(response)

### 4.5. Względy bezpieczeństwa

**Uwierzytelnianie:**
- Endpoint wymaga Bearer token JWT

**Autoryzacja:**
- Weryfikacja własności talii przed utworzeniem fiszki
- Tylko właściciel talii może dodać do niej fiszki

**Walidacja danych:**
- Walidacja JSR-303 na poziomie DTO (`@NotBlank`, `@Size`)
- Dodatkowa walidacja po trimowaniu w serwisie
- Maksymalna długość 500 znaków zgodna z ograniczeniami bazy danych

**Ochrona przed atakami:**
- IDOR: mitigowane przez check userId
- XSS: trimowanie pomaga, ale głównie odpowiedzialność frontendu
- SQL Injection: mitigowane przez JPA
- DoS przez duże payload: limitowanie rozmiaru przez @Size

**Trimowanie:**
- Zapobiega zapisywaniu fiszek z samymi spacjami
- Normalizuje dane wejściowe
- Spójne z walidacją bazodanową (`CHECK (LENGTH(TRIM(front)) > 0)`)

### 4.6. Obsługa błędów

**MethodArgumentNotValidException (400):**
- **Kiedy:** Walidacja `@Valid` nie powiodła się (pusty front/back, przekroczenie 500 znaków)
- **Obsługa:** Automatyczna przez GlobalExceptionHandler
- **Response:** ErrorResponse z listą błędów walidacji

**IllegalArgumentException (400):**
- **Kiedy:** Front lub back jest puste po trimowaniu
- **Komunikat:** "Front cannot be empty after trimming" / "Back cannot be empty after trimming"
- **Logowanie:** WARN level w GlobalExceptionHandler
- **Response:** ErrorResponse z statusem 400

**DeckNotFoundException (404):**
- **Kiedy:** Talia nie istnieje lub należy do innego użytkownika
- **Komunikat:** "Deck not found with id: {deckId}"
- **Obsługa:** Istniejący handler w GlobalExceptionHandler

**DataIntegrityViolationException (500 → 400):**
- **Kiedy:** Naruszenie ograniczeń bazy danych (teoretycznie nie powinno wystąpić przy poprawnej walidacji)
- **Obsługa:** Można dodać dedykowany handler zwracający 400

### 4.7. Rozważania dotyczące wydajności

**Wydajność zapisu:**
- Pojedyncza transakcja dla utworzenia fiszki
- Użycie `getReferenceById()` dla deck zamiast `findById()` - unikamy SELECT query
- Timestamp'y generowane automatycznie przez Hibernate (@CreationTimestamp, @UpdateTimestamp)

**Walidacja:**
- Walidacja JSR-303 wykonywana przed wywołaniem serwisu (fail-fast)
- Dodatkowa walidacja po trimowaniu - minimalny overhead

**Brak N+1:**
- Nie pobieramy powiązanych encji przy zapisie

### 4.8. Etapy implementacji

1. **Utworzenie Request DTO:**
   - Utworzyć `CreateFlashcardRequest` record w pakiecie `pl.olesek._xcards.flashcard.dto`
   - Dodać walidację: `@NotBlank`, `@Size(max = 500)`
   - Dodać adnotacje OpenAPI (@Schema)

2. **Rozszerzenie FlashcardService:**
   - Zaimplementować metodę `createFlashcard(UUID deckId, CreateFlashcardRequest request, UUID userId)`
   - Dodać weryfikację własności talii
   - Dodać trimowanie i walidację po trimowaniu
   - Ustawić source = MANUAL, generation = null
   - Zapisać i zwrócić response

3. **Rozszerzenie FlashcardController:**
   - Dodać mapping: `@PostMapping("/api/decks/{deckId}/flashcards")`
   - Dodać `@Valid` przed request body
   - Utworzyć Location header z URI nowej fiszki
   - Zwrócić ResponseEntity.created() z body
   - Dodać adnotacje OpenAPI

4. **Testy jednostkowe:**
   - Test poprawnego utworzenia fiszki
   - Test walidacji pustych pól
   - Test walidacji przekroczenia długości
   - Test trimowania
   - Test braku dostępu do talii

5. **Testy integracyjne:**
   - Test poprawnego utworzenia fiszki z Location header
   - Test walidacji (400)
   - Test dostępu do talii innego użytkownika (404)
   - Test nieistniejącej talii (404)

---

## 5. Endpoint 4: Update Flashcard

### 5.1. Szczegóły żądania

- **Metoda HTTP:** `PUT`
- **Struktura URL:** `/api/flashcards/{flashcardId}`
- **Opis:** Aktualizuje istniejącą fiszkę z automatyczną zmianą źródła

**Parametry:**
- **Wymagane:**
  - `flashcardId` (path parameter, UUID) - identyfikator fiszki
  - `Authorization: Bearer {token}` (header) - token JWT użytkownika

**Request Body:**
```json
{
  "front": "What is mitosis? (Updated)",
  "back": "Cell division process that produces two genetically identical daughter cells from one parent cell"
}
```

### 5.2. Wykorzystywane typy

**Request DTO:**
```java
public record UpdateFlashcardRequest(
    @NotBlank(message = "Front cannot be blank")
    @Size(max = 500, message = "Front cannot exceed 500 characters")
    String front,
    
    @NotBlank(message = "Back cannot be blank")
    @Size(max = 500, message = "Back cannot exceed 500 characters")
    String back
)
```

**Response DTO:**
```java
public record FlashcardResponse(
    UUID id,
    UUID deckId,
    String front,
    String back,
    String source,  // może się zmienić: "ai" → "ai-edited", "manual" → "manual"
    UUID generationId,
    Instant createdAt,
    Instant updatedAt  // zostanie zaktualizowane
)
```

### 5.3. Szczegóły odpowiedzi

**Success Response: 200 OK**
```json
{
  "id": "uuid",
  "deckId": "uuid",
  "front": "What is mitosis? (Updated)",
  "back": "Cell division process that produces two genetically identical daughter cells from one parent cell",
  "source": "ai-edited",
  "generationId": "uuid",
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-20T12:30:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Front lub back jest puste po trimowaniu lub przekracza 500 znaków
- `401 Unauthorized` - Brak lub nieprawidłowy token JWT
- `404 Not Found` - Fiszka nie istnieje lub należy do talii innego użytkownika

### 5.4. Przepływ danych

1. **Controller** otrzymuje żądanie z `flashcardId` i `UpdateFlashcardRequest`
2. **Spring Validation** automatycznie waliduje `@Valid UpdateFlashcardRequest`
3. **Security Filter** weryfikuje JWT token i ekstraktuje userId
4. **Controller** wywołuje `FlashcardService.updateFlashcard(flashcardId, request, userId)`
5. **Service** pobiera fiszkę i weryfikuje własność:
   - Wywołuje `FlashcardRepository.findByIdAndDeckUserId(flashcardId, userId)`
   - Rzuca `FlashcardNotFoundException` jeśli nie znaleziono
6. **Service** trimuje dane wejściowe:
   - `String trimmedFront = request.front().trim()`
   - `String trimmedBack = request.back().trim()`
7. **Service** waliduje po trimowaniu:
   - Rzuca `IllegalArgumentException` jeśli puste po trimowaniu
8. **Service** aktualizuje pola fiszki:
   - `flashcard.setFront(trimmedFront)`
   - `flashcard.setBack(trimmedBack)`
9. **Service** aktualizuje pole `source` zgodnie z regułami:
   - Jeśli current source == `FlashcardSource.AI`: ustaw `FlashcardSource.AI_EDITED`
   - Jeśli current source == `FlashcardSource.MANUAL`: pozostaw `FlashcardSource.MANUAL`
   - Jeśli current source == `FlashcardSource.AI_EDITED`: pozostaw `FlashcardSource.AI_EDITED`
10. **Service** zapisuje zmiany:
    - `FlashcardEntity updated = flashcardRepository.save(flashcard)`
    - Hibernate automatycznie aktualizuje `updatedAt` (@UpdateTimestamp)
11. **Service** używa **FlashcardMapper** do konwersji na FlashcardResponse
12. **Controller** zwraca ResponseEntity.ok(response)

### 5.5. Względy bezpieczeństwa

**Uwierzytelnianie:**
- Endpoint wymaga Bearer token JWT

**Autoryzacja:**
- Weryfikacja własności fiszki przez sprawdzenie właściciela talii
- Tylko właściciel może aktualizować fiszki

**Walidacja danych:**
- Walidacja JSR-303 na poziomie DTO
- Dodatkowa walidacja po trimowaniu
- Walidacja maksymalnej długości

**Ochrona przed atakami:**
- IDOR: mitigowane przez check userId
- XSS: trimowanie pomaga
- SQL Injection: mitigowane przez JPA

**Logika source:**
- Automatyczna zmiana `ai` → `ai-edited` zapewnia tracking edycji
- Fiszki ręczne (`manual`) pozostają ręczne po edycji
- Fiszki już edytowane (`ai-edited`) pozostają edytowane

### 5.6. Obsługa błędów

**MethodArgumentNotValidException (400):**
- **Kiedy:** Walidacja `@Valid` nie powiodła się
- **Obsługa:** Automatyczna przez GlobalExceptionHandler

**IllegalArgumentException (400):**
- **Kiedy:** Front lub back jest puste po trimowaniu
- **Komunikat:** "Front cannot be empty after trimming" / "Back cannot be empty after trimming"

**FlashcardNotFoundException (404):**
- **Kiedy:** Fiszka nie istnieje lub należy do talii innego użytkownika
- **Komunikat:** "Flashcard not found with id: {flashcardId}"

### 5.7. Rozważania dotyczące wydajności

**Wydajność aktualizacji:**
- Pojedyncza transakcja
- Użycie `findByIdAndDeckUserId` z JOIN FETCH - jedno zapytanie SELECT
- UPDATE query dla zmienionych pól
- Automatyczne aktualizowanie `updatedAt` przez Hibernate

**Optymalizacja:**
- Dirty checking przez Hibernate - update tylko zmienionych pól
- Brak dodatkowych SELECT queries dla relationships

### 5.8. Etapy implementacji

1. **Utworzenie Request DTO:**
   - Utworzyć `UpdateFlashcardRequest` record w pakiecie `pl.olesek._xcards.flashcard.dto`
   - Dodać tę samą walidację co w CreateFlashcardRequest
   - Dodać adnotacje OpenAPI

2. **Rozszerzenie FlashcardService:**
   - Zaimplementować metodę `updateFlashcard(UUID flashcardId, UpdateFlashcardRequest request, UUID userId)`
   - Pobrać fiszkę z weryfikacją własności
   - Zaimplementować trimowanie i walidację
   - Zaimplementować logikę zmiany source (ai → ai-edited)
   - Zapisać i zwrócić response

3. **Rozszerzenie FlashcardController:**
   - Dodać mapping: `@PutMapping("/api/flashcards/{flashcardId}")`
   - Dodać `@Valid` przed request body
   - Zwrócić ResponseEntity.ok() z body
   - Dodać adnotacje OpenAPI

4. **Testy jednostkowe:**
   - Test poprawnej aktualizacji fiszki
   - Test zmiany source: ai → ai-edited
   - Test pozostawienia source: manual → manual
   - Test pozostawienia source: ai-edited → ai-edited
   - Test walidacji
   - Test braku dostępu

5. **Testy integracyjne:**
   - Test poprawnej aktualizacji z weryfikacją updatedAt
   - Test zmiany source
   - Test walidacji (400)
   - Test dostępu do fiszki innego użytkownika (404)
   - Test nieistniejącej fiszki (404)

---

## 6. Endpoint 5: Delete Flashcard

### 6.1. Szczegóły żądania

- **Metoda HTTP:** `DELETE`
- **Struktura URL:** `/api/flashcards/{flashcardId}`
- **Opis:** Usuwa pojedynczą fiszkę

**Parametry:**
- **Wymagane:**
  - `flashcardId` (path parameter, UUID) - identyfikator fiszki
  - `Authorization: Bearer {token}` (header) - token JWT użytkownika

**Request Body:** Brak

### 6.2. Wykorzystywane typy

Brak specjalnych typów - endpoint zwraca 204 No Content bez body.

### 6.3. Szczegóły odpowiedzi

**Success Response: 204 No Content**
- Brak body
- Status 204 oznacza pomyślne usunięcie

**Error Responses:**
- `401 Unauthorized` - Brak lub nieprawidłowy token JWT
- `404 Not Found` - Fiszka nie istnieje lub należy do talii innego użytkownika

### 6.4. Przepływ danych

1. **Controller** otrzymuje żądanie z `flashcardId`
2. **Security Filter** weryfikuje JWT token i ekstraktuje userId
3. **Controller** wywołuje `FlashcardService.deleteFlashcard(flashcardId, userId)`
4. **Service** pobiera fiszkę i weryfikuje własność:
   - Wywołuje `FlashcardRepository.findByIdAndDeckUserId(flashcardId, userId)`
   - Rzuca `FlashcardNotFoundException` jeśli nie znaleziono
5. **Service** usuwa fiszkę:
   - `flashcardRepository.delete(flashcard)`
6. **Service** loguje informację o usunięciu
7. **Controller** zwraca ResponseEntity.noContent().build()

**Cascade:**
- Usunięcie fiszki nie usuwa powiązanej generacji AI (ON DELETE SET NULL w bazie)
- Fiszka jest usuwana kaskadowo przy usunięciu talii (ON DELETE CASCADE)

### 6.5. Względy bezpieczeństwa

**Uwierzytelnianie:**
- Endpoint wymaga Bearer token JWT

**Autoryzacja:**
- Weryfikacja własności fiszki przed usunięciem
- Tylko właściciel może usunąć fiszkę

**Ochrona przed atakami:**
- IDOR: mitigowane przez check userId
- Brak możliwości odzyskania usuniętych danych (należy rozważyć soft delete w przyszłości)

**Audyt:**
- Logowanie operacji usunięcia na poziomie INFO
- Możliwość dodania audit trail w przyszłości

### 6.6. Obsługa błędów

**FlashcardNotFoundException (404):**
- **Kiedy:** Fiszka nie istnieje lub należy do talii innego użytkownika
- **Komunikat:** "Flashcard not found with id: {flashcardId}"
- **Logowanie:** WARN level w GlobalExceptionHandler

**InvalidTokenException (401):**
- **Kiedy:** Brak lub nieprawidłowy JWT token
- **Obsługa:** Automatyczna przez Spring Security

### 6.7. Rozważania dotyczące wydajności

**Wydajność usuwania:**
- Pojedyncza transakcja
- SELECT (z weryfikacją własności) + DELETE
- Brak kaskadowych usunięć (fiszka jest leaf node w hierarchii)

**Optymalizacja:**
- Użycie `findByIdAndDeckUserId` z JOIN - jedno SELECT query
- DELETE query przez Hibernate

**Alternatywa (future):**
- Soft delete: dodanie pola `deleted_at` zamiast fizycznego usunięcia
- Umożliwi odzyskiwanie danych i lepszy audit trail

### 6.8. Etapy implementacji

1. **Rozszerzenie FlashcardService:**
   - Zaimplementować metodę `deleteFlashcard(UUID flashcardId, UUID userId)`
   - Pobrać fiszkę z weryfikacją własności
   - Usunąć fiszkę: `flashcardRepository.delete(flashcard)`
   - Zalogować operację na poziomie INFO

2. **Rozszerzenie FlashcardController:**
   - Dodać mapping: `@DeleteMapping("/api/flashcards/{flashcardId}")`
   - Wywołać serwis
   - Zwrócić ResponseEntity.noContent().build()
   - Dodać adnotacje OpenAPI

3. **Testy jednostkowe:**
   - Test poprawnego usunięcia fiszki
   - Test braku dostępu do fiszki innego użytkownika
   - Test nieistniejącej fiszki

4. **Testy integracyjne:**
   - Test poprawnego usunięcia fiszki (204)
   - Test weryfikacji, że fiszka nie istnieje po usunięciu
   - Test dostępu do fiszki innego użytkownika (404)
   - Test nieistniejącej fiszki (404)

---

## 7. Wspólne elementy implementacji

### 7.1. Struktura pakietów

```
pl.olesek._xcards.flashcard/
├── FlashcardEntity.java (istniejący)
├── FlashcardRepository.java (istniejący, do rozszerzenia)
├── FlashcardSource.java (istniejący)
├── FlashcardSourceConverter.java (istniejący)
├── controller/
│   └── FlashcardController.java (nowy)
├── dto/
│   ├── CreateFlashcardRequest.java (nowy)
│   ├── UpdateFlashcardRequest.java (nowy)
│   ├── FlashcardResponse.java (nowy)
│   └── PagedFlashcardResponse.java (nowy)
├── exception/
│   └── FlashcardNotFoundException.java (nowy)
├── mapper/
│   └── FlashcardMapper.java (nowy)
└── service/
    └── FlashcardService.java (nowy)
```

### 7.2. Zależności między komponentami

```
FlashcardController
    ↓ (wywołuje)
FlashcardService
    ↓ (używa)
FlashcardRepository, DeckRepository, FlashcardMapper
    ↓ (operuje na)
FlashcardEntity, DeckEntity
```

### 7.3. Wspólne adnotacje OpenAPI

Wszystkie endpointy powinny mieć:
- `@Tag(name = "Flashcards", description = "Flashcard management endpoints")`
- `@SecurityRequirement(name = "bearer-jwt")`
- `@Operation` z summary i description
- `@ApiResponses` z wszystkimi możliwymi odpowiedziami

### 7.4. Logowanie

**Poziomy logowania:**
- **DEBUG:** Wejście do metod kontrolera i serwisu z parametrami
- **INFO:** Pomyślne operacje CREATE, UPDATE, DELETE
- **WARN:** Błędy walidacji, nie znaleziono zasobów, brak dostępu
- **ERROR:** Nieoczekiwane wyjątki (GlobalExceptionHandler)

**Format logów:**
```java
log.debug("GET /api/flashcards/{} - userId: {}", flashcardId, userId);
log.info("Flashcard created successfully: flashcardId={}, deckId={}, userId={}", 
    flashcardId, deckId, userId);
log.warn("Flashcard not found: flashcardId={}, userId={}", flashcardId, userId);
```

### 7.5. Transakcje

- Wszystkie metody serwisu modyfikujące dane: `@Transactional`
- Metody tylko odczytujące dane: `@Transactional(readOnly = true)`
- Domyślna propagacja: REQUIRED
- Domyślna izolacja: DEFAULT (READ_COMMITTED w PostgreSQL)

### 7.6. Konwencje nazewnictwa

**Repository methods:**
- `findByDeckId` - lista wszystkich
- `findByDeckIdAndSource` - lista z filtrowaniem
- `findByIdAndDeckUserId` - pojedynczy z weryfikacją własności

**Service methods:**
- `getFlashcardsByDeck` - zwraca PagedResponse
- `getFlashcardById` - zwraca pojedynczy Response
- `createFlashcard` - tworzy i zwraca Response
- `updateFlashcard` - aktualizuje i zwraca Response
- `deleteFlashcard` - usuwa, void

**Controller methods:**
- `getFlashcardsInDeck` - handler dla GET /decks/{id}/flashcards
- `getFlashcard` - handler dla GET /flashcards/{id}
- `createFlashcard` - handler dla POST /decks/{id}/flashcards
- `updateFlashcard` - handler dla PUT /flashcards/{id}
- `deleteFlashcard` - handler dla DELETE /flashcards/{id}

### 7.7. Walidacja - podsumowanie

**Walidacja DTO (JSR-303):**
- `@NotBlank` - nie null, nie puste, nie same białe znaki
- `@Size(max = 500)` - maksymalna długość

**Walidacja w serwisie:**
- Trimowanie wszystkich stringów
- Sprawdzenie, czy po trimowaniu nie są puste
- Sprawdzenie własności zasobów (deck, flashcard)

**Walidacja w bazie danych:**
- CHECK constraints na kolumnach
- Foreign key constraints
- NOT NULL constraints

### 7.8. Mapowanie source enum

**FlashcardSource enum:**
```java
MANUAL("manual")
AI("ai")
AI_EDITED("ai-edited")
```

**JSON serialization:**
- Zwracamy wartość `databaseValue` (lowercase z kreską)
- Frontend otrzymuje: "manual", "ai", "ai-edited"

**Deserializacja z query parameter:**
```java
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
```

---

## 8. Plan testowania

### 8.1. Testy jednostkowe (JUnit 5 + Mockito)

**FlashcardServiceTest:**
- `testGetFlashcardsByDeck_Success()`
- `testGetFlashcardsByDeck_WithSourceFilter()`
- `testGetFlashcardsByDeck_DeckNotFound()`
- `testGetFlashcardById_Success()`
- `testGetFlashcardById_NotFound()`
- `testGetFlashcardById_NotOwned()`
- `testCreateFlashcard_Success()`
- `testCreateFlashcard_EmptyAfterTrim()`
- `testCreateFlashcard_DeckNotFound()`
- `testUpdateFlashcard_Success()`
- `testUpdateFlashcard_SourceChangeAiToEdited()`
- `testUpdateFlashcard_SourceRemainsManual()`
- `testUpdateFlashcard_NotFound()`
- `testDeleteFlashcard_Success()`
- `testDeleteFlashcard_NotFound()`

**FlashcardMapperTest:**
- `testToResponse_AllFieldsPopulated()`
- `testToResponse_NullableFieldsNull()`
- `testToPagedResponse_MultipleFlashcards()`
- `testToPagedResponse_EmptyPage()`

### 8.2. Testy integracyjne (Spring Boot Test)

**FlashcardControllerIntegrationTest extends AbstractIntegrationTest:**

**GET /api/decks/{deckId}/flashcards:**
- `testGetFlashcardsInDeck_Success_ReturnsPagedList()`
- `testGetFlashcardsInDeck_WithPagination_ReturnsCorrectPage()`
- `testGetFlashcardsInDeck_WithSourceFilter_ReturnsFilteredList()`
- `testGetFlashcardsInDeck_WithSorting_ReturnsSortedList()`
- `testGetFlashcardsInDeck_DeckNotFound_Returns404()`
- `testGetFlashcardsInDeck_DeckOfOtherUser_Returns404()`
- `testGetFlashcardsInDeck_InvalidSourceFilter_Returns400()`
- `testGetFlashcardsInDeck_NoAuth_Returns401()`

**GET /api/flashcards/{flashcardId}:**
- `testGetFlashcard_Success_ReturnsFlashcard()`
- `testGetFlashcard_NotFound_Returns404()`
- `testGetFlashcard_FlashcardOfOtherUser_Returns404()`
- `testGetFlashcard_NoAuth_Returns401()`

**POST /api/decks/{deckId}/flashcards:**
- `testCreateFlashcard_Success_Returns201WithLocation()`
- `testCreateFlashcard_SourceIsManual_Success()`
- `testCreateFlashcard_GenerationIdIsNull_Success()`
- `testCreateFlashcard_BlankFront_Returns400()`
- `testCreateFlashcard_BlankBack_Returns400()`
- `testCreateFlashcard_TooLongFront_Returns400()`
- `testCreateFlashcard_TooLongBack_Returns400()`
- `testCreateFlashcard_OnlyWhitespace_Returns400()`
- `testCreateFlashcard_DeckNotFound_Returns404()`
- `testCreateFlashcard_DeckOfOtherUser_Returns404()`
- `testCreateFlashcard_NoAuth_Returns401()`

**PUT /api/flashcards/{flashcardId}:**
- `testUpdateFlashcard_Success_Returns200()`
- `testUpdateFlashcard_UpdatesUpdatedAt_Success()`
- `testUpdateFlashcard_SourceAi_ChangesToAiEdited()`
- `testUpdateFlashcard_SourceManual_RemainsManual()`
- `testUpdateFlashcard_SourceAiEdited_RemainsAiEdited()`
- `testUpdateFlashcard_BlankFront_Returns400()`
- `testUpdateFlashcard_BlankBack_Returns400()`
- `testUpdateFlashcard_TooLong_Returns400()`
- `testUpdateFlashcard_NotFound_Returns404()`
- `testUpdateFlashcard_FlashcardOfOtherUser_Returns404()`
- `testUpdateFlashcard_NoAuth_Returns401()`

**DELETE /api/flashcards/{flashcardId}:**
- `testDeleteFlashcard_Success_Returns204()`
- `testDeleteFlashcard_FlashcardGone_GetReturns404()`
- `testDeleteFlashcard_NotFound_Returns404()`
- `testDeleteFlashcard_FlashcardOfOtherUser_Returns404()`
- `testDeleteFlashcard_NoAuth_Returns401()`

### 8.3. Scenariusze testowe E2E

1. **Pełny cykl życia fiszki:**
   - Utwórz fiszkę ręcznie
   - Pobierz listę fiszek
   - Pobierz pojedynczą fiszkę
   - Zaktualizuj fiszkę
   - Usuń fiszkę
   - Zweryfikuj, że fiszka nie istnieje

2. **Scenariusz z AI:**
   - Utwórz fiszkę przez AI (symulowane, source=ai)
   - Zaktualizuj fiszkę
   - Zweryfikuj, że source zmienił się na ai-edited
   - Zaktualizuj ponownie
   - Zweryfikuj, że source pozostał ai-edited

3. **Scenariusz z filtrowaniem:**
   - Utwórz 3 fiszki ręczne
   - Utwórz 2 fiszki AI
   - Pobierz wszystkie fiszki - zweryfikuj 5 elementów
   - Pobierz tylko ręczne - zweryfikuj 3 elementy
   - Pobierz tylko AI - zweryfikuj 2 elementy

4. **Scenariusz bezpieczeństwa:**
   - User A tworzy talię i fiszki
   - User B próbuje:
     - Pobrać fiszki talii A - 404
     - Pobrać fiszkę A - 404
     - Zaktualizować fiszkę A - 404
     - Usunąć fiszkę A - 404

---

## 9. Migracje bazy danych (opcjonalne, dla wydajności)

### 9.1. Dodanie indeksów

**Plik:** `src/main/resources/db/changelog/changes/202512080900_add_flashcard_indexes.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

    <changeSet id="202512080900-1" author="developer">
        <comment>Add index on flashcards(deck_id, source) for filtering</comment>
        <createIndex indexName="idx_flashcards_deck_source" tableName="flashcards">
            <column name="deck_id"/>
            <column name="source"/>
        </createIndex>
    </changeSet>

    <changeSet id="202512080900-2" author="developer">
        <comment>Add index on flashcards(deck_id, created_at) for sorting</comment>
        <createIndex indexName="idx_flashcards_deck_created" tableName="flashcards">
            <column name="deck_id"/>
            <column name="created_at" descending="true"/>
        </createIndex>
    </changeSet>

</databaseChangeLog>
```

**Dodać do master changelog:**
```xml
<include file="changes/202512080900_add_flashcard_indexes.xml" relativeToChangelogFile="true"/>
```

---

## 10. Dokumentacja OpenAPI

### 10.1. Przykładowe adnotacje dla kontrolera

```java
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Flashcards", description = "Flashcard management endpoints")
public class FlashcardController {

    @GetMapping("/decks/{deckId}/flashcards")
    @Operation(
        summary = "List flashcards in deck",
        description = "Get all flashcards in a specific deck with pagination and filtering",
        security = @SecurityRequirement(name = "bearer-jwt")
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Flashcards retrieved successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "404", description = "Deck not found or belongs to another user")
    })
    public ResponseEntity<PagedFlashcardResponse> getFlashcardsInDeck(...) {
        // implementation
    }
}
```

### 10.2. Konfiguracja OpenAPI

Upewnić się, że `OpenApiConfig` ma skonfigurowane:
- Bearer JWT security scheme
- Opis API
- Informacje kontaktowe
- Wersję API

---

## 11. Checklist implementacji

### Faza 1: Fundamenty
- [ ] Utworzyć pakiet `flashcard.dto`
- [ ] Utworzyć pakiet `flashcard.exception`
- [ ] Utworzyć pakiet `flashcard.mapper`
- [ ] Utworzyć pakiet `flashcard.service`
- [ ] Utworzyć pakiet `flashcard.controller`

### Faza 2: DTOs i Exceptions
- [ ] Utworzyć `CreateFlashcardRequest`
- [ ] Utworzyć `UpdateFlashcardRequest`
- [ ] Utworzyć `FlashcardResponse`
- [ ] Utworzyć `PagedFlashcardResponse`
- [ ] Utworzyć `FlashcardNotFoundException`
- [ ] Dodać handler do `GlobalExceptionHandler`

### Faza 3: Repository
- [ ] Rozszerzyć `FlashcardRepository` o `findByDeckId(UUID, Pageable)`
- [ ] Rozszerzyć `FlashcardRepository` o `findByDeckIdAndSource(UUID, FlashcardSource, Pageable)`
- [ ] Rozszerzyć `FlashcardRepository` o `findByIdAndDeckUserId(UUID, UUID)`

### Faza 4: Mapper
- [ ] Utworzyć `FlashcardMapper`
- [ ] Zaimplementować `toResponse(FlashcardEntity)`
- [ ] Zaimplementować `toPagedResponse(Page<FlashcardEntity>)`

### Faza 5: Service
- [ ] Utworzyć `FlashcardService`
- [ ] Zaimplementować `getFlashcardsByDeck()`
- [ ] Zaimplementować `getFlashcardById()`
- [ ] Zaimplementować `createFlashcard()`
- [ ] Zaimplementować `updateFlashcard()` z logiką source
- [ ] Zaimplementować `deleteFlashcard()`

### Faza 6: Controller
- [ ] Utworzyć `FlashcardController`
- [ ] Zaimplementować GET `/api/decks/{deckId}/flashcards`
- [ ] Zaimplementować GET `/api/flashcards/{flashcardId}`
- [ ] Zaimplementować POST `/api/decks/{deckId}/flashcards`
- [ ] Zaimplementować PUT `/api/flashcards/{flashcardId}`
- [ ] Zaimplementować DELETE `/api/flashcards/{flashcardId}`
- [ ] Dodać adnotacje OpenAPI do wszystkich endpointów
- [ ] Dodać metodę pomocniczą `createPageable()`
- [ ] Dodać metodę pomocniczą `parseSourceParameter()`

### Faza 7: Testy jednostkowe
- [ ] Utworzyć `FlashcardMapperTest`
- [ ] Utworzyć `FlashcardServiceTest` z mockami
- [ ] Przetestować wszystkie metody serwisu
- [ ] Przetestować przypadki błędów

### Faza 8: Testy integracyjne
- [ ] Utworzyć `FlashcardControllerIntegrationTest`
- [ ] Przetestować wszystkie endpointy (happy path)
- [ ] Przetestować wszystkie scenariusze błędów
- [ ] Przetestować scenariusze bezpieczeństwa
- [ ] Przetestować paginację i filtrowanie

### Faza 9: Migracje (opcjonalne)
- [ ] Utworzyć migrację dla indeksów
- [ ] Dodać do master changelog
- [ ] Przetestować migrację na czystej bazie

### Faza 10: Dokumentacja i Code Review
- [ ] Zweryfikować dokumentację OpenAPI
- [ ] Sprawdzić poprawność logowania
- [ ] Sprawdzić spójność z wzorcami DeckController
- [ ] Code review
- [ ] Merge do mastera

---

## 12. Potencjalne rozszerzenia (future)

### 12.1. Funkcjonalności
- **Bulk operations:** Usuwanie wielu fiszek jednocześnie
- **Soft delete:** Zamiast fizycznego usuwania
- **Flashcard history:** Tracking zmian w fiszkach
- **Flashcard tags:** Dodanie tagów do fiszek
- **Search:** Wyszukiwanie fiszek po treści

### 12.2. Optymalizacje
- **Caching:** Spring Cache dla często pobieranych fiszek
- **Read replicas:** Dla queries read-only
- **Batch operations:** Bulk insert dla AI-generated flashcards

### 12.3. Monitoring
- **Metrics:** Liczba utworzonych/zaktualizowanych/usuniętych fiszek
- **Performance monitoring:** Czas wykonania queries
- **Error tracking:** Sentry/Rollbar integration

---

## Podsumowanie

Ten plan implementacji dostarcza kompleksowego przewodnika po stworzeniu 5 endpointów REST API dla zarządzania fiszkami w aplikacji 10xcards. Plan uwzględnia:

✅ **Szczegółowe specyfikacje** wszystkich endpointów
✅ **Bezpieczeństwo** z uwierzytelnianiem JWT i autoryzacją
✅ **Walidację** na trzech poziomach (DTO, serwis, baza danych)
✅ **Obsługę błędów** z odpowiednimi kodami statusu
✅ **Wydajność** z optymalizacją queries i indeksami
✅ **Testy** jednostkowe i integracyjne
✅ **Dokumentację** OpenAPI
✅ **Spójność** z istniejącymi wzorcami w projekcie

Implementacja powinna być wykonana fazami zgodnie z checklistą, z priorytetem na:
1. Endpoint do listowania fiszek (najczęściej używany)
2. Endpoint do tworzenia fiszek (core functionality)
3. Endpoint do aktualizacji (z logiką source)
4. Pozostałe endpointy (get single, delete)

