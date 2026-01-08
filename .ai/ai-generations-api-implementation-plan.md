# API Endpoint Implementation Plan: AI Generations API

## Analiza

### 1. Podsumowanie specyfikacji API
System oferuje 4 endpointy REST do zarządzania generacją fiszek AI:
1. **POST /api/ai/generate** - generowanie kandydatów na fiszki z tekstu źródłowego
2. **GET /api/ai/generations/{generationId}** - pobranie sesji generacji z bieżącymi statusami kandydatów
3. **PATCH /api/ai/generations/{generationId}/candidates** - aktualizacja statusu kandydatów (accept/reject/edit)
4. **POST /api/ai/generations/{generationId}/save** - zapisanie zaakceptowanych i edytowanych kandydatów jako fiszek

### 2. Wymagane i opcjonalne parametry

**POST /api/ai/generate**
- Wymagane: `deckId` (UUID), `sourceText` (String, 500-10000 znaków)
- Opcjonalne: brak

**GET /api/ai/generations/{generationId}**
- Wymagane: `generationId` (path parameter, UUID)
- Opcjonalne: brak

**PATCH /api/ai/generations/{generationId}/candidates**
- Wymagane: `generationId` (path parameter), lista `candidates` z `id`, `status`
- Opcjonalne (warunkowe): `editedFront`, `editedBack` (wymagane gdy status="edited")

**POST /api/ai/generations/{generationId}/save**
- Wymagane: `generationId` (path parameter)
- Opcjonalne: brak

### 3. Niezbędne DTOs i Command Models

**Request DTOs:**
- `GenerateFlashcardsRequest` - request body dla POST /api/ai/generate
- `UpdateCandidatesRequest` - request body dla PATCH
- `CandidateUpdateDto` - element listy w UpdateCandidatesRequest

**Response DTOs:**
- `AIGenerationResponse` - szczegóły sesji generacji
- `CandidateDto` - pojedynczy kandydat w odpowiedzi
- `UpdateCandidatesResponse` - potwierdzenie aktualizacji
- `SaveCandidatesResponse` - wynik zapisania fiszek

### 4. Struktura Service Layer

**AIGenerationService** - główna logika biznesowa:
- `generateFlashcards()` - komunikacja z OpenRouter AI, utworzenie sesji generacji
- `getGeneration()` - pobranie sesji z weryfikacją właściciela
- `updateCandidates()` - aktualizacja statusów kandydatów w JSONB
- `saveAcceptedCandidates()` - tworzenie encji FlashcardEntity z zaakceptowanych kandydatów

**FlashcardService** - współpraca przy tworzeniu fiszek (istniejący)

**AIClientService** - komunikacja z OpenRouter API:
- `generateCandidatesFromText()` - wywołanie API OpenRouter
- Obsługa retry logic i timeoutów

### 5. Walidacja danych

**GenerateFlashcardsRequest:**
- `@NotNull` dla deckId i sourceText
- `@Size(min=500, max=10000)` dla sourceText
- Custom validator sprawdzający czy deck istnieje i należy do użytkownika

**UpdateCandidatesRequest:**
- `@NotNull @NotEmpty` dla listy candidates
- `@NotNull` dla candidate.id i candidate.status
- `@Size(min=1, max=500)` dla editedFront/editedBack gdy status="edited"
- Custom validator sprawdzający czy status jest w enum (accepted, rejected, edited)
- Walidacja: editedFront i editedBack wymagane gdy status="edited"

**Path Parameters:**
- UUID format validation przez Spring automatycznie

### 6. Rejestrowanie błędów

Błędy logowane przez `@Slf4j` w:
- **Service layer**: błędy biznesowe (deck nie znaleziony, brak uprawnień, limit AI przekroczony)
- **AIClientService**: błędy komunikacji z OpenRouter (timeout, 503, quota exceeded)
- **GlobalExceptionHandler**: wszystkie wyjątki z odpowiednimi poziomami (WARN dla biznesowych, ERROR dla technicznych)

Metryki do śledzenia:
- Liczba generacji na użytkownika (miesięczny limit)
- Czas odpowiedzi OpenRouter API
- Liczba błędów 503 od OpenRouter

### 7. Zagrożenia bezpieczeństwa

1. **Rate limiting** - POST /api/ai/generate wymaga ograniczenia (max 10 zapytań/minutę/użytkownika)
2. **Autoryzacja** - wszystkie endpointy wymagają JWT, weryfikacja userId z właścicielem deck/generation
3. **Input validation** - sanityzacja sourceText (usunięcie niebezpiecznych znaków, trim)
4. **Monthly AI limit** - sprawdzenie limitu wywołań AI na użytkownika (np. 100/miesiąc)
5. **API Key protection** - OpenRouter API key w zmiennych środowiskowych, nigdy w response
6. **JSONB injection** - używanie Jackson do serializacji/deserializacji candidates, nie raw SQL

### 8. Scenariusze błędów

**POST /api/ai/generate:**
- 400: sourceText < 500 lub > 10000 znaków
- 401: brak/nieprawidłowy JWT
- 403: deck nie należy do użytkownika LUB miesięczny limit AI przekroczony
- 404: deck nie istnieje
- 429: rate limit przekroczony (10 req/min)
- 503: OpenRouter API niedostępne lub timeout

**GET /api/ai/generations/{generationId}:**
- 401: brak/nieprawidłowy JWT
- 403: generation nie należy do użytkownika
- 404: generation nie istnieje

**PATCH /api/ai/generations/{generationId}/candidates:**
- 400: nieprawidłowy status, brak editedFront/Back gdy status="edited", candidate id nie istnieje
- 401: brak/nieprawidłowy JWT
- 403: generation nie należy do użytkownika
- 404: generation nie istnieje

**POST /api/ai/generations/{generationId}/save:**
- 400: brak kandydatów ze statusem "accepted" lub "edited"
- 401: brak/nieprawidłowy JWT
- 403: generation nie należy do użytkownika
- 404: generation nie istnieje LUB deck został usunięty

---

## Plan Implementacji

## 1. Przegląd punktów końcowych

### Cel
API do generacji fiszek przy pomocy AI (OpenRouter) z możliwością przeglądania, edycji i zatwierdzania kandydatów na fiszki.

### Funkcjonalność
- Generowanie 8-12 kandydatów na fiszki z tekstu źródłowego (500-10000 znaków)
- Przegląd sesji generacji z bieżącymi statusami kandydatów
- Aktualizacja statusów kandydatów: accepted, rejected, edited
- Zapisanie zaakceptowanych i edytowanych kandydatów jako fiszek w talii
- Śledzenie metryk: model AI, hash tekstu źródłowego, liczba kandydatów

## 2. Szczegóły żądań

### 2.1. POST /api/ai/generate

**Struktura URL:** `/api/ai/generate`

**Metoda HTTP:** POST

**Headers:** `Authorization: Bearer {token}`

**Parametry:**
- Wymagane: brak (wszystkie w body)
- Opcjonalne: brak

**Request Body:**
```json
{
  "deckId": "uuid",
  "sourceText": "string (500-10000 chars)"
}
```

### 2.2. GET /api/ai/generations/{generationId}

**Struktura URL:** `/api/ai/generations/{generationId}`

**Metoda HTTP:** GET

**Headers:** `Authorization: Bearer {token}`

**Parametry:**
- Wymagane: `generationId` (path, UUID)
- Opcjonalne: brak

**Request Body:** brak

### 2.3. PATCH /api/ai/generations/{generationId}/candidates

**Struktura URL:** `/api/ai/generations/{generationId}/candidates`

**Metoda HTTP:** PATCH

**Headers:** `Authorization: Bearer {token}`

**Parametry:**
- Wymagane: `generationId` (path, UUID)
- Opcjonalne: brak

**Request Body:**
```json
{
  "candidates": [
    {
      "id": "uuid",
      "status": "accepted|rejected|edited",
      "editedFront": "string (optional, required if status=edited)",
      "editedBack": "string (optional, required if status=edited)"
    }
  ]
}
```

### 2.4. POST /api/ai/generations/{generationId}/save

**Struktura URL:** `/api/ai/generations/{generationId}/save`

**Metoda HTTP:** POST

**Headers:** `Authorization: Bearer {token}`

**Parametry:**
- Wymagane: `generationId` (path, UUID)
- Opcjonalne: brak

**Request Body:** brak

## 3. Wykorzystywane typy

### 3.1. Request DTOs

#### GenerateFlashcardsRequest
```java
public record GenerateFlashcardsRequest(
    @NotNull(message = "Deck ID is required")
    @Schema(description = "Target deck UUID")
    UUID deckId,
    
    @NotNull(message = "Source text is required")
    @Size(min = 500, max = 10000, message = "Source text must be between 500 and 10000 characters")
    @Schema(description = "Source text for generation", example = "Photosynthesis is...")
    String sourceText
) {}
```

#### UpdateCandidatesRequest
```java
public record UpdateCandidatesRequest(
    @NotNull @NotEmpty(message = "Candidates list cannot be empty")
    @Valid
    List<CandidateUpdateDto> candidates
) {}
```

#### CandidateUpdateDto
```java
public record CandidateUpdateDto(
    @NotNull(message = "Candidate ID is required")
    UUID id,
    
    @NotNull(message = "Status is required")
    @Pattern(regexp = "accepted|rejected|edited", message = "Status must be: accepted, rejected, or edited")
    String status,
    
    @Size(max = 500, message = "Edited front cannot exceed 500 characters")
    String editedFront,
    
    @Size(max = 500, message = "Edited back cannot exceed 500 characters")
    String editedBack
) {
    // Custom validation w service: jeśli status="edited", to editedFront i editedBack wymagane
}
```

### 3.2. Response DTOs

#### AIGenerationResponse
```java
public record AIGenerationResponse(
    @Schema(description = "Generation session UUID")
    UUID id,
    
    @Schema(description = "Target deck UUID")
    UUID deckId,
    
    @Schema(description = "AI model used", example = "openai/gpt-4")
    String aiModel,
    
    @Schema(description = "SHA-256 hash of source text")
    String sourceTextHash,
    
    @Schema(description = "Length of source text")
    Integer sourceTextLength,
    
    @Schema(description = "Number of generated candidates")
    Integer generatedCandidatesCount,
    
    @Schema(description = "List of flashcard candidates")
    List<CandidateDto> candidates,
    
    @Schema(description = "Creation timestamp")
    Instant createdAt,
    
    @Schema(description = "Last update timestamp")
    Instant updatedAt
) {}
```

#### CandidateDto
```java
public record CandidateDto(
    @Schema(description = "Candidate UUID")
    UUID id,
    
    @Schema(description = "Front of flashcard")
    String front,
    
    @Schema(description = "Back of flashcard")
    String back,
    
    @Schema(description = "Status", allowableValues = {"pending", "accepted", "rejected", "edited"})
    String status,
    
    @Schema(description = "Edited front (null if not edited)", nullable = true)
    String editedFront,
    
    @Schema(description = "Edited back (null if not edited)", nullable = true)
    String editedBack
) {}
```

#### UpdateCandidatesResponse
```java
public record UpdateCandidatesResponse(
    UUID id,
    Integer updatedCandidatesCount,
    Instant updatedAt
) {}
```

#### SaveCandidatesResponse
```java
public record SaveCandidatesResponse(
    Integer savedCount,
    List<UUID> flashcardIds
) {}
```

### 3.3. Internal Models (JSONB)

#### CandidateModel (dla serializacji JSONB)
```java
public record CandidateModel(
    UUID id,
    String front,
    String back,
    String status, // "pending", "accepted", "rejected", "edited"
    String editedFront,
    String editedBack
) {}
```

## 4. Szczegóły odpowiedzi

### 4.1. POST /api/ai/generate

**Success (201 Created):**
```json
{
  "id": "uuid",
  "deckId": "uuid",
  "aiModel": "openai/gpt-4",
  "sourceTextHash": "sha256-hash",
  "sourceTextLength": 1523,
  "generatedCandidatesCount": 8,
  "candidates": [
    {
      "id": "uuid",
      "front": "What is photosynthesis?",
      "back": "The process by which plants convert light energy...",
      "status": "pending",
      "editedFront": null,
      "editedBack": null
    }
  ],
  "createdAt": "2025-01-20T13:00:00Z",
  "updatedAt": "2025-01-20T13:00:00Z"
}
```

**Errors:**
- 400: Invalid source text length
- 401: Unauthorized
- 403: Deck not owned by user / Monthly AI limit exceeded
- 404: Deck not found
- 429: Rate limit exceeded
- 503: AI service unavailable

### 4.2. GET /api/ai/generations/{generationId}

**Success (200 OK):** Identyczny jak POST response

**Errors:**
- 401: Unauthorized
- 403: Generation not owned by user
- 404: Generation not found

### 4.3. PATCH /api/ai/generations/{generationId}/candidates

**Success (200 OK):**
```json
{
  "id": "uuid",
  "updatedCandidatesCount": 3,
  "updatedAt": "2025-01-20T13:15:00Z"
}
```

**Errors:**
- 400: Invalid status / Validation failed
- 401: Unauthorized
- 403: Generation not owned by user
- 404: Generation or candidate not found

### 4.4. POST /api/ai/generations/{generationId}/save

**Success (201 Created):**
```json
{
  "savedCount": 5,
  "flashcardIds": ["uuid1", "uuid2", "uuid3", "uuid4", "uuid5"]
}
```

**Errors:**
- 400: No accepted/edited candidates
- 401: Unauthorized
- 403: Generation not owned by user
- 404: Generation or deck not found

## 5. Przepływ danych

### 5.1. POST /api/ai/generate

1. **Controller** - walidacja request body, ekstrakcja userId z Authentication
2. **Service** - weryfikacja deck ownership i istnienia
3. **Service** - sprawdzenie monthly AI limit (query do ai_generations: count by user_id where created_at >= first day of month)
4. **RateLimitService** - sprawdzenie rate limit (10 req/min/user)
5. **Service** - hash SHA-256 tekstu źródłowego
6. **AIClientService** - wywołanie OpenRouter API
   - Model: openai/gpt-4 (lub inny skonfigurowany)
   - Prompt: "Generate 8-12 flashcard Q&A pairs from the following text: {sourceText}"
   - Timeout: 30 sekund
   - Retry: 2 próby z backoff
7. **Service** - parsowanie odpowiedzi JSON, generowanie UUID dla każdego kandydata
8. **Service** - utworzenie AIGenerationEntity:
   - Serializacja candidates do JSONB przez Jackson
   - Status kandydatów: "pending"
   - Zapis do bazy
9. **Controller** - mapowanie do AIGenerationResponse

### 5.2. GET /api/ai/generations/{generationId}

1. **Controller** - walidacja generationId
2. **Service** - pobranie przez `findByIdAndUserId(generationId, userId)`
3. **Service** - deserializacja JSONB candidates
4. **Controller** - mapowanie do AIGenerationResponse

### 5.3. PATCH /api/ai/generations/{generationId}/candidates

1. **Controller** - walidacja request body
2. **Service** - pobranie generation przez `findByIdAndUserId()`
3. **Service** - deserializacja JSONB candidates
4. **Service** - walidacja custom:
   - Czy wszystkie candidate IDs istnieją
   - Czy status="edited" => editedFront i editedBack != null
5. **Service** - aktualizacja statusów i edited fields w liście
6. **Service** - serializacja z powrotem do JSONB
7. **Service** - zapis entity (Hibernate automatycznie UPDATE)
8. **Controller** - zwrot UpdateCandidatesResponse

### 5.4. POST /api/ai/generations/{generationId}/save

1. **Controller** - walidacja generationId
2. **Service** - pobranie generation przez `findByIdAndUserId()`
3. **Service** - deserializacja JSONB candidates
4. **Service** - filtrowanie kandydatów: tylko status="accepted" lub "edited"
5. **Service** - walidacja: czy lista nie jest pusta
6. **Service** - sprawdzenie czy deck nadal istnieje (generation.deck != null)
7. **Service** - batch create FlashcardEntity:
   - Dla "accepted": front/back z kandydata, source=AI
   - Dla "edited": front/back z editedFront/editedBack, source=AI_EDITED
   - generation_id = generationId
   - deck_id z generation.deck.id
8. **FlashcardRepository** - saveAll()
9. **Controller** - zwrot SaveCandidatesResponse z listą UUID

## 6. Względy bezpieczeństwa

### 6.1. Uwierzytelnianie
- JWT Bearer token wymagany dla wszystkich endpointów
- JwtAuthenticationFilter automatycznie weryfikuje token
- Authentication.getPrincipal() zwraca UUID userId

### 6.2. Autoryzacja
- **Deck ownership:** Sprawdzenie `deckRepository.findByIdAndUserId(deckId, userId)`
- **Generation ownership:** Sprawdzenie `aiGenerationRepository.findByIdAndUserId(generationId, userId)`
- Custom exception: `ForbiddenException` gdy zasób nie należy do użytkownika

### 6.3. Rate Limiting
- POST /api/ai/generate: max 10 zapytań/minutę/użytkownika
- Użycie istniejącego RateLimitService
- Bucket: `"ai-generate:" + userId`

### 6.4. Monthly AI Limit
- Limit: 100 generacji/miesiąc/użytkownika (konfigurowalny)
- Query: `SELECT COUNT(*) FROM ai_generations WHERE user_id = ? AND created_at >= ?`
- Exception: `MonthlyAILimitExceededException` (403)

### 6.5. Input Sanitization
- `sourceText.trim()` przed hashowaniem i wysyłką do AI
- Walidacja Bean Validation: @Size(min=500, max=10000)
- Ochrona przed injection: używanie parameterized queries

### 6.6. OpenRouter API Key
- Przechowywanie w `application.properties`: `app.ai.openrouter.api-key=${OPENROUTER_API_KEY}`
- @Value injection w AIClientService
- Nigdy nie zwracać w response

### 6.7. JSONB Security
- Używanie Jackson ObjectMapper do serializacji/deserializacji
- TypeReference dla bezpiecznego parsowania List<CandidateModel>
- Walidacja struktury JSON po deserializacji

## 7. Obsługa błędów

### 7.1. Custom Exceptions

Nowe wyjątki do utworzenia w `pl.olesek._xcards.ai.exception`:

```java
public class AIGenerationNotFoundException extends RuntimeException {
    public AIGenerationNotFoundException(String message) {
        super(message);
    }
}

public class MonthlyAILimitExceededException extends RuntimeException {
    public MonthlyAILimitExceededException(String message) {
        super(message);
    }
}

public class AIServiceUnavailableException extends RuntimeException {
    public AIServiceUnavailableException(String message) {
        super(message);
    }
}

public class InvalidCandidateUpdateException extends RuntimeException {
    public InvalidCandidateUpdateException(String message) {
        super(message);
    }
}

public class NoAcceptedCandidatesException extends RuntimeException {
    public NoAcceptedCandidatesException(String message) {
        super(message);
    }
}

public class ForbiddenException extends RuntimeException {
    public ForbiddenException(String message) {
        super(message);
    }
}
```

### 7.2. Exception Handlers (dodać do GlobalExceptionHandler)

```java
@ExceptionHandler(AIGenerationNotFoundException.class)
public ResponseEntity<ErrorResponse> handleAIGenerationNotFound(...) {
    // 404 Not Found
}

@ExceptionHandler(MonthlyAILimitExceededException.class)
public ResponseEntity<ErrorResponse> handleMonthlyAILimitExceeded(...) {
    // 403 Forbidden
}

@ExceptionHandler(AIServiceUnavailableException.class)
public ResponseEntity<ErrorResponse> handleAIServiceUnavailable(...) {
    // 503 Service Unavailable
}

@ExceptionHandler(InvalidCandidateUpdateException.class)
public ResponseEntity<ErrorResponse> handleInvalidCandidateUpdate(...) {
    // 400 Bad Request
}

@ExceptionHandler(NoAcceptedCandidatesException.class)
public ResponseEntity<ErrorResponse> handleNoAcceptedCandidates(...) {
    // 400 Bad Request
}

@ExceptionHandler(ForbiddenException.class)
public ResponseEntity<ErrorResponse> handleForbidden(...) {
    // 403 Forbidden
}
```

### 7.3. Logging Strategy

**DEBUG level:**
- Rozpoczęcie operacji: "Generating flashcards for deckId={}, userId={}"
- Wywołania do external API: "Calling OpenRouter API with model={}"

**INFO level:**
- Sukces generacji: "Generated {} candidates for user={}"
- Sukces zapisania fiszek: "Saved {} flashcards from generation={}"

**WARN level:**
- Błędy biznesowe: "Monthly AI limit exceeded for user={}"
- Rate limit: "Rate limit exceeded for user={}"
- Brak uprawnień: "User {} attempted to access generation={} owned by another user"

**ERROR level:**
- OpenRouter timeout/error: "OpenRouter API error: {}"
- Błędy deserializacji JSONB: "Failed to parse candidates JSON"
- Nieoczekiwane wyjątki

## 8. Rozważania dotyczące wydajności

### 8.1. Potencjalne wąskie gardła

1. **OpenRouter API latency** - odpowiedź może trwać 10-30 sekund
2. **JSONB serializacja/deserializacja** - dla dużej liczby kandydatów (8-12)
3. **Monthly limit query** - COUNT na dużej tabeli ai_generations

### 8.2. Strategie optymalizacji

#### OpenRouter API
- **Async processing:** Rozważyć asynchroniczną generację (POST zwraca 202 Accepted, polling przez GET)
- **Timeouts:** Ustawić timeout 30 sekund, retry 2x z exponential backoff
- **Circuit breaker:** Po 5 kolejnych błędach 503 - włączyć circuit breaker na 5 minut

#### JSONB
- **Jackson optimizations:** Użyć `@JsonInclude(JsonInclude.Include.NON_NULL)` dla editedFront/Back
- **Index na JSONB:** `CREATE INDEX idx_ai_generations_candidates_gin ON ai_generations USING GIN (candidates);` (jeśli będziemy query'ować po JSONB)

#### Monthly limit query
- **Index:** `CREATE INDEX idx_ai_generations_user_created ON ai_generations (user_id, created_at);`
- **Caching:** Cache wyniku na 1 godzinę per user (Redis/Caffeine)

#### Database
- **Connection pooling:** HikariCP z min 10, max 20 połączeń
- **@Transactional(readOnly = true)** dla GET endpoints
- **Batch insert:** `flashcardRepository.saveAll()` dla save endpoint

### 8.3. Skalowanie

- **Horizontal:** AI generation może być resource-intensive, rozważyć dedykowane worker nodes
- **Queue:** Dla dużego obciążenia - użyć message queue (RabbitMQ/SQS) do async processing
- **Rate limiting:** Chroni przed przeciążeniem - 10 req/min/user

## 9. Etapy wdrożenia

### Krok 1: Utworzenie struktury pakietów
```
pl.olesek._xcards.ai/
├── controller/
│   └── AIGenerationController.java
├── service/
│   ├── AIGenerationService.java
│   └── AIClientService.java
├── dto/
│   ├── request/
│   │   ├── GenerateFlashcardsRequest.java
│   │   ├── UpdateCandidatesRequest.java
│   │   └── CandidateUpdateDto.java
│   └── response/
│       ├── AIGenerationResponse.java
│       ├── CandidateDto.java
│       ├── UpdateCandidatesResponse.java
│       └── SaveCandidatesResponse.java
├── model/
│   └── CandidateModel.java
├── mapper/
│   └── AIGenerationMapper.java
└── exception/
    ├── AIGenerationNotFoundException.java
    ├── MonthlyAILimitExceededException.java
    ├── AIServiceUnavailableException.java
    ├── InvalidCandidateUpdateException.java
    ├── NoAcceptedCandidatesException.java
    └── ForbiddenException.java
```

### Krok 2: Konfiguracja application.properties
```properties
# OpenRouter API
app.ai.openrouter.api-key=${OPENROUTER_API_KEY}
app.ai.openrouter.base-url=https://openrouter.ai/api/v1
app.ai.openrouter.model=openai/gpt-4
app.ai.openrouter.timeout=30000

# AI Limits
app.ai.monthly-generation-limit=100
app.ai.rate-limit-per-minute=10

# Prompt template
app.ai.prompt-template=Generate 8-12 flashcard question-answer pairs from the following text. Return JSON array with format: [{"front": "question", "back": "answer"}]. Text: {text}
```

### Krok 3: Implementacja Exception Classes
- Utworzyć 6 custom exceptions w `pl.olesek._xcards.ai.exception`
- Dodać @ExceptionHandler methods do GlobalExceptionHandler

### Krok 4: Implementacja DTOs
- Request DTOs z Bean Validation annotations
- Response DTOs jako records
- CandidateModel dla JSONB serializacji

### Krok 5: Implementacja AIClientService
```java
@Service
@RequiredArgsConstructor
@Slf4j
public class AIClientService {
    
    @Value("${app.ai.openrouter.api-key}")
    private String apiKey;
    
    @Value("${app.ai.openrouter.base-url}")
    private String baseUrl;
    
    @Value("${app.ai.openrouter.model}")
    private String model;
    
    private final RestTemplate restTemplate; // z timeout 30s
    
    public List<CandidateModel> generateCandidatesFromText(String sourceText) {
        // 1. Przygotowanie prompt
        // 2. HTTP POST do OpenRouter API
        // 3. Parsowanie JSON response
        // 4. Retry logic (2 próby)
        // 5. Obsługa timeout/503
    }
}
```

### Krok 6: Implementacja AIGenerationMapper
```java
@Component
public class AIGenerationMapper {
    private final ObjectMapper objectMapper;
    
    public AIGenerationResponse toResponse(AIGenerationEntity entity) {
        // Deserializacja JSONB do List<CandidateDto>
    }
    
    public List<CandidateModel> deserializeCandidates(String json) {
        // TypeReference<List<CandidateModel>>
    }
    
    public String serializeCandidates(List<CandidateModel> candidates) {
        // objectMapper.writeValueAsString()
    }
}
```

### Krok 7: Implementacja AIGenerationService

**Methods:**
```java
@Service
@Transactional
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
    
    // 1. generateFlashcards()
    // 2. getGeneration()
    // 3. updateCandidates()
    // 4. saveAcceptedCandidates()
    // 5. checkMonthlyLimit() - private helper
    // 6. verifyDeckOwnership() - private helper
}
```

**Logika generateFlashcards:**
1. Verify deck ownership
2. Check rate limit (10/min/user)
3. Check monthly AI limit (100/month/user)
4. Trim i hash sourceText (SHA-256)
5. Call aiClientService.generateCandidatesFromText()
6. Create AIGenerationEntity:
   - Set all fields
   - Generate UUID for each candidate
   - Set status="pending" for all
   - Serialize to JSONB
7. Save to DB
8. Return mapped response

**Logika updateCandidates:**
1. Find by ID and userId (verify ownership)
2. Deserialize JSONB candidates
3. Validate updates:
   - All candidate IDs exist
   - If status="edited" => editedFront/Back required
4. Apply updates to list
5. Serialize back to JSONB
6. Save entity
7. Return update response

**Logika saveAcceptedCandidates:**
1. Find by ID and userId
2. Deserialize candidates
3. Filter: status IN ("accepted", "edited")
4. Validate: list not empty
5. Check deck still exists (generation.deck != null)
6. Create FlashcardEntity list:
   - For "accepted": source=AI, front/back from candidate
   - For "edited": source=AI_EDITED, front/back from editedFront/Back
   - Set generation reference
7. Batch save flashcards
8. Return SaveCandidatesResponse

### Krok 8: Implementacja AIGenerationController

```java
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "AI Generations", description = "AI flashcard generation endpoints")
public class AIGenerationController {
    
    private final AIGenerationService aiGenerationService;
    
    @PostMapping("/generate")
    @Operation(summary = "Generate flashcard candidates", 
               security = @SecurityRequirement(name = "bearer-jwt"))
    public ResponseEntity<AIGenerationResponse> generateFlashcards(
            @Valid @RequestBody GenerateFlashcardsRequest request,
            Authentication authentication) {
        UUID userId = (UUID) authentication.getPrincipal();
        AIGenerationResponse response = aiGenerationService.generateFlashcards(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
    
    // Podobnie dla pozostałych 3 endpointów
}
```

### Krok 9: Konfiguracja RestTemplate
```java
@Configuration
public class AIClientConfig {
    
    @Bean
    public RestTemplate aiRestTemplate(
            @Value("${app.ai.openrouter.timeout}") int timeout) {
        
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(timeout);
        factory.setReadTimeout(timeout);
        
        return new RestTemplate(factory);
    }
}
```

### Krok 10: Dodanie index do bazy danych (Liquibase)

Nowy changeset: `202501080900_create_ai_generation_indexes.xml`

```xml
<changeSet id="202501080900" author="developer">
    <createIndex indexName="idx_ai_generations_user_created" 
                 tableName="ai_generations">
        <column name="user_id"/>
        <column name="created_at"/>
    </createIndex>
    
    <createIndex indexName="idx_ai_generations_source_text_hash" 
                 tableName="ai_generations">
        <column name="source_text_hash"/>
    </createIndex>
</changeSet>
```

### Krok 11: Testy jednostkowe

**AIGenerationServiceTest:**
- `testGenerateFlashcards_Success()`
- `testGenerateFlashcards_DeckNotFound()`
- `testGenerateFlashcards_MonthlyLimitExceeded()`
- `testUpdateCandidates_Success()`
- `testUpdateCandidates_InvalidEditedStatus()`
- `testSaveAcceptedCandidates_Success()`
- `testSaveAcceptedCandidates_NoAcceptedCandidates()`

**AIClientServiceTest:**
- `testGenerateCandidates_Success()`
- `testGenerateCandidates_Timeout()`
- `testGenerateCandidates_ServiceUnavailable()`

### Krok 12: Testy integracyjne

**AIGenerationControllerIntegrationTest extends AbstractIntegrationTest:**
- `testGenerateFlashcards_Success()` - happy path
- `testGenerateFlashcards_Unauthorized()` - brak JWT
- `testGenerateFlashcards_ForbiddenDeck()` - deck innego użytkownika
- `testGenerateFlashcards_InvalidSourceTextLength()` - 400
- `testGetGeneration_Success()`
- `testUpdateCandidates_Success()`
- `testSaveAcceptedCandidates_Success()`
- `testSaveAcceptedCandidates_DeckDeleted()` - 404

Mock OpenRouter API przez @MockBean AIClientService

### Krok 13: Dokumentacja OpenAPI

Dodać odpowiednie adnotacje @Operation, @ApiResponse dla każdego endpointa w kontrolerze.

### Krok 14: Weryfikacja i refactoring

1. Uruchomić wszystkie testy
2. Sprawdzić pokrycie testami (min 80%)
3. Uruchomić Spotless (`./mvnw spotless:apply`)
4. Code review
5. Manualne testy przez Swagger UI
6. Load testing dla rate limiting

### Krok 15: Monitoring i metryki (opcjonalnie)

- Dodać Spring Actuator metrics:
  - Counter dla liczby generacji
  - Timer dla latency OpenRouter API
  - Gauge dla monthly usage per user
- Logowanie do ELK/CloudWatch
- Alerting dla 503 errors z OpenRouter

---

## Podsumowanie

Plan implementacji obejmuje:
- **6 custom exceptions** z obsługą w GlobalExceptionHandler
- **8 DTOs** (4 request, 4 response) jako records z Bean Validation
- **2 Service classes** (AIGenerationService + AIClientService) z @Transactional
- **1 Controller** z 4 endpointami
- **1 Mapper** do konwersji Entity ↔ DTO i JSONB ↔ Model
- **RestTemplate config** z timeout i retry
- **2 database indexes** dla wydajności monthly limit query
- **Security:** JWT auth, ownership verification, rate limiting, monthly AI limit
- **Testy:** min 10 unit tests + 8 integration tests

Szacowany czas implementacji: **3-5 dni** dla doświadczonego programisty Spring Boot.
