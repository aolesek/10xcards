# API Endpoint Implementation Plan: Deck Management

## 1. Przegląd punktu końcowego

Moduł Deck Management zapewnia pełny CRUD (Create, Read, Update, Delete) dla talii fiszek użytkowników. Każdy użytkownik może zarządzać własnymi taliami, przy czym nazwa talii musi być unikalna w obrębie użytkownika. Wszystkie endpointy wymagają uwierzytelnienia przez JWT token i implementują autoryzację opartą na własności zasobów.

### Kluczowe funkcjonalności:
- Listowanie talii z paginacją i sortowaniem
- Pobieranie szczegółów pojedynczej talii
- Tworzenie nowej talii z walidacją unikalności nazwy
- Aktualizacja nazwy talii
- Usuwanie talii wraz z kaskadowym usunięciem wszystkich powiązanych fiszek

## 2. Szczegóły żądania

### 2.1. List User's Decks
- **Metoda HTTP:** GET
- **Struktura URL:** `/api/decks`
- **Parametry:**
  - **Opcjonalne:**
    - `page` (Integer, default: 0) - Numer strony dla paginacji
    - `size` (Integer, default: 20) - Liczba elementów na stronie
    - `sort` (String, default: "createdAt,desc") - Pole i kierunek sortowania
- **Request Body:** Brak
- **Headers:** 
  - `Authorization: Bearer {jwt-token}` (wymagane)

### 2.2. Get Single Deck
- **Metoda HTTP:** GET
- **Struktura URL:** `/api/decks/{deckId}`
- **Parametry:**
  - **Wymagane:**
    - `deckId` (UUID, path parameter) - Identyfikator talii
- **Request Body:** Brak
- **Headers:** 
  - `Authorization: Bearer {jwt-token}` (wymagane)

### 2.3. Create New Deck
- **Metoda HTTP:** POST
- **Struktura URL:** `/api/decks`
- **Parametry:** Brak
- **Request Body:**
```json
{
  "name": "Biology 101"
}
```
- **Headers:** 
  - `Authorization: Bearer {jwt-token}` (wymagane)
  - `Content-Type: application/json`

### 2.4. Update Deck
- **Metoda HTTP:** PUT
- **Struktura URL:** `/api/decks/{deckId}`
- **Parametry:**
  - **Wymagane:**
    - `deckId` (UUID, path parameter) - Identyfikator talii
- **Request Body:**
```json
{
  "name": "Advanced Biology"
}
```
- **Headers:** 
  - `Authorization: Bearer {jwt-token}` (wymagane)
  - `Content-Type: application/json`

### 2.5. Delete Deck
- **Metoda HTTP:** DELETE
- **Struktura URL:** `/api/decks/{deckId}`
- **Parametry:**
  - **Wymagane:**
    - `deckId` (UUID, path parameter) - Identyfikator talii
- **Request Body:** Brak
- **Headers:** 
  - `Authorization: Bearer {jwt-token}` (wymagane)

## 3. Wykorzystywane typy

### 3.1. Request DTOs

#### CreateDeckRequest
```java
package pl.olesek._xcards.deck.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateDeckRequest(
    @NotBlank(message = "Deck name cannot be blank")
    @Size(max = 100, message = "Deck name cannot exceed 100 characters")
    String name
) {}
```

#### UpdateDeckRequest
```java
package pl.olesek._xcards.deck.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateDeckRequest(
    @NotBlank(message = "Deck name cannot be blank")
    @Size(max = 100, message = "Deck name cannot exceed 100 characters")
    String name
) {}
```

### 3.2. Response DTOs

#### DeckResponse
```java
package pl.olesek._xcards.deck.dto;

import java.time.Instant;
import java.util.UUID;

public record DeckResponse(
    UUID id,
    String name,
    int flashcardCount,
    Instant createdAt,
    Instant updatedAt
) {}
```

#### PagedDeckResponse
```java
package pl.olesek._xcards.deck.dto;

import java.util.List;

public record PagedDeckResponse(
    List<DeckResponse> content,
    PageInfo page
) {}

public record PageInfo(
    int number,
    int size,
    long totalElements,
    int totalPages
) {}
```

### 3.3. Custom Exceptions

#### DeckNotFoundException
```java
package pl.olesek._xcards.deck.exception;

public class DeckNotFoundException extends RuntimeException {
    public DeckNotFoundException(String message) {
        super(message);
    }
}
```

#### DeckAccessDeniedException
```java
package pl.olesek._xcards.deck.exception;

public class DeckAccessDeniedException extends RuntimeException {
    public DeckAccessDeniedException(String message) {
        super(message);
    }
}
```

#### DeckAlreadyExistsException
```java
package pl.olesek._xcards.deck.exception;

public class DeckAlreadyExistsException extends RuntimeException {
    public DeckAlreadyExistsException(String message) {
        super(message);
    }
}
```

### 3.4. Mapper

#### DeckMapper
```java
package pl.olesek._xcards.deck.mapper;

import org.springframework.data.domain.Page;
import org.springframework.stereotype.Component;

import pl.olesek._xcards.deck.DeckEntity;
import pl.olesek._xcards.deck.dto.DeckResponse;
import pl.olesek._xcards.deck.dto.PagedDeckResponse;
import pl.olesek._xcards.deck.dto.PageInfo;

@Component
public class DeckMapper {
    
    public DeckResponse toResponse(DeckEntity entity, int flashcardCount) {
        return new DeckResponse(
            entity.getId(),
            entity.getName(),
            flashcardCount,
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }
    
    public PagedDeckResponse toPagedResponse(Page<DeckEntity> page, Map<UUID, Integer> flashcardCounts) {
        List<DeckResponse> content = page.getContent().stream()
            .map(entity -> toResponse(entity, flashcardCounts.getOrDefault(entity.getId(), 0)))
            .toList();
            
        PageInfo pageInfo = new PageInfo(
            page.getNumber(),
            page.getSize(),
            page.getTotalElements(),
            page.getTotalPages()
        );
        
        return new PagedDeckResponse(content, pageInfo);
    }
}
```

## 4. Szczegóły odpowiedzi

### 4.1. GET /api/decks - Success Response (200 OK)
```json
{
  "content": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Biology 101",
      "flashcardCount": 45,
      "createdAt": "2025-01-10T09:00:00Z",
      "updatedAt": "2025-01-15T14:30:00Z"
    }
  ],
  "page": {
    "number": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

### 4.2. GET /api/decks/{deckId} - Success Response (200 OK)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Biology 101",
  "flashcardCount": 45,
  "createdAt": "2025-01-10T09:00:00Z",
  "updatedAt": "2025-01-15T14:30:00Z"
}
```

### 4.3. POST /api/decks - Success Response (201 Created)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Biology 101",
  "flashcardCount": 0,
  "createdAt": "2025-01-20T10:00:00Z",
  "updatedAt": "2025-01-20T10:00:00Z"
}
```

### 4.4. PUT /api/decks/{deckId} - Success Response (200 OK)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Advanced Biology",
  "flashcardCount": 45,
  "createdAt": "2025-01-10T09:00:00Z",
  "updatedAt": "2025-01-20T11:00:00Z"
}
```

### 4.5. DELETE /api/decks/{deckId} - Success Response (204 No Content)
Brak treści odpowiedzi.

### 4.6. Error Responses

#### 400 Bad Request
```json
{
  "timestamp": "2025-01-20T14:30:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "name: Deck name cannot be blank",
  "path": "/api/decks"
}
```

#### 401 Unauthorized
```json
{
  "timestamp": "2025-01-20T14:30:00Z",
  "status": 401,
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token",
  "path": "/api/decks/550e8400-e29b-41d4-a716-446655440000"
}
```

#### 403 Forbidden
```json
{
  "timestamp": "2025-01-20T14:30:00Z",
  "status": 403,
  "error": "Forbidden",
  "message": "You do not have permission to access this deck",
  "path": "/api/decks/550e8400-e29b-41d4-a716-446655440000"
}
```

#### 404 Not Found
```json
{
  "timestamp": "2025-01-20T14:30:00Z",
  "status": 404,
  "error": "Not Found",
  "message": "Deck not found with id: 550e8400-e29b-41d4-a716-446655440000",
  "path": "/api/decks/550e8400-e29b-41d4-a716-446655440000"
}
```

#### 409 Conflict
```json
{
  "timestamp": "2025-01-20T14:30:00Z",
  "status": 409,
  "error": "Conflict",
  "message": "Deck with name 'Biology 101' already exists",
  "path": "/api/decks"
}
```

## 5. Przepływ danych

### 5.1. List User's Decks - GET /api/decks

```
1. Client → Controller: GET /api/decks?page=0&size=20&sort=createdAt,desc
   ↓
2. Controller: Extract userId from Authentication.getPrincipal()
   ↓
3. Controller → Service: getAllDecks(userId, pageable)
   ↓
4. Service → Repository: findByUserId(userId, pageable)
   ↓
5. Repository → Database: SELECT * FROM decks WHERE user_id = ? ORDER BY created_at DESC LIMIT 20 OFFSET 0
   ↓
6. Database → Repository: Page<DeckEntity>
   ↓
7. Service → FlashcardRepository: countByDeckIdIn(deckIds)
   ↓
8. FlashcardRepository → Database: SELECT deck_id, COUNT(*) FROM flashcards WHERE deck_id IN (...) GROUP BY deck_id
   ↓
9. Database → Service: Map<UUID, Integer> flashcardCounts
   ↓
10. Service → Mapper: toPagedResponse(page, flashcardCounts)
   ↓
11. Mapper → Service: PagedDeckResponse
   ↓
12. Service → Controller: PagedDeckResponse
   ↓
13. Controller → Client: 200 OK + JSON response
```

### 5.2. Get Single Deck - GET /api/decks/{deckId}

```
1. Client → Controller: GET /api/decks/{deckId}
   ↓
2. Controller: Extract userId from Authentication.getPrincipal()
   ↓
3. Controller → Service: getDeckById(deckId, userId)
   ↓
4. Service → Repository: findByIdAndUserId(deckId, userId)
   ↓
5. Repository → Database: SELECT * FROM decks WHERE id = ? AND user_id = ?
   ↓
6. Database → Repository: Optional<DeckEntity>
   ↓
7. Service: Check if deck exists
   - If empty → throw DeckNotFoundException
   ↓
8. Service → FlashcardRepository: countByDeckId(deckId)
   ↓
9. FlashcardRepository → Database: SELECT COUNT(*) FROM flashcards WHERE deck_id = ?
   ↓
10. Database → Service: int flashcardCount
   ↓
11. Service → Mapper: toResponse(entity, flashcardCount)
   ↓
12. Mapper → Service: DeckResponse
   ↓
13. Service → Controller: DeckResponse
   ↓
14. Controller → Client: 200 OK + JSON response
```

### 5.3. Create New Deck - POST /api/decks

```
1. Client → Controller: POST /api/decks + JSON body
   ↓
2. Controller: @Valid triggers validation on CreateDeckRequest
   - If validation fails → throw MethodArgumentNotValidException (400)
   ↓
3. Controller: Extract userId from Authentication.getPrincipal()
   ↓
4. Controller → Service: createDeck(request, userId)
   ↓
5. Service: Trim deck name
   ↓
6. Service: Validate trimmed name length > 0
   - If empty after trim → throw IllegalArgumentException (400)
   ↓
7. Service → Repository: existsByUserIdAndName(userId, trimmedName)
   ↓
8. Repository → Database: SELECT EXISTS(SELECT 1 FROM decks WHERE user_id = ? AND name = ?)
   ↓
9. Database → Service: boolean exists
   ↓
10. Service: Check uniqueness
   - If exists → throw DeckAlreadyExistsException (409)
   ↓
11. Service: Create new DeckEntity with userId and trimmedName
   ↓
12. Service → Repository: save(deckEntity)
   ↓
13. Repository → Database: INSERT INTO decks (id, user_id, name, created_at, updated_at) VALUES (...)
   ↓
14. Database → Repository: DeckEntity (with generated id and timestamps)
   ↓
15. Service → Mapper: toResponse(entity, 0)
   ↓
16. Mapper → Service: DeckResponse
   ↓
17. Service → Controller: DeckResponse
   ↓
18. Controller → Client: 201 Created + JSON response + Location header
```

### 5.4. Update Deck - PUT /api/decks/{deckId}

```
1. Client → Controller: PUT /api/decks/{deckId} + JSON body
   ↓
2. Controller: @Valid triggers validation on UpdateDeckRequest
   - If validation fails → throw MethodArgumentNotValidException (400)
   ↓
3. Controller: Extract userId from Authentication.getPrincipal()
   ↓
4. Controller → Service: updateDeck(deckId, request, userId)
   ↓
5. Service → Repository: findByIdAndUserId(deckId, userId)
   ↓
6. Repository → Database: SELECT * FROM decks WHERE id = ? AND user_id = ?
   ↓
7. Database → Repository: Optional<DeckEntity>
   ↓
8. Service: Check if deck exists
   - If empty → throw DeckNotFoundException (404)
   ↓
9. Service: Trim new deck name
   ↓
10. Service: Validate trimmed name length > 0
   - If empty after trim → throw IllegalArgumentException (400)
   ↓
11. Service: Check if name is different from current name
   - If same → skip uniqueness check
   ↓
12. Service → Repository: existsByUserIdAndName(userId, trimmedName)
   ↓
13. Repository → Database: SELECT EXISTS(SELECT 1 FROM decks WHERE user_id = ? AND name = ? AND id != ?)
   ↓
14. Database → Service: boolean exists
   ↓
15. Service: Check uniqueness
   - If exists → throw DeckAlreadyExistsException (409)
   ↓
16. Service: Update deck entity name (updatedAt auto-updated by @UpdateTimestamp)
   ↓
17. Service → Repository: save(deckEntity)
   ↓
18. Repository → Database: UPDATE decks SET name = ?, updated_at = ? WHERE id = ?
   ↓
19. Database → Repository: DeckEntity (updated)
   ↓
20. Service → FlashcardRepository: countByDeckId(deckId)
   ↓
21. FlashcardRepository → Database: SELECT COUNT(*) FROM flashcards WHERE deck_id = ?
   ↓
22. Database → Service: int flashcardCount
   ↓
23. Service → Mapper: toResponse(entity, flashcardCount)
   ↓
24. Mapper → Service: DeckResponse
   ↓
25. Service → Controller: DeckResponse
   ↓
26. Controller → Client: 200 OK + JSON response
```

### 5.5. Delete Deck - DELETE /api/decks/{deckId}

```
1. Client → Controller: DELETE /api/decks/{deckId}
   ↓
2. Controller: Extract userId from Authentication.getPrincipal()
   ↓
3. Controller → Service: deleteDeck(deckId, userId)
   ↓
4. Service → Repository: findByIdAndUserId(deckId, userId)
   ↓
5. Repository → Database: SELECT * FROM decks WHERE id = ? AND user_id = ?
   ↓
6. Database → Repository: Optional<DeckEntity>
   ↓
7. Service: Check if deck exists
   - If empty → throw DeckNotFoundException (404)
   ↓
8. Service → Repository: delete(deckEntity)
   ↓
9. Repository → Database: DELETE FROM decks WHERE id = ?
   ↓
10. Database: CASCADE automatically deletes flashcards
    → DELETE FROM flashcards WHERE deck_id = ?
   ↓
11. Database: SET NULL on ai_generations
    → UPDATE ai_generations SET deck_id = NULL WHERE deck_id = ?
   ↓
12. Database → Repository: void (success)
   ↓
13. Service → Controller: void
   ↓
14. Controller → Client: 204 No Content
```

## 6. Względy bezpieczeństwa

### 6.1. Uwierzytelnianie (Authentication)

**Mechanizm:**
- Wszystkie endpointy wymagają JWT token w nagłówku `Authorization: Bearer {token}`
- Spring Security Filter (`JwtAuthenticationFilter`) waliduje token przed dotarciem do kontrolera
- Jeśli token jest nieprawidłowy, wygasły lub brakuje - filtr zwraca 401 Unauthorized
- Prawidłowy token jest parsowany i ID użytkownika jest ekstrahowane do `Authentication.getPrincipal()`

**Implementacja w kontrolerze:**
```java
public ResponseEntity<DeckResponse> getDeck(
    @PathVariable UUID deckId,
    Authentication authentication
) {
    UUID userId = (UUID) authentication.getPrincipal();
    // ...
}
```

### 6.2. Autoryzacja (Authorization)

**Weryfikacja własności zasobów:**
- Wszystkie operacje (GET, PUT, DELETE pojedynczej talii) weryfikują czy talia należy do użytkownika
- Repository używa metody `findByIdAndUserId()` która automatycznie filtruje po userId
- Jeśli talia nie została znaleziona (`Optional.empty()`), nie rozróżniamy czy to dlatego że nie istnieje czy należy do innego użytkownika
- **Decyzja projektowa:** Zwracamy 404 Not Found zamiast 403 Forbidden aby nie ujawniać istnienia zasobów innych użytkowników

**Alternatywne podejście (bardziej eksplicytne):**
- Można najpierw sprawdzić `findById(deckId)` - jeśli istnieje ale user_id się nie zgadza → 403 Forbidden
- Jeśli nie istnieje → 404 Not Found
- **Rekomendacja:** Używamy prostszego podejścia (zawsze 404) dla MVP, aby nie ujawniać informacji o zasobach

**Izolacja danych:**
- Listowanie talii (`GET /api/decks`) automatycznie filtruje po userId
- Użytkownik nigdy nie widzi talii innych użytkowników
- Foreign key constraints w bazie danych zapewniają integralność

### 6.3. Walidacja danych wejściowych

**Walidacja na poziomie DTO:**
```java
public record CreateDeckRequest(
    @NotBlank(message = "Deck name cannot be blank")
    @Size(max = 100, message = "Deck name cannot exceed 100 characters")
    String name
) {}
```

**Walidacja na poziomie serwisu:**
- Trimowanie nazwy: `String trimmedName = request.name().trim()`
- Sprawdzenie długości po trimowaniu: `if (trimmedName.isEmpty()) throw new IllegalArgumentException()`
- Sprawdzenie unikalności: `existsByUserIdAndName(userId, trimmedName)`

**Ochrona przed atakami:**
- **SQL Injection:** JPA używa prepared statements automatycznie
- **XSS:** Frontend odpowiada za proper escaping przy wyświetlaniu
- **Whitespace attacks:** Trimowanie nazwy przed zapisem
- **DoS przez długie nazwy:** Limit 100 znaków wymuszony walidacją
- **Parameter tampering:** UUID uniemożliwia enumerację zasobów

### 6.4. Headers bezpieczeństwa

**Wymagane headers w żądaniu:**
- `Authorization: Bearer {jwt-token}` - dla wszystkich endpointów
- `Content-Type: application/json` - dla POST i PUT

**Headers w odpowiedzi:**
- `Content-Type: application/json` - dla 200, 201, 4xx
- `Location: /api/decks/{deckId}` - dla 201 Created
- Security headers (konfiguracja Spring Security):
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains` (tylko HTTPS)

### 6.5. Rate Limiting

**Dla MVP:** Brak dedykowanego rate limiting dla endpointów Deck Management (niskie ryzyko abuse)

**Przyszłe rozszerzenia:**
- Limit tworzenia talii: np. 50 talii na użytkownika
- Limit żądań: np. 100 żądań/minutę per użytkownika (token bucket algorithm)
- Implementacja przez Spring Boot Actuator + Redis lub Bucket4j

## 7. Obsługa błędów

### 7.1. Macierz błędów i kodów statusu

| Endpoint | Scenariusz błędu | Exception | HTTP Status | Przykładowy komunikat |
|----------|------------------|-----------|-------------|----------------------|
| GET /api/decks | Brak/nieprawidłowy token | - | 401 | "Invalid or missing authentication token" |
| GET /api/decks/{deckId} | Brak/nieprawidłowy token | - | 401 | "Invalid or missing authentication token" |
| GET /api/decks/{deckId} | Talia nie istnieje lub należy do innego użytkownika | `DeckNotFoundException` | 404 | "Deck not found with id: {deckId}" |
| POST /api/decks | Brak/nieprawidłowy token | - | 401 | "Invalid or missing authentication token" |
| POST /api/decks | Pusta nazwa (po trimowaniu) | `IllegalArgumentException` | 400 | "Deck name cannot be empty after trimming" |
| POST /api/decks | Nazwa przekracza 100 znaków | `MethodArgumentNotValidException` | 400 | "name: Deck name cannot exceed 100 characters" |
| POST /api/decks | Nazwa nie może być pusta | `MethodArgumentNotValidException` | 400 | "name: Deck name cannot be blank" |
| POST /api/decks | Talia o tej nazwie już istnieje | `DeckAlreadyExistsException` | 409 | "Deck with name '{name}' already exists" |
| PUT /api/decks/{deckId} | Brak/nieprawidłowy token | - | 401 | "Invalid or missing authentication token" |
| PUT /api/decks/{deckId} | Talia nie istnieje lub należy do innego użytkownika | `DeckNotFoundException` | 404 | "Deck not found with id: {deckId}" |
| PUT /api/decks/{deckId} | Pusta nazwa (po trimowaniu) | `IllegalArgumentException` | 400 | "Deck name cannot be empty after trimming" |
| PUT /api/decks/{deckId} | Nazwa przekracza 100 znaków | `MethodArgumentNotValidException` | 400 | "name: Deck name cannot exceed 100 characters" |
| PUT /api/decks/{deckId} | Inna talia o tej nazwie już istnieje | `DeckAlreadyExistsException` | 409 | "Deck with name '{name}' already exists" |
| DELETE /api/decks/{deckId} | Brak/nieprawidłowy token | - | 401 | "Invalid or missing authentication token" |
| DELETE /api/decks/{deckId} | Talia nie istnieje lub należy do innego użytkownika | `DeckNotFoundException` | 404 | "Deck not found with id: {deckId}" |
| Wszystkie | Niespodziewany błąd serwera | `Exception` | 500 | "An unexpected error occurred" |

### 7.2. Implementacja exception handlers

**Rozszerzenie GlobalExceptionHandler:**

```java
@ExceptionHandler(DeckNotFoundException.class)
public ResponseEntity<ErrorResponse> handleDeckNotFound(
    DeckNotFoundException ex, 
    HttpServletRequest request
) {
    ErrorResponse error = new ErrorResponse(
        Instant.now(),
        HttpStatus.NOT_FOUND.value(),
        "Not Found",
        ex.getMessage(),
        request.getRequestURI()
    );
    
    log.warn("Deck not found: {}", ex.getMessage());
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
}

@ExceptionHandler(DeckAlreadyExistsException.class)
public ResponseEntity<ErrorResponse> handleDeckAlreadyExists(
    DeckAlreadyExistsException ex,
    HttpServletRequest request
) {
    ErrorResponse error = new ErrorResponse(
        Instant.now(),
        HttpStatus.CONFLICT.value(),
        "Conflict",
        ex.getMessage(),
        request.getRequestURI()
    );
    
    log.warn("Deck already exists: {}", ex.getMessage());
    return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
}

@ExceptionHandler(IllegalArgumentException.class)
public ResponseEntity<ErrorResponse> handleIllegalArgument(
    IllegalArgumentException ex,
    HttpServletRequest request
) {
    ErrorResponse error = new ErrorResponse(
        Instant.now(),
        HttpStatus.BAD_REQUEST.value(),
        "Bad Request",
        ex.getMessage(),
        request.getRequestURI()
    );
    
    log.warn("Invalid argument: {}", ex.getMessage());
    return ResponseEntity.badRequest().body(error);
}
```

### 7.3. Logowanie błędów

**Poziomy logowania:**
- **DEBUG:** Szczegóły żądań (userId, deckId) - tylko w developmencie
- **INFO:** Udane operacje (deck created, updated, deleted)
- **WARN:** Błędy biznesowe (deck not found, already exists, validation failed)
- **ERROR:** Niespodziewane błędy techniczne (database errors, unexpected exceptions)

**Przykłady logów:**
```java
log.debug("Creating deck for user: {}, name: {}", userId, request.name());
log.info("Deck created successfully: deckId={}, userId={}", deckId, userId);
log.warn("Deck not found: deckId={}, userId={}", deckId, userId);
log.error("Unexpected error while creating deck", exception);
```

### 7.4. Consistent Error Response

Wszystkie błędy zwracają `ErrorResponse` zgodny z formatem:
```java
public record ErrorResponse(
    Instant timestamp,
    int status,
    String error,
    String message,
    String path
) {}
```

**Przykład:**
```json
{
  "timestamp": "2025-01-20T14:30:00Z",
  "status": 409,
  "error": "Conflict",
  "message": "Deck with name 'Biology 101' already exists",
  "path": "/api/decks"
}
```

## 8. Wydajność

### 8.1. Optymalizacje zapytań do bazy danych

**Istniejące indeksy (z db-plan.md):**
```sql
-- Automatyczne (primary key i unique constraints)
CREATE INDEX decks_pkey ON decks(id);
CREATE UNIQUE INDEX decks_user_id_name_key ON decks(user_id, name);

-- Indeksy na foreign keys
CREATE INDEX idx_decks_user_id ON decks(user_id);
CREATE INDEX idx_flashcards_deck_id ON flashcards(deck_id);

-- Indeksy chronologiczne
CREATE INDEX idx_decks_created_at ON decks(created_at DESC);
```

**Wykorzystanie indeksów:**
- `findByUserIdOrderByCreatedAtDesc()` → używa `idx_decks_user_id` + `idx_decks_created_at`
- `findByIdAndUserId()` → używa `decks_pkey` + `idx_decks_user_id`
- `existsByUserIdAndName()` → używa `decks_user_id_name_key` (composite unique index)
- `countByDeckId()` w FlashcardRepository → używa `idx_flashcards_deck_id`

**Złożoność zapytań:**
- Pobieranie pojedynczej talii: O(1) - lookup po primary key
- Listowanie talii: O(log n) - index scan + sorting
- Sprawdzanie unikalności: O(1) - unique index lookup
- Liczenie fiszek: O(log n) - index scan + count

### 8.2. Paginacja i limitowanie wyników

**Konfiguracja paginacji:**
```java
// W kontrolerze
@GetMapping
public ResponseEntity<PagedDeckResponse> getAllDecks(
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size,
    @RequestParam(defaultValue = "createdAt,desc") String sort,
    Authentication authentication
) {
    // Limit maksymalnego rozmiaru strony
    size = Math.min(size, 100);
    
    Sort.Direction direction = Sort.Direction.DESC;
    String sortField = "createdAt";
    
    // Parsowanie sort parameter
    if (sort.contains(",")) {
        String[] sortParts = sort.split(",");
        sortField = sortParts[0];
        direction = sortParts[1].equalsIgnoreCase("asc") 
            ? Sort.Direction.ASC 
            : Sort.Direction.DESC;
    }
    
    Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortField));
    // ...
}
```

**Optymalizacja liczenia fiszek:**
- Dla listy talii: pojedyncze zapytanie z GROUP BY zamiast N zapytań
```java
// W FlashcardRepository
@Query("SELECT f.deck.id, COUNT(f) FROM FlashcardEntity f WHERE f.deck.id IN :deckIds GROUP BY f.deck.id")
Map<UUID, Long> countByDeckIds(@Param("deckIds") List<UUID> deckIds);
```

### 8.3. N+1 Problem Prevention

**Problem:** Pobieranie fiszek dla każdej talii osobno (N+1 queries)

**Rozwiązanie:**
1. Pobierz Page<DeckEntity> (1 zapytanie)
2. Wyciągnij wszystkie deckIds z page.getContent()
3. Wykonaj jedno grupowane zapytanie: `countByDeckIds(deckIds)` (1 zapytanie)
4. Zmapuj wyniki do Map<UUID, Integer>
5. Przy tworzeniu DeckResponse pobieraj count z mapy

**Implementacja w serwisie:**
```java
@Transactional(readOnly = true)
public PagedDeckResponse getAllDecks(UUID userId, Pageable pageable) {
    Page<DeckEntity> page = deckRepository.findByUserId(userId, pageable);
    
    if (page.isEmpty()) {
        return new PagedDeckResponse(List.of(), createPageInfo(page));
    }
    
    // Extract deck IDs
    List<UUID> deckIds = page.getContent().stream()
        .map(DeckEntity::getId)
        .toList();
    
    // Single query for all flashcard counts
    Map<UUID, Integer> flashcardCounts = flashcardRepository.countByDeckIds(deckIds);
    
    // Map to DTOs
    return deckMapper.toPagedResponse(page, flashcardCounts);
}
```

**Wynik:** 2 zapytania zamiast N+1 (gdzie N = liczba talii na stronie)

### 8.4. Caching Strategy

**Dla MVP:** Brak cachowania (keep it simple)

**Przyszłe optymalizacje:**
- Cache profilu użytkownika (user info, AI limits) - Redis, TTL 5 minut
- Cache liczby fiszek w talii - unieważnienie przy CREATE/DELETE fiszki
- Spring Cache abstraction: `@Cacheable`, `@CacheEvict`

**Potencjalna implementacja:**
```java
@Cacheable(value = "deckFlashcardCount", key = "#deckId")
public int getFlashcardCount(UUID deckId) {
    return flashcardRepository.countByDeckId(deckId);
}

@CacheEvict(value = "deckFlashcardCount", key = "#deckId")
public void invalidateFlashcardCount(UUID deckId) {
    // Called after flashcard CREATE/DELETE
}
```

### 8.5. Connection Pooling

**Konfiguracja HikariCP w application.properties:**
```properties
spring.datasource.hikari.maximum-pool-size=10
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.connection-timeout=30000
spring.datasource.hikari.idle-timeout=600000
spring.datasource.hikari.max-lifetime=1800000
```

**Dla MVP:** Domyślne ustawienia Spring Boot są wystarczające

### 8.6. Metryki wydajności

**Kluczowe metryki do monitorowania:**
- Czas odpowiedzi endpointów (p50, p95, p99)
- Liczba zapytań do bazy danych per endpoint
- Connection pool utilization
- Rozmiar stron w paginacji (średnia, max)

**Narzędzia:**
- Spring Boot Actuator: `/actuator/metrics`
- Hibernate statistics: `spring.jpa.properties.hibernate.generate_statistics=true`
- Application Performance Monitoring (APM): np. New Relic, DataDog

## 9. Etapy wdrożenia

### 9.1. Przygotowanie struktury (Faza 1)

**Krok 1.1:** Utworzenie pakietów
```
src/main/java/pl/olesek/_xcards/deck/
├── controller/
│   └── DeckController.java
├── service/
│   └── DeckService.java
├── dto/
│   ├── CreateDeckRequest.java
│   ├── UpdateDeckRequest.java
│   ├── DeckResponse.java
│   ├── PagedDeckResponse.java
│   └── PageInfo.java
├── mapper/
│   └── DeckMapper.java
├── exception/
│   ├── DeckNotFoundException.java
│   ├── DeckAccessDeniedException.java
│   └── DeckAlreadyExistsException.java
├── DeckEntity.java (już istnieje)
└── DeckRepository.java (już istnieje)
```

**Krok 1.2:** Rozszerzenie DeckRepository
- Dodać metodę: `Page<DeckEntity> findByUserId(UUID userId, Pageable pageable)`
- Dodać metodę: `boolean existsByUserIdAndNameAndIdNot(UUID userId, String name, UUID id)` (dla UPDATE)

**Krok 1.3:** Utworzenie FlashcardRepository extension (jeśli nie istnieje)
- Dodać metodę: `int countByDeckId(UUID deckId)`
- Dodać metodę: `Map<UUID, Integer> countByDeckIds(List<UUID> deckIds)` (z @Query)

### 9.2. Implementacja warstwy DTOs i Exceptions (Faza 2)

**Krok 2.1:** Utworzenie Request DTOs
- `CreateDeckRequest` - z walidacją @NotBlank, @Size(max=100)
- `UpdateDeckRequest` - z walidacją @NotBlank, @Size(max=100)

**Krok 2.2:** Utworzenie Response DTOs
- `DeckResponse` - record z polami: id, name, flashcardCount, createdAt, updatedAt
- `PageInfo` - record z polami: number, size, totalElements, totalPages
- `PagedDeckResponse` - record z polami: content (List<DeckResponse>), page (PageInfo)

**Krok 2.3:** Utworzenie Custom Exceptions
- `DeckNotFoundException` - extends RuntimeException
- `DeckAccessDeniedException` - extends RuntimeException (opcjonalne, jeśli chcemy rozróżniać 403 i 404)
- `DeckAlreadyExistsException` - extends RuntimeException

**Krok 2.4:** Rozszerzenie GlobalExceptionHandler
- Dodać @ExceptionHandler dla DeckNotFoundException → 404
- Dodać @ExceptionHandler dla DeckAlreadyExistsException → 409
- Dodać @ExceptionHandler dla IllegalArgumentException → 400 (dla pustej nazwy po trimowaniu)

### 9.3. Implementacja Mappera (Faza 3)

**Krok 3.1:** Utworzenie DeckMapper
- Metoda: `DeckResponse toResponse(DeckEntity entity, int flashcardCount)`
- Metoda: `PagedDeckResponse toPagedResponse(Page<DeckEntity> page, Map<UUID, Integer> flashcardCounts)`
- Adnotacja: @Component

### 9.4. Implementacja Service Layer (Faza 4)

**Krok 4.1:** Utworzenie DeckService
- Adnotacje: @Service, @RequiredArgsConstructor, @Slf4j
- Dependency injection: DeckRepository, FlashcardRepository, DeckMapper

**Krok 4.2:** Implementacja getAllDecks()
```java
@Transactional(readOnly = true)
public PagedDeckResponse getAllDecks(UUID userId, Pageable pageable) {
    log.debug("Fetching decks for user: {}, page: {}", userId, pageable.getPageNumber());
    
    Page<DeckEntity> page = deckRepository.findByUserId(userId, pageable);
    
    if (page.isEmpty()) {
        log.debug("No decks found for user: {}", userId);
        return createEmptyPagedResponse(page);
    }
    
    List<UUID> deckIds = page.getContent().stream()
        .map(DeckEntity::getId)
        .toList();
    
    Map<UUID, Integer> flashcardCounts = flashcardRepository.countByDeckIds(deckIds);
    
    log.debug("Found {} decks for user: {}", page.getTotalElements(), userId);
    return deckMapper.toPagedResponse(page, flashcardCounts);
}
```

**Krok 4.3:** Implementacja getDeckById()
```java
@Transactional(readOnly = true)
public DeckResponse getDeckById(UUID deckId, UUID userId) {
    log.debug("Fetching deck: {} for user: {}", deckId, userId);
    
    DeckEntity deck = deckRepository.findByIdAndUserId(deckId, userId)
        .orElseThrow(() -> new DeckNotFoundException(
            "Deck not found with id: " + deckId
        ));
    
    int flashcardCount = flashcardRepository.countByDeckId(deckId);
    
    log.debug("Deck found: {}, flashcardCount: {}", deckId, flashcardCount);
    return deckMapper.toResponse(deck, flashcardCount);
}
```

**Krok 4.4:** Implementacja createDeck()
```java
@Transactional
public DeckResponse createDeck(CreateDeckRequest request, UUID userId) {
    String trimmedName = request.name().trim();
    
    log.debug("Creating deck for user: {}, name: {}", userId, trimmedName);
    
    if (trimmedName.isEmpty()) {
        throw new IllegalArgumentException("Deck name cannot be empty after trimming");
    }
    
    if (deckRepository.existsByUserIdAndName(userId, trimmedName)) {
        throw new DeckAlreadyExistsException(
            "Deck with name '" + trimmedName + "' already exists"
        );
    }
    
    DeckEntity deck = new DeckEntity();
    deck.setUser(userRepository.getReferenceById(userId)); // lazy reference
    deck.setName(trimmedName);
    
    DeckEntity savedDeck = deckRepository.save(deck);
    
    log.info("Deck created successfully: deckId={}, userId={}", savedDeck.getId(), userId);
    return deckMapper.toResponse(savedDeck, 0);
}
```

**Krok 4.5:** Implementacja updateDeck()
```java
@Transactional
public DeckResponse updateDeck(UUID deckId, UpdateDeckRequest request, UUID userId) {
    log.debug("Updating deck: {} for user: {}", deckId, userId);
    
    DeckEntity deck = deckRepository.findByIdAndUserId(deckId, userId)
        .orElseThrow(() -> new DeckNotFoundException(
            "Deck not found with id: " + deckId
        ));
    
    String trimmedName = request.name().trim();
    
    if (trimmedName.isEmpty()) {
        throw new IllegalArgumentException("Deck name cannot be empty after trimming");
    }
    
    // Check uniqueness only if name is changing
    if (!deck.getName().equals(trimmedName)) {
        if (deckRepository.existsByUserIdAndNameAndIdNot(userId, trimmedName, deckId)) {
            throw new DeckAlreadyExistsException(
                "Deck with name '" + trimmedName + "' already exists"
            );
        }
        deck.setName(trimmedName);
    }
    
    DeckEntity updatedDeck = deckRepository.save(deck);
    int flashcardCount = flashcardRepository.countByDeckId(deckId);
    
    log.info("Deck updated successfully: deckId={}, userId={}", deckId, userId);
    return deckMapper.toResponse(updatedDeck, flashcardCount);
}
```

**Krok 4.6:** Implementacja deleteDeck()
```java
@Transactional
public void deleteDeck(UUID deckId, UUID userId) {
    log.debug("Deleting deck: {} for user: {}", deckId, userId);
    
    DeckEntity deck = deckRepository.findByIdAndUserId(deckId, userId)
        .orElseThrow(() -> new DeckNotFoundException(
            "Deck not found with id: " + deckId
        ));
    
    deckRepository.delete(deck);
    
    log.info("Deck deleted successfully: deckId={}, userId={}", deckId, userId);
}
```

### 9.5. Implementacja Controller Layer (Faza 5)

**Krok 5.1:** Utworzenie DeckController
```java
@RestController
@RequestMapping("/api/decks")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Decks", description = "Deck management endpoints")
public class DeckController {
    
    private final DeckService deckService;
    
    // Endpoints implementation
}
```

**Krok 5.2:** Implementacja GET /api/decks
```java
@GetMapping
@Operation(
    summary = "List user's decks",
    description = "Get all decks owned by authenticated user with pagination",
    security = @SecurityRequirement(name = "bearer-jwt")
)
@ApiResponses(value = {
    @ApiResponse(responseCode = "200", description = "Decks retrieved successfully"),
    @ApiResponse(responseCode = "401", description = "Unauthorized")
})
public ResponseEntity<PagedDeckResponse> getAllDecks(
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size,
    @RequestParam(defaultValue = "createdAt,desc") String sort,
    Authentication authentication
) {
    UUID userId = (UUID) authentication.getPrincipal();
    log.debug("GET /api/decks - userId: {}, page: {}, size: {}", userId, page, size);
    
    // Limit maximum page size
    size = Math.min(size, 100);
    
    Pageable pageable = createPageable(page, size, sort);
    PagedDeckResponse response = deckService.getAllDecks(userId, pageable);
    
    return ResponseEntity.ok(response);
}

private Pageable createPageable(int page, int size, String sort) {
    Sort.Direction direction = Sort.Direction.DESC;
    String sortField = "createdAt";
    
    if (sort.contains(",")) {
        String[] sortParts = sort.split(",");
        sortField = sortParts[0];
        direction = sortParts[1].equalsIgnoreCase("asc") 
            ? Sort.Direction.ASC 
            : Sort.Direction.DESC;
    }
    
    return PageRequest.of(page, size, Sort.by(direction, sortField));
}
```

**Krok 5.3:** Implementacja GET /api/decks/{deckId}
```java
@GetMapping("/{deckId}")
@Operation(
    summary = "Get single deck",
    description = "Get details of a specific deck",
    security = @SecurityRequirement(name = "bearer-jwt")
)
@ApiResponses(value = {
    @ApiResponse(responseCode = "200", description = "Deck retrieved successfully"),
    @ApiResponse(responseCode = "401", description = "Unauthorized"),
    @ApiResponse(responseCode = "404", description = "Deck not found")
})
public ResponseEntity<DeckResponse> getDeck(
    @PathVariable UUID deckId,
    Authentication authentication
) {
    UUID userId = (UUID) authentication.getPrincipal();
    log.debug("GET /api/decks/{} - userId: {}", deckId, userId);
    
    DeckResponse response = deckService.getDeckById(deckId, userId);
    return ResponseEntity.ok(response);
}
```

**Krok 5.4:** Implementacja POST /api/decks
```java
@PostMapping
@Operation(
    summary = "Create new deck",
    description = "Create a new deck for authenticated user",
    security = @SecurityRequirement(name = "bearer-jwt")
)
@ApiResponses(value = {
    @ApiResponse(responseCode = "201", description = "Deck created successfully"),
    @ApiResponse(responseCode = "400", description = "Invalid input"),
    @ApiResponse(responseCode = "401", description = "Unauthorized"),
    @ApiResponse(responseCode = "409", description = "Deck with this name already exists")
})
public ResponseEntity<DeckResponse> createDeck(
    @Valid @RequestBody CreateDeckRequest request,
    Authentication authentication
) {
    UUID userId = (UUID) authentication.getPrincipal();
    log.debug("POST /api/decks - userId: {}, name: {}", userId, request.name());
    
    DeckResponse response = deckService.createDeck(request, userId);
    
    URI location = URI.create("/api/decks/" + response.id());
    return ResponseEntity.created(location).body(response);
}
```

**Krok 5.5:** Implementacja PUT /api/decks/{deckId}
```java
@PutMapping("/{deckId}")
@Operation(
    summary = "Update deck",
    description = "Update deck name",
    security = @SecurityRequirement(name = "bearer-jwt")
)
@ApiResponses(value = {
    @ApiResponse(responseCode = "200", description = "Deck updated successfully"),
    @ApiResponse(responseCode = "400", description = "Invalid input"),
    @ApiResponse(responseCode = "401", description = "Unauthorized"),
    @ApiResponse(responseCode = "404", description = "Deck not found"),
    @ApiResponse(responseCode = "409", description = "Another deck with this name already exists")
})
public ResponseEntity<DeckResponse> updateDeck(
    @PathVariable UUID deckId,
    @Valid @RequestBody UpdateDeckRequest request,
    Authentication authentication
) {
    UUID userId = (UUID) authentication.getPrincipal();
    log.debug("PUT /api/decks/{} - userId: {}, name: {}", deckId, userId, request.name());
    
    DeckResponse response = deckService.updateDeck(deckId, request, userId);
    return ResponseEntity.ok(response);
}
```

**Krok 5.6:** Implementacja DELETE /api/decks/{deckId}
```java
@DeleteMapping("/{deckId}")
@Operation(
    summary = "Delete deck",
    description = "Delete deck and all associated flashcards",
    security = @SecurityRequirement(name = "bearer-jwt")
)
@ApiResponses(value = {
    @ApiResponse(responseCode = "204", description = "Deck deleted successfully"),
    @ApiResponse(responseCode = "401", description = "Unauthorized"),
    @ApiResponse(responseCode = "404", description = "Deck not found")
})
public ResponseEntity<Void> deleteDeck(
    @PathVariable UUID deckId,
    Authentication authentication
) {
    UUID userId = (UUID) authentication.getPrincipal();
    log.debug("DELETE /api/decks/{} - userId: {}", deckId, userId);
    
    deckService.deleteDeck(deckId, userId);
    return ResponseEntity.noContent().build();
}
```

### 9.6. Testowanie (Faza 6)

**Krok 6.1:** Unit testy dla DeckService
- Test getAllDecks() - zwraca paginowaną listę
- Test getAllDecks() - zwraca pustą listę dla użytkownika bez talii
- Test getDeckById() - zwraca talie
- Test getDeckById() - rzuca DeckNotFoundException gdy nie znaleziono
- Test createDeck() - tworzy talie pomyślnie
- Test createDeck() - rzuca DeckAlreadyExistsException przy duplikacie
- Test createDeck() - rzuca IllegalArgumentException dla pustej nazwy
- Test updateDeck() - aktualizuje nazwę
- Test updateDeck() - rzuca DeckNotFoundException gdy nie znaleziono
- Test updateDeck() - rzuca DeckAlreadyExistsException przy konflikcie nazwy
- Test deleteDeck() - usuwa talie
- Test deleteDeck() - rzuca DeckNotFoundException gdy nie znaleziono

**Krok 6.2:** Integration testy dla DeckController
- Test GET /api/decks - 200 OK z listą talii
- Test GET /api/decks - 200 OK z pustą listą
- Test GET /api/decks - 401 Unauthorized bez tokenu
- Test GET /api/decks/{deckId} - 200 OK
- Test GET /api/decks/{deckId} - 404 Not Found
- Test POST /api/decks - 201 Created
- Test POST /api/decks - 400 Bad Request (pusta nazwa)
- Test POST /api/decks - 409 Conflict (duplikat)
- Test PUT /api/decks/{deckId} - 200 OK
- Test PUT /api/decks/{deckId} - 404 Not Found
- Test PUT /api/decks/{deckId} - 409 Conflict
- Test DELETE /api/decks/{deckId} - 204 No Content
- Test DELETE /api/decks/{deckId} - 404 Not Found

**Krok 6.3:** Testowanie manualne
- Testowanie przez Swagger UI: `/swagger-ui.html`
- Testowanie przez Postman/Insomnia z rzeczywistymi tokenami JWT
- Weryfikacja CASCADE deletion - sprawdzenie czy fiszki są usuwane

### 9.7. Dokumentacja OpenAPI (Faza 7)

**Krok 7.1:** Weryfikacja adnotacji OpenAPI
- Sprawdzenie czy wszystkie endpointy mają @Operation
- Sprawdzenie czy wszystkie kody odpowiedzi są udokumentowane w @ApiResponses
- Sprawdzenie czy security requirement jest dodany: @SecurityRequirement(name = "bearer-jwt")

**Krok 7.2:** Aktualizacja OpenApiConfig (jeśli potrzebne)
- Dodanie opisu dla Deck Management w Tag description
- Weryfikacja czy Bearer JWT security scheme jest skonfigurowany

**Krok 7.3:** Generowanie dokumentacji
- Uruchomienie aplikacji
- Dostęp do `/v3/api-docs` - sprawdzenie JSON spec
- Dostęp do `/swagger-ui.html` - sprawdzenie interaktywnej dokumentacji

### 9.8. Deployment i Monitoring (Faza 8)

**Krok 8.1:** Code review
- Sprawdzenie czy wszystkie metody mają odpowiednie adnotacje @Transactional
- Sprawdzenie czy logowanie jest na odpowiednich poziomach
- Sprawdzenie czy walidacja jest kompletna
- Sprawdzenie czy exception handling jest spójny

**Krok 8.2:** Przygotowanie do deployment
- Uruchomienie wszystkich testów: `mvn clean test`
- Sprawdzenie pokrycia kodu testami (minimum 80%)
- Code formatting: `mvn spotless:apply`
- Build aplikacji: `mvn clean package`

**Krok 8.3:** Deployment
- Aktualizacja docker-compose.yml (jeśli potrzebne)
- Build Docker image
- Deploy na DigitalOcean

**Krok 8.4:** Monitoring po deployment
- Sprawdzenie logów aplikacji
- Monitorowanie metryk wydajności (response time, throughput)
- Sprawdzenie czy wszystkie endpointy działają poprawnie
- Monitoring błędów (Sentry, CloudWatch, lub podobne)

### 9.9. Podsumowanie kroków implementacji

**Kolejność wykonania:**
1. ✅ Przygotowanie struktury pakietów i rozszerzenie repositories
2. ✅ Implementacja DTOs (Request i Response)
3. ✅ Implementacja Custom Exceptions
4. ✅ Rozszerzenie GlobalExceptionHandler
5. ✅ Implementacja DeckMapper
6. ✅ Implementacja DeckService (logika biznesowa)
7. ✅ Implementacja DeckController (routing i I/O)
8. ✅ Dodanie adnotacji OpenAPI
9. ✅ Napisanie testów jednostkowych (Service)
10. ✅ Napisanie testów integracyjnych (Controller)
11. ✅ Testowanie manualne przez Swagger UI
12. ✅ Code review i refactoring
13. ✅ Deployment i monitoring

**Szacowany czas implementacji:**
- Fazy 1-5 (implementacja): 4-6 godzin
- Faza 6 (testy): 3-4 godziny
- Faza 7-8 (dokumentacja i deployment): 1-2 godziny
- **Razem:** 8-12 godzin (dla doświadczonego developera)

**Zależności między fazami:**
- Faza 2 → Faza 3 (DTOs potrzebne w Mapperze)
- Faza 3 → Faza 4 (Mapper potrzebny w Service)
- Faza 4 → Faza 5 (Service potrzebny w Controller)
- Fazy 1-5 → Faza 6 (implementacja przed testami)

---

## 10. Dodatkowe uwagi

### 10.1. Zgodność z istniejącą architekturą

Implementacja Deck Management API jest zgodna z istniejącymi wzorcami w projekcie:
- Używa tego samego mechanizmu uwierzytelniania (JWT via Authentication.getPrincipal())
- Używa tego samego formatu błędów (ErrorResponse record)
- Używa tego samego stylu kontrolerów (OpenAPI annotations, constructor injection)
- Używa tych samych konwencji logowania (Slf4j)

### 10.2. Rozszerzalność

Architektura pozwala na łatwe rozszerzenie w przyszłości:
- **Współdzielenie talii:** Dodanie tabeli `deck_shares` i logiki sprawdzania uprawnień
- **Tagi/kategorie:** Dodanie pola `category` w DeckEntity
- **Import/Export:** Nowe endpointy wykorzystujące istniejący DeckService
- **Statystyki:** Agregacja danych z DeckRepository i FlashcardRepository

### 10.3. Bezpieczeństwo produkcyjne

Przed wdrożeniem produkcyjnym należy:
- Włączyć HTTPS (certyfikat SSL/TLS)
- Skonfigurować CORS policy (whitelist dozwolonych origin)
- Włączyć rate limiting (Bucket4j lub Spring Cloud Gateway)
- Dodać monitoring i alerting (CloudWatch, Prometheus + Grafana)
- Skonfigurować automated backups bazy danych
- Włączyć audit logging dla operacji CRUD

### 10.4. Metryki sukcesu

Po wdrożeniu należy monitorować:
- **Funkcjonalność:** 
  - Error rate < 1%
  - Wszystkie endpointy odpowiadają z właściwymi kodami statusu
- **Wydajność:** 
  - p95 response time < 200ms
  - p99 response time < 500ms
- **Dostępność:** 
  - Uptime > 99.5%
  - Brak memory leaks

---

## Zakończenie

Ten plan implementacji zapewnia kompleksowe wytyczne dla zespołu programistów do wdrożenia endpointów Deck Management API. Plan uwzględnia wszystkie aspekty: od walidacji danych, przez bezpieczeństwo, wydajność, aż po szczegółowe kroki implementacji.

Implementacja tych endpointów stanowi fundament dla dalszych modułów aplikacji (Flashcard Management, AI Generation), dlatego kluczowe jest zachowanie wysokiej jakości kodu i pełnego pokrycia testami.

