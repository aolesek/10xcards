## Plan wdrożenia zmiany: wybór modelu w widoku generowania fiszek (AI)

## 1. Przegląd
Celem zmiany jest dodanie w widoku generowania fiszek (AI) dodatkowego pola wyboru modelu (rozwijana lista z predefiniowanymi wartościami) oraz rozszerzenie endpointu backendowego `POST /api/ai/generate`, aby akceptował wybrany model. Backend musi walidować model twardą allow-listą i odrzucać spreparowane requesty z wartościami spoza listy. Domyślny model to **`openai/gpt-4o-mini`**.

Lista modeli do wyboru:
- `openai/gpt-4o-mini` (default)
- `openai/gpt-5-mini`
- `google/gemini-2.5-flash`
- `x-ai/grok-4.1-fast`
- `anthropic/claude-sonnet-4.5`
- `deepseek/deepseek-v3.2`

## 2. Routing widoku
Zmiana dotyczy istniejących tras:
- `/ai/generate` – formularz generowania
- `/ai/loading` – widok pośredni wykonujący `POST /api/ai/generate` na podstawie `location.state`

Nie dodajemy nowych tras.

## 3. Struktura komponentów
Docelowa hierarchia (tylko istotne elementy):
- `AIGenerateView` (view, `/ai/generate`)
  - `AIGenerateForm`
    - `DeckSelect`
    - **`AIModelSelect` (NOWY)**
    - `TextareaWithCounter`
    - pole liczby fiszek (`<Input type="number">`)
    - `LoadingButton` (CTA “Generuj”)
- `AILoadingView` (view, `/ai/loading`)
  - `AITriviaLoading`
  - `Button` (“Anuluj i wróć”)
  - `InlineError` (błędy)

## 4. Szczegóły komponentów

### `AIGenerateView`
- **Opis komponentu**: Kontener `/ai/generate`. Utrzymuje stan formularza, w tym wybrany model. Pobiera talie i przekazuje do `AIGenerateForm`.
- **Główne elementy**:
  - kontener strony + nagłówek
  - `AIGenerateForm` z propsami sterującymi
- **Obsługiwane zdarzenia**:
  - `onModelChange(model)` – aktualizacja `form.model` i czyszczenie błędu pola
  - `onSubmit()` – walidacja i nawigacja do `/ai/loading` z `location.state` zawierającym również `model`
- **Warunki walidacji (UI)**:
  - `model`:
    - wymagany (w praktyce zawsze ustawiony na default, ale UI powinno blokować pustą wartość)
    - wartość musi być jedną z allow-listy (patrz sekcja 9)
- **Typy (DTO/VM)**:
  - `AIGenerateFormVm`, `AIGenerateFormErrorsVm`, `AIGenerateNavigationState`
  - `AIModelId` / `AIModelOptionVm` (NOWE – sekcja 5)
- **Propsy**: brak

### `AIGenerateForm`
- **Opis komponentu**: Prezentacyjny formularz kontrolowany przez `AIGenerateView`. Renderuje dodatkowe pole wyboru modelu.
- **Główne elementy HTML**:
  - `<form>`
    - `DeckSelect`
    - **`AIModelSelect`**
    - `TextareaWithCounter`
    - `<Input type="number">` dla `requestedCandidatesCount`
    - `LoadingButton` (submit)
- **Obsługiwane zdarzenia**:
  - `onModelChange(modelId: AIModelId)` (NOWE)
  - reszta bez zmian: `onDeckChange`, `onSourceTextChange`, `onRequestedCandidatesCountChange`, `onSubmit`
- **Warunki walidacji (UI)**:
  - delegowane do `validateGenerateForm(form)` (rozszerzone o `model`)
  - przy zmianie pola: czyść `errors.model`
- **Typy (DTO/VM)**:
  - `AIGenerateFormVm`, `AIGenerateFormErrorsVm`, `AIModelId`, `AIModelOptionVm`
- **Propsy (interfejs komponentu)**:
  - `form: AIGenerateFormVm`
  - `errors: AIGenerateFormErrorsVm`
  - `deckOptions: DeckOptionVm[]`
  - `isDecksLoading: boolean`
  - `isSubmitting: boolean`
  - `onDeckChange: (deckId: string) => void`
  - `onModelChange: (model: AIModelId) => void` **(NOWE)**
  - `onSourceTextChange: (value: string) => void`
  - `onRequestedCandidatesCountChange: (value: number) => void`
  - `onOpenCreateDeckDialog: () => void`
  - `onSubmit: () => void`

### `AIModelSelect` (NOWY)
- **Opis komponentu**: Wybór modelu do generowania. Zalecany natywny `<select>` stylowany analogicznie do `DeckSelect` (spójność + brak zależności od dodatkowego komponentu Select).
- **Główne elementy HTML**:
  - `Label`
  - `<select>`:
    - lista opcji na podstawie stałej allow-listy FE
    - wartość domyślna ustawiona na `openai/gpt-4o-mini`
  - tekst błędu (`role="alert"`) jak w `DeckSelect`
- **Obsługiwane zdarzenia**:
  - `onChange` → `onModelChange(e.target.value as AIModelId)`
- **Warunki walidacji (UI)**:
  - `model` wymagany
  - `model` musi należeć do allow-listy FE (sekcja 9)
- **Typy**:
  - `AIModelId`, `AIModelOptionVm`
- **Propsy**:
  - `value: AIModelId | ""`
  - `options: AIModelOptionVm[]`
  - `disabled?: boolean`
  - `error?: string | null`
  - `onChange: (model: AIModelId) => void`

### `AILoadingView`
- **Opis komponentu**: Widok `/ai/loading` uruchamia generowanie po mount, na podstawie `location.state`.
- **Zmiany**:
  - `AIGenerateNavigationState` musi zawierać `model`
  - `validateGenerateForm(...)` musi walidować również `model`
  - `generateFlashcards(...)` musi wysyłać `model` w body requestu
- **Obsługiwane zdarzenia**:
  - bez zmian: mount → request; “Anuluj i wróć”
- **Warunki walidacji (UI)**:
  - jeśli `location.state` jest niekompletne (w tym brak `model`) → redirect do `/ai/generate`

## 5. Typy

### Frontend (TypeScript)
- **`AIModelId` (NOWY)**: string union zgodny 1:1 z allow-listą:
  - `"openai/gpt-4o-mini"`
  - `"openai/gpt-5-mini"`
  - `"google/gemini-2.5-flash"`
  - `"x-ai/grok-4.1-fast"`
  - `"anthropic/claude-sonnet-4.5"`
  - `"deepseek/deepseek-v3.2"`

- **`AIModelOptionVm` (NOWY)**:
  - `value: AIModelId`
  - `label: string` (np. identyczny jak value albo krótszy opis w UI)

- **`AIGenerateFormVm` (ZMIANA)**:
  - dodać pole `model: AIModelId`
  - wartość domyślna w stanie: `"openai/gpt-4o-mini"`

- **`AIGenerateFormErrorsVm` (ZMIANA)**:
  - dodać opcjonalne `model?: string`

- **`AIGenerateNavigationState` (ZMIANA)**:
  - dodać `model: AIModelId`

- **`GenerateFlashcardsRequestDto` (ZMIANA, kontrakt API FE)**:
  - dodać `model?: AIModelId` (lub `model: AIModelId` jeśli chcemy zawsze wysyłać; rekomendacja: zawsze wysyłać dla jasności)

### Backend (Java)
- **`GenerateFlashcardsRequest` (ZMIANA)**: dodać pole `model` do request body.
  - rekomendacja: `String model` (opcjonalne) + walidacja allow-listą (sekcja 9)
  - zachowanie: jeśli `model == null` → użyj default `openai/gpt-4o-mini`

- **`AIModel` enum (NOWY, rekomendacja)**:
  - enum jako single source of truth allow-listy po stronie BE
  - mapowanie enum → string value (np. pole `id`)
  - jeśli wybierzesz enum zamiast `String` w DTO, Jackson automatycznie odrzuci nieznane wartości (400)

## 6. Zarządzanie stanem
- **Stan formularza** w `AIGenerateView`:
  - `form.deckId: string`
  - `form.sourceText: string`
  - `form.requestedCandidatesCount: number`
  - **`form.model: AIModelId` (NOWE, default)** = `"openai/gpt-4o-mini"`
- **Błędy walidacji**:
  - `errors.model` analogicznie do `errors.deckId` / `errors.requestedCandidatesCount`
- **Custom hook**: nie jest wymagany (zmiana jest prosta i mieści się w obecnym podejściu).

## 7. Integracja API

### Endpoint
- **`POST /api/ai/generate`**

### Request (JSON) – zmiana kontraktu
- **Obecnie**:
  - `deckId: UUID`
  - `sourceText: string` (500–10000 po trim)
  - `requestedCandidatesCount: number` (1–100, default 10)
- **Po zmianie** (NOWE pole):
  - `model: string` (opcjonalne, z allow-listy)

Przykład:
- `deckId`: `"..."`,
- `sourceText`: `"..."`,
- `requestedCandidatesCount`: `10`,
- `model`: `"openai/gpt-4o-mini"`

### Response
- bez zmian, nadal zwraca m.in.:
  - `aiModel: string` – powinien odzwierciedlać faktycznie użyty model (default albo wybrany przez użytkownika)

### Backend – przepływ danych (konkret)
- `AIGenerationController.generateFlashcards(...)`:
  - przyjmuje `GenerateFlashcardsRequest` z `model`
- `AIGenerationService.generateFlashcards(...)`:
  - wybiera `selectedModel`:
    - jeśli request zawiera model → użyj go
    - w przeciwnym razie → default `openai/gpt-4o-mini` (preferowane jako stała/konfiguracja)
  - zapisuje `entity.aiModel = selectedModel`
  - przekazuje `selectedModel` do klienta AI
- `AIClientService`:
  - rozszerzyć metodę np. `generateCandidatesFromText(sourceText, requestedCount, model)`
  - w body requestu do OpenRouter ustawiać `requestBody.put("model", model)`

## 8. Interakcje użytkownika
- **Wybór modelu**:
  - użytkownik wybiera model z dropdownu
  - domyślnie ustawiony jest `openai/gpt-4o-mini`
- **Generuj**:
  - po kliknięciu “Generuj” aplikacja przechodzi do `/ai/loading`
  - `AILoadingView` wysyła request z `model`
- **Odświeżenie `/ai/loading`**:
  - jeśli `location.state` nie istnieje (w tym brak `model`) → redirect do `/ai/generate`

## 9. Warunki i walidacja

### Frontend (UI)
- **`model`**:
  - wymagany
  - musi należeć do allow-listy FE (dokładnie te same wartości co BE)
  - w razie naruszenia:
    - pokaż błąd pola (np. “Wybierz poprawny model”)
    - blokuj submit (poprzez wynik `validateGenerateForm`)

Implementacyjnie (rekomendacja):
- dodać stałą `AI_MODEL_OPTIONS` (tablica `AIModelOptionVm[]`) oraz `AI_MODEL_IDS`/`Set` do szybkiej walidacji w `validateGenerateForm`.

### Backend (API)
- **`model`**:
  - jeśli obecny w request:
    - musi być jedną z wartości allow-listy; inaczej **400 Bad Request**
  - jeśli brak:
    - backend używa default `openai/gpt-4o-mini`

Rekomendowana walidacja BE (jedna z opcji, wybierz jedną i trzymaj konsekwentnie):
- **Opcja A (enum – preferowana)**:
  - `GenerateFlashcardsRequest.model` jako `AIModel` (nullable)
  - nieznana wartość → 400 (deserializacja)
- **Opcja B (String + @Pattern)**:
  - `String model` + `@Pattern` z allow-listą:
    - `^(openai/gpt-4o-mini|openai/gpt-5-mini|google/gemini-2\\.5-flash|x-ai/grok-4\\.1-fast|anthropic/claude-sonnet-4\\.5|deepseek/deepseek-v3\\.2)$`
  - brak pola → ok, default w serwisie

## 10. Obsługa błędów
- **400 Bad Request**:
  - niepoprawny `model` (spoza allow-listy)
  - pozostałe istniejące walidacje requestu (tekst 500–10000, count 1–100)
  - FE:
    - dla błędu modelu pokazać komunikat globalny (fallback) + opcjonalnie przypisać do pola, jeśli parser błędów to wspiera
- **401 Unauthorized**: bez zmian (sesja wygasła)
- **403 Forbidden**: bez zmian (brak dostępu do talii / miesięczny limit)
- **404 Not Found**: bez zmian (deck nie istnieje)
- **429 Too Many Requests**: bez zmian (rate limit)
- **503 Service Unavailable**: bez zmian (AI niedostępne)

## 11. Kroki implementacji

### Backend
1. Dodać allow-listę modeli po stronie BE:
   - utworzyć `AIModel` enum (rekomendacja) lub stałą + walidację `@Pattern`.
2. Rozszerzyć `GenerateFlashcardsRequest` o pole `model` (opcjonalne).
3. Zaktualizować OpenAPI/Swagger adnotacje:
   - opisać pole `model` i wskazać możliwe wartości + domyślną.
4. Zmodyfikować `AIGenerationService.generateFlashcards(...)`:
   - wyznaczyć `selectedModel` (request.model ?? default).
   - zapisywać `entity.aiModel = selectedModel`.
5. Zmodyfikować `AIClientService`:
   - dodać parametr `model` do metody generowania i używać go w request body do OpenRouter.
6. Zaktualizować konfigurację default modelu:
   - ustawić `app.ai.openrouter.model=openai/gpt-4o-mini` (spójne z wymaganiami).
7. Dodać testy:
   - request z poprawnym `model` → 201 i `aiModel` w odpowiedzi równe wybranemu,
   - request z niepoprawnym `model` → 400,
   - request bez `model` → 201 i `aiModel` równe default.

### Frontend
1. Dodać typy:
   - `AIModelId`, `AIModelOptionVm`,
   - rozszerzyć `AIGenerateFormVm`, `AIGenerateFormErrorsVm`, `AIGenerateNavigationState`,
   - rozszerzyć `GenerateFlashcardsRequestDto` o `model`.
2. Dodać stałą listę modeli (single source of truth FE), np. w `frontend/src/lib/ai/aiModels.ts`:
   - `AI_MODEL_OPTIONS` + `DEFAULT_AI_MODEL = "openai/gpt-4o-mini"`.
3. Dodać komponent `AIModelSelect` (w `frontend/src/components/ai/`) na wzór `DeckSelect`.
4. Zmodyfikować `AIGenerateForm`:
   - wyrenderować `AIModelSelect`,
   - dodać props `onModelChange`.
5. Zmodyfikować `AIGenerateView`:
   - ustawić default `form.model = DEFAULT_AI_MODEL`,
   - obsłużyć `handleModelChange`,
   - dodać `model` do `navState` przekazywanego do `/ai/loading`.
6. Zmodyfikować `validateGenerateForm`:
   - dodać walidację `model` (wymagany + allow-list).
7. Zmodyfikować `AILoadingView`:
   - walidować również `model`,
   - wysyłać `model` w body `generateFlashcards(...)`.
8. (Opcjonalnie) Dodać testy FE (Vitest):
   - render formularza: domyślnie wybrany model,
   - zmiana modelu aktualizuje stan,
   - walidacja blokuje submit przy pustym/niepoprawnym modelu.

