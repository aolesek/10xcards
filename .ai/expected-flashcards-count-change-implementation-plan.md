## Plan wdrożenia zmiany: pole „Oczekiwana liczba fiszek” w generowaniu AI

## 1. Przegląd
Celem zmiany jest dodanie w widoku generowania fiszek przez AI dodatkowego pola pozwalającego wybrać **oczekiwaną liczbę fiszek do wygenerowania**.

Wymagania:
- wartość domyślna: **10**
- wartość maksymalna: **100**

Zmiana jest end-to-end:
- frontend zbiera wartość i wysyła w `POST /api/ai/generate`
- backend waliduje i uwzględnia wartość w promptcie do modelu (oraz w generatorze danych mock, jeśli jest używany)

## 2. Routing widoku
Bez zmian (pole dodajemy w istniejącym flow):
- `/ai/generate`
- `/ai/loading`
- `/ai/review/:generationId`

## 3. Zakres zmian (high-level)
- **Frontend**
  - dodanie pola liczbowego w formularzu generowania
  - aktualizacja walidacji formularza oraz stanu przekazywanego do `/ai/loading`
  - rozszerzenie DTO requestu `GenerateFlashcardsRequestDto`
- **Backend**
  - rozszerzenie request DTO `GenerateFlashcardsRequest` o `requestedCandidatesCount`
  - walidacja wartości (max 100)
  - przekazanie parametru do klienta AI / promptu (`app.ai.prompt-template`)
  - dostosowanie mock generatora kandydatów (jeśli włączony)
- **Dokumentacja API**
  - aktualizacja opisu endpointu w OpenAPI/Swagger (zamiast „8–12” → liczba sterowana parametrem)

## 4. Frontend – szczegóły implementacyjne

### 4.1. UI/UX pola
- **Nazwa pola**: „Liczba fiszek”
- **Typ kontrolki**: `Input` (shadcn) `type="number"`
- **Parametry kontrolki**:
  - `min=1`
  - `max=100`
  - `step=1`
  - wartość początkowa: `10`
- **Hint**: „Domyślnie 10, maksymalnie 100”
- **Walidacja i błędy**:
  - puste / NaN → „Podaj liczbę fiszek”
  - `< 1` → „Minimum 1 fiszka”
  - `> 100` → „Maksymalnie 100 fiszek”
  - błąd renderowany pod polem z `role="alert"`

Rekomendacja UX:
- nie clampować agresywnie w trakcie wpisywania (żeby nie walczyć z użytkownikiem),
- ale przy `blur` lub `submit` można clampować albo walidować i blokować submit (ważne: spójnie z resztą formularzy).

### 4.2. Stan i typy (FE)
Zalecane rozszerzenia typów w `frontend/src/lib/ai/aiTypes.ts`:
- `AIGenerateFormVm`
  - dodać: `requestedCandidatesCount: number`
- `AIGenerateFormErrorsVm`
  - dodać: `requestedCandidatesCount?: string`
- `AIGenerateNavigationState`
  - dodać: `requestedCandidatesCount: number`
- `GenerateFlashcardsRequestDto`
  - dodać: `requestedCandidatesCount: number`

Domyślna wartość w stanie formularza w `AIGenerateView`: `requestedCandidatesCount = 10`.

### 4.3. Walidacja (FE)
Rozszerzyć `validateGenerateForm` (`frontend/src/lib/ai/validateGenerate.ts`) o walidację:
- `requestedCandidatesCount`:
  - musi być liczbą
  - musi być całkowita
  - `1 <= value <= 100`

Ważne: ta sama funkcja walidacji jest używana w:
- `AIGenerateView` (przed nawigacją do `/ai/loading`)
- `AILoadingView` (walidacja `location.state` przed wywołaniem API)

### 4.4. Integracja z API (FE)
W `AILoadingView` do requestu `generateFlashcards(accessToken, dto)` dopiąć:
- `requestedCandidatesCount: state.requestedCandidatesCount`

## 5. Backend – szczegóły implementacyjne

### 5.1. Request DTO + walidacja (BE)
W `src/main/java/pl/olesek/_xcards/ai/dto/request/GenerateFlashcardsRequest.java` dodać pole:
- `Integer requestedCandidatesCount`
  - `@Min(1)`
  - `@Max(100)`
  - `@Schema` (opis + przykład, opcjonalnie `defaultValue="10"`)

Domyślność:
- jeśli `requestedCandidatesCount == null`, backend powinien przyjąć **10** (tzn. UI może wysyłać zawsze, ale BE i tak powinien być odporny na brak pola).

### 5.2. Serwis generowania (BE)
W `AIGenerationService.generateFlashcards(...)`:
- wyliczyć `requestedCount = request.requestedCandidatesCount() != null ? request.requestedCandidatesCount() : 10`
- przekazać `requestedCount` do klienta AI (zalecane):
  - zmienić sygnaturę `AIClientService.generateCandidatesFromText(...)` na przyjmującą liczbę

### 5.3. Prompt template (BE)
Obecnie `AIClientService` składa prompt przez `promptTemplate.replace("{text}", sourceText)`.

Zmiana:
- wprowadzić placeholder `{count}` i zastępować oba:
  - `{text}` → tekst
  - `{count}` → liczba kandydatów
- zaktualizować `app.ai.prompt-template` w `application.properties` tak, aby zawierał `{count}` (np. „Generate {count} flashcard question-answer pairs…”).

### 5.4. Mock dane (BE)
W `AIClientService` jest flaga `USE_MOCK_DATA = true`.
Jeśli mock pozostaje włączony:
- generator mocków powinien zwracać dokładnie `requestedCount` kandydatów (np. przez wygenerowanie listy o żądanej długości albo obcięcie istniejącej puli do `count`).

## 6. Integracja API (kontrakty)

### Endpoint
`POST /api/ai/generate`

### Request (zmiana)
Dodajemy pole:
- `requestedCandidatesCount: number` (1–100, domyślnie 10)

Pozostałe pola bez zmian:
- `deckId`
- `sourceText`

### Response
Bez zmian.

## 7. Warunki i walidacja (UI vs API)
- UI powinno blokować submit przy:
  - braku `deckId`
  - `sourceText.trim().length` poza 500–10 000
  - `requestedCandidatesCount` poza 1–100 lub niebędącej liczbą całkowitą
- Backend waliduje analogicznie (max 100 jako twardy warunek).

## 8. Obsługa błędów i przypadki brzegowe
- `400 Bad Request`:
  - jeśli backend zwróci błąd walidacji `requestedCandidatesCount`, UI powinno pokazać go przy polu (rekomendacja: rozszerzyć mapping w `errorParser` dla tego pola).
- `401/403/404/429/503`:
  - zachowanie bez zmian (istniejące komunikaty w `AILoadingView`).
- Edge-case:
  - użytkownik usuwa wartość z inputa (puste) → blokada generowania + błąd pola.

## 9. Kroki implementacji (checklista)
1. **FE**
   - rozszerz typy o `requestedCandidatesCount`
   - ustaw domyślną wartość 10 w stanie formularza
   - dodaj pole `Input number` do formularza i obsługę `onChange`
   - rozszerz `validateGenerateForm` o nowe reguły
   - przekaż wartość w `location.state` do `/ai/loading`
   - dodaj wartość do body requestu `POST /api/ai/generate`
2. **BE**
   - dodaj pole do `GenerateFlashcardsRequest` + walidacja `@Min/@Max`
   - ustaw domyślną wartość 10 w serwisie (gdy `null`)
   - zmodyfikuj `AIClientService` i prompt template (`{count}`)
   - dostosuj mock generator kandydatów do `count`
3. **Dokumentacja**
   - zaktualizuj opis endpointu w `AIGenerationController` (i/lub `@Schema`) tak, aby jasno opisać parametr i jego ograniczenia
4. **(Opcjonalnie) Testy**
   - FE: testy walidacji dla 10, 100, 101, 0, NaN
   - BE: test walidacji requestu (0/101 → 400)
