## Plan implementacji widoku Generuj fiszki (AI)

## 1. Przegląd
Widok „Generuj fiszki (AI)” umożliwia użytkownikowi wklejenie tekstu (500–10 000 znaków), wybór docelowej talii (lub utworzenie nowej w tym samym flow) oraz uruchomienie generowania kandydatów po stronie backendu (`POST /api/ai/generate`). Po kliknięciu „Generuj” użytkownik trafia do widoku loading (UI nie jest blokowane), a następnie do widoku przeglądu kandydatów (`/ai/review/:generationId` – poza zakresem tego planu, ale integracja jest wskazana jako punkt docelowy).

## 2. Routing widoku
- **Nowa ścieżka**: `/ai/generate`
  - Widok chroniony (`ProtectedRoute`), tylko dla zalogowanych.
- **Nowa ścieżka**: `/ai/loading`
  - Widok chroniony (`ProtectedRoute`), tylko dla zalogowanych.
  - Oczekuje danych wejściowych w `location.state` (deckId + sourceText); przy odświeżeniu strony (brak state) przekierowuje do `/ai/generate`.
- **Docelowa nawigacja po sukcesie**: `/ai/review/:generationId`
  - W tym planie: tylko kontrakt nawigacji (implementacja review osobno).

## 3. Struktura komponentów
- `AIGenerateView` (view)
  - `AIGenerateForm`
    - `DeckSelect`
    - `InlineCreateDeckDialog` (wrapper na `CreateDeckDialog`)
    - `TextareaWithCounter`
    - `AiUsageInfo` (opcjonalnie)
    - `InlineError` / `Alert` (błędy globalne)
    - `LoadingButton` / `Button`
- `AILoadingView` (view)
  - `AITriviaLoading`
  - `Spinner` (prosty komponent lub tekst “Ładowanie…” zgodnie ze wzorcem)
  - `Button` (CTA: „Anuluj i wróć”)
  - `InlineError` (fallback błędów + retry)

## 4. Szczegóły komponentów

### `AIGenerateView`
- **Opis komponentu**: Kontener strony `/ai/generate`. Odpowiada za pobranie listy talii, obsługę stanu ekranu (loading/error/ready), trzymanie stanu formularza oraz nawigację do `/ai/loading`.
- **Główne elementy**:
  - Layout kontenera (jak w `DecksView`: `container mx-auto max-w-... px-4 py-...`)
  - Sekcja nagłówka: tytuł „Generuj fiszki (AI)” + krótki opis
  - Render `AIGenerateForm`
- **Obsługiwane zdarzenia**:
  - `onMount`: pobranie talii (`GET /api/decks?size=100&sort=createdAt,desc`)
  - `onSubmit`: walidacja + `navigate("/ai/loading", { state: { deckId, sourceText } })`
  - `onCreateDeckSuccess`: ustawienie `selectedDeckId` i aktualizacja listy opcji (dodanie nowej talii na górę lub ponowny fetch)
- **Obsługiwana walidacja (UI)**:
  - `deckId`:
    - wymagany (brak wyboru → błąd pola)
  - `sourceText`:
    - trim na submit
    - długość po trim: `>= 500 && <= 10000`
    - opcjonalnie: przy przekroczeniu 10 000 blokuj submit i pokaż błąd natychmiast
- **Typy (DTO/VM)**:
  - `DeckResponseDto` / `PagedDeckResponseDto` (już istnieją)
  - `AIGenerateFormVm`, `AIGenerateFormErrorsVm`, `DeckOptionVm` (nowe – opis w sekcji „Typy”)
- **Propsy**: brak (view jest montowany z routera).

### `AIGenerateForm`
- **Opis komponentu**: Czysty formularz. Renderuje pola i przyciski, nie pobiera danych samodzielnie. Może być komponentem „kontrolowanym” (props + callbacki) albo wewnętrznie trzymać stan – rekomendacja: stan w `AIGenerateView`, żeby łatwiej obsłużyć integrację i nawigację.
- **Główne elementy**:
  - `<form>` z:
    - `DeckSelect` + przycisk „Utwórz nową talię”
    - `TextareaWithCounter` (tekst wejściowy)
    - Sekcja informacji o limicie (`AiUsageInfo`) – opcjonalna
    - Przycisk główny „Generuj” (z loading state)
- **Obsługiwane zdarzenia**:
  - `onDeckChange(deckId)`
  - `onSourceTextChange(text)`
  - `onOpenCreateDeckDialog()`
  - `onSubmit()`
- **Obsługiwana walidacja (UI)**:
  - natychmiastowe czyszczenie błędów pola po zmianie (jak w `CreateDeckDialog`)
  - blokada `submit` podczas:
    - ładowania talii (`isDecksLoading`)
    - wysyłki formularza (`isSubmitting`) — w tym planie `isSubmitting` kończy się na nawigacji do loading view
- **Typy**:
  - `AIGenerateFormVm`, `AIGenerateFormErrorsVm`
- **Propsy (interfejs komponentu)**:
  - `form: AIGenerateFormVm`
  - `errors: AIGenerateFormErrorsVm`
  - `deckOptions: DeckOptionVm[]`
  - `isDecksLoading: boolean`
  - `isSubmitting: boolean`
  - `onDeckChange: (deckId: string) => void`
  - `onSourceTextChange: (value: string) => void`
  - `onOpenCreateDeckDialog: () => void`
  - `onSubmit: () => void`

### `DeckSelect`
- **Opis komponentu**: Prosty wybór talii. Ponieważ w `components/ui` nie ma `Select`, rekomendacja: natywny `<select>` stylowany Tailwindem + `Label` + pomocniczy opis.
- **Główne elementy**:
  - `Label`
  - `<select>`:
    - opcja placeholder: „Wybierz talię…”
    - lista `deckOptions`
  - tekst błędu (np. `<p className="text-sm text-destructive" role="alert">`)
- **Obsługiwane zdarzenia**:
  - `onChange` → `onDeckChange`
- **Obsługiwana walidacja**:
  - `deckId` wymagany (puste → błąd)
- **Typy**:
  - `DeckOptionVm`
- **Propsy**:
  - `value: string | ""`
  - `options: DeckOptionVm[]`
  - `disabled?: boolean`
  - `error?: string | null`
  - `onChange: (deckId: string) => void`

### `InlineCreateDeckDialog`
- **Opis komponentu**: Adapter na istniejący `CreateDeckDialog`, żeby użyć go inline w flow generowania.
- **Główne elementy**:
  - `CreateDeckDialog` (istniejący)
- **Obsługiwane zdarzenia**:
  - `onCreated(deck)`:
    - zamknij dialog
    - ustaw `selectedDeckId = deck.id`
    - zaktualizuj `deckOptions` (dodaj nową pozycję lub odśwież listę z API)
- **Walidacja**:
  - taka jak w `CreateDeckDialog` (1–100 znaków po trim)
- **Typy**:
  - `DeckResponseDto`
- **Propsy**:
  - `open: boolean`
  - `accessToken: string`
  - `onOpenChange(open: boolean): void`
  - `onCreated(deck: DeckResponseDto): void` (callback do rodzica)

### `TextareaWithCounter`
- **Opis komponentu**: Pole tekstowe dla `sourceText` z licznikiem znaków i wskazaniem zakresu 500–10 000.
- **Główne elementy**:
  - `Label`
  - `Textarea` (istniejący shadcn)
  - licznik znaków:
    - rekomendacja: pokazuj **długość po trim** (kluczowe dla zgodności z backendem)
    - opcjonalnie: dodatkowo pokazuj „surowe znaki” jeśli chcesz uniknąć zaskoczeń (nie wymagane)
  - tekst błędu pola
- **Obsługiwane zdarzenia**:
  - `onChange` → `onSourceTextChange`
- **Obsługiwana walidacja**:
  - po trim: `len < 500` → „Tekst musi mieć co najmniej 500 znaków”
  - po trim: `len > 10000` → „Tekst może mieć maksymalnie 10 000 znaków”
  - `required` (pusty po trim) → komunikat jak wyżej (min 500 i tak złapie)
- **Typy**:
  - brak osobnych (wystarczy `string`)
- **Propsy**:
  - `value: string`
  - `disabled?: boolean`
  - `error?: string | null`
  - `min?: number` (domyślnie 500)
  - `max?: number` (domyślnie 10000)
  - `onChange: (value: string) => void`

### `AiUsageInfo` (opcjonalnie)
- **Opis komponentu**: Niewielka informacja „Wykorzystanie AI: X / Y w tym miesiącu”.
- **Wymaganie PRD (US-016)**: MVP **nie ostrzega proaktywnie** o zbliżaniu się do limitu — komponent ma jedynie informować, bez banerów „prawie limit”.
- **Źródło danych**:
  - `useAuth().user.monthlyAiLimit`
  - `useAuth().user.aiUsageInCurrentMonth`
  - opcjonalnie: odświeżenie `/api/auth/me` po błędzie 403 „limit exceeded” (nie wymagane w MVP)
- **Propsy**:
  - `monthlyLimit: number`
  - `usageInCurrentMonth: number`

### `AILoadingView`
- **Opis komponentu**: Widok przejściowy `/ai/loading`. Uruchamia `POST /api/ai/generate` na podstawie danych przekazanych z `/ai/generate`, pokazuje spinner i „fakt edukacyjny”, umożliwia powrót bez anulowania po API.
- **Główne elementy**:
  - tekst „Generuję fiszki…”
  - `AITriviaLoading` (rotacja 20 statycznych faktów)
  - `Button` „Anuluj i wróć” → `navigate("/ai/generate")`
  - obsługa błędu + retry
- **Obsługiwane zdarzenia**:
  - `onMount`:
    - jeśli brak `location.state` → `navigate("/ai/generate", { replace: true })`
    - jeśli brak `accessToken` → błąd + logout/redirect (jak w innych widokach)
    - start requestu `generateFlashcards(accessToken, dto)`
  - `onCancel`: powrót do `/ai/generate` (bez anulowania po API; opcjonalnie `AbortController` tylko po stronie przeglądarki)
  - `onRetry`: ponowna próba generowania (tylko jeśli wciąż mamy `state`)
- **Walidacja**:
  - przed wywołaniem API: szybka walidacja zgodna z formularzem (deckId niepusty, trim/len w zakresie) — zabezpieczenie przed „dziwnym” state.
- **Typy**:
  - `AIGenerateNavigationState` (nowy)
  - `GenerateFlashcardsRequestDto`, `AIGenerationResponseDto` (nowe)
- **Propsy**: brak (view z routera).

### `AITriviaLoading`
- **Opis komponentu**: Wyświetla losowy fakt z listy 20 faktów; może zmieniać co N sekund.
- **Zasady**:
  - treści statyczne (bez danych wrażliwych)
  - brak network
- **Propsy**:
  - `facts: string[]` (lub wewnętrzna stała)
  - `intervalMs?: number` (opcjonalnie)

## 5. Typy

### DTO (kontrakty API) – nowe pliki w FE
Rekomendacja lokalizacji:
- `frontend/src/lib/ai/aiTypes.ts`
- `frontend/src/lib/api/aiApi.ts`

**`GenerateFlashcardsRequestDto`**
- `deckId: string` (UUID)
- `sourceText: string` (po trim, 500–10 000)

**`AIGenerationCandidateDto`** (odpowiada backendowemu `CandidateDto`)
- `id: string` (UUID)
- `front: string`
- `back: string`
- `status: "pending" | "accepted" | "rejected" | "edited"`
- `editedFront: string | null`
- `editedBack: string | null`

**`AIGenerationResponseDto`**
- `id: string` (UUID)
- `deckId: string` (UUID)
- `aiModel: string`
- `sourceTextHash: string`
- `sourceTextLength: number`
- `generatedCandidatesCount: number`
- `candidates: AIGenerationCandidateDto[]`
- `createdAt: string` (ISO)
- `updatedAt: string` (ISO)

### ViewModel (UI)
**`DeckOptionVm`**
- `value: string` (deckId)
- `label: string` (deck name)
- `flashcardCount?: number` (opcjonalnie do opisu w UI)

**`AIGenerateFormVm`**
- `deckId: string | ""`
- `sourceText: string`

**`AIGenerateFormErrorsVm`**
- `deckId?: string`
- `sourceText?: string`
- `formError?: string | null`

**`AIGenerateNavigationState`** (przekazywany do `/ai/loading`)
- `deckId: string`
- `sourceText: string` (surowy tekst z textarea; loading view zrobi trim + walidację)

## 6. Zarządzanie stanem

### Stan w `AIGenerateView`
- **Dane talii**:
  - `deckOptions: DeckOptionVm[]`
  - `isDecksLoading: boolean`
  - `decksError: string | null`
- **Formularz**:
  - `form: AIGenerateFormVm`
  - `errors: AIGenerateFormErrorsVm`
  - `isSubmitting: boolean` (ustawiane krótko przed `navigate`, żeby zablokować double submit)
- **Dialog tworzenia talii**:
  - `isCreateDeckOpen: boolean`

### Stan w `AILoadingView`
- `mode: "loading" | "error"` (analogicznie do `StudyView`)
- `error: string | null`
- `isLoading: boolean` (dla spójności z resztą app)
- `generationId?: string` (opcjonalnie, jeśli chcesz pokazać debug)

### Custom hooki (opcjonalne, ale rekomendowane dla czytelności)
- `useDeckOptions(accessToken)`:
  - odpowiedzialny za `listDecks` → mapowanie do `DeckOptionVm[]`
  - zwraca `{ options, isLoading, error, refetch }`
- `useAIGenerateValidation()`:
  - jedna funkcja `validate(form): AIGenerateFormErrorsVm`
  - używana zarówno w `AIGenerateView`, jak i w `AILoadingView` (walidacja state)

## 7. Integracja API

### Wymagane wywołania
- `GET /api/decks` (już istnieje: `listDecks(accessToken, { size: 100, sort: "createdAt,desc" })`)
- `POST /api/decks` (już istnieje: `createDeck(accessToken, { name })`) — używane w `CreateDeckDialog`
- **NOWE** `POST /api/ai/generate`
  - lokalizacja: `frontend/src/lib/api/aiApi.ts`
  - funkcja: `generateFlashcards(accessToken: string, dto: GenerateFlashcardsRequestDto, signal?: AbortSignal): Promise<AIGenerationResponseDto>`
  - implementacja przez `fetchJson`:
    - `url: "/api/ai/generate"`
    - `method: "POST"`
    - `headers.Authorization: Bearer ...`
    - `body: JSON.stringify(dto)`
    - `signal` (opcjonalnie) przekazany do `fetchJson` poprzez `options`

### Kontrakty request/response
- Request: `GenerateFlashcardsRequestDto` (`deckId`, `sourceText`)
- Response: `AIGenerationResponseDto` (z `id`, `candidates` itd.)

### Akcje frontendowe po odpowiedzi
- `201 Created`:
  - `navigate(`/ai/review/${response.id}`)`
  - opcjonalnie: przekazanie `deckId` w query (`?deckId=...`) jeśli potrzebne na review
- `400`:
  - przypisz błąd do pola `sourceText` lub `deckId` (zależnie od komunikatu)
- `401`:
  - pokaż „Sesja wygasła…”, wywołaj `logout()` i pozwól `ProtectedRoute` przekierować
- `403`:
  - pokaż komunikat z backendu; w szczególności:
    - „deck doesn't belong…” → „Nie masz dostępu do tej talii.”
    - „monthly AI limit exceeded” → „Przekroczono miesięczny limit generacji AI.”
- `404`:
  - „Deck does not exist” → „Talia nie istnieje (mogła zostać usunięta).”
- `429`:
  - „Za dużo prób. Spróbuj ponownie za chwilę.”
- `503`:
  - „Usługa AI jest chwilowo niedostępna. Spróbuj ponownie.”

## 8. Interakcje użytkownika
- **Wybór talii**:
  - użytkownik wybiera z listy; brak wyboru blokuje submit i pokazuje błąd
- **Utworzenie nowej talii w flow**:
  - klik „Utwórz nową talię” → modal
  - po sukcesie modal się zamyka, a nowa talia jest automatycznie ustawiana jako wybrana
- **Wklejenie tekstu**:
  - textarea akceptuje dowolny tekst; UI pokazuje licznik znaków i zakres
- **Klik „Generuj”**:
  - jeśli walidacja nie przechodzi → błędy pól
  - jeśli przechodzi → przejście do `/ai/loading` (bez blokowania całego UI formularza)
- **Loading**:
  - widoczny spinner + fakt
  - CTA „Anuluj i wróć” wraca do `/ai/generate` (bez anulowania po API)
  - po sukcesie automatyczna nawigacja do `/ai/review/:generationId`

## 9. Warunki i walidacja

### Warunki z API i jak weryfikować w UI
- **Autoryzacja**:
  - wymagany JWT → `accessToken` z `useAuth()`
  - brak tokenu: pokaż błąd i poproś o ponowne zalogowanie
- **`deckId`**:
  - wymagany (`@NotNull`) → UI: nie pozwól wysłać pustego wyboru
- **`sourceText`**:
  - wymagany (`@NotNull`) i długość 500–10 000 (`@Size`)
  - backend i tak robi `trim()`, ale walidacja DTO dzieje się wcześniej → UI powinien:
    - używać `trim()` przed wysyłką
    - walidować długość po trim (żeby nie wysłać np. 10 005 znaków z trailing spaces)
- **Podwójny submit / spam**:
  - rate limit 10/min → UI:
    - blokuj powtórny klik, gdy trwa request (`AILoadingView` w trybie loading)

### Gdzie trzymać walidację
- Reużywalna funkcja `validateGenerateForm(form)` (wspólna dla `/ai/generate` i `/ai/loading`).

## 10. Obsługa błędów

### Scenariusze błędów i reakcje UI
- **Brak autoryzacji (`401`)**:
  - komunikat: „Sesja wygasła. Zaloguj się ponownie.”
  - akcja: `logout()` (jak w `DecksView`/`StudyView`)
- **Brak dostępu / limit (`403`)**:
  - pokaż komunikat z backendu jako global error
  - bez proaktywnego ostrzegania o limicie (US-016)
- **Nie znaleziono (`404`)**:
  - jeśli dotyczy talii: pokaż błąd i zachęć do ponownego wyboru / odświeżenia listy talii
- **Walidacja (`400`)**:
  - przypisz do pól:
    - `sourceText` (gdy poza zakresem)
    - `deckId` (gdy null/niepoprawny)
  - jeśli backend zwraca tylko global message → pokaż jako `InlineError`
- **Rate limit (`429`)**:
  - pokaż błąd + przycisk „Spróbuj ponownie” (retry w loading view)
- **AI niedostępne (`503`)**:
  - pokaż błąd + retry
- **Błędy sieci (`ApiError.status === 0`)**:
  - komunikat z `getErrorMessage`, retry

### Uwaga dot. parsowania błędów pól
Aktualny `handleApiError` mapuje pola m.in. `name`, `front`, `back`, ale nie mapuje `deckId` ani `sourceText`. Aby mieć spójne UX:
- rozszerz `FieldErrors` w `frontend/src/lib/auth/authTypes.ts` o:
  - `deckId?: string`
  - `sourceText?: string`
- rozszerz `parseValidationErrors()` w `frontend/src/lib/api/errorParser.ts` o mapowanie tych pól.
Alternatywnie (minimalny wpływ): parsuj komunikaty 400 lokalnie w `AIGenerateView` i ustaw `errors.deckId/errors.sourceText`.

## 11. Kroki implementacji
1. **Routing**
   - Dodaj do `frontend/src/routes/router.tsx` nowe ścieżki:
     - `/ai/generate` → `AIGenerateView`
     - `/ai/loading` → `AILoadingView`
2. **Pliki widoków**
   - Utwórz `frontend/src/views/ai/AIGenerateView.tsx`
   - Utwórz `frontend/src/views/ai/AILoadingView.tsx`
3. **Warstwa API dla AI**
   - Utwórz `frontend/src/lib/api/aiApi.ts` z `generateFlashcards()`
   - Utwórz `frontend/src/lib/ai/aiTypes.ts` i dodaj DTO: `GenerateFlashcardsRequestDto`, `AIGenerationResponseDto`, `AIGenerationCandidateDto`
4. **Komponenty UI**
   - Utwórz `frontend/src/components/ai/AIGenerateForm.tsx`
   - Utwórz `frontend/src/components/ai/DeckSelect.tsx` (natywny `<select>`)
   - Utwórz `frontend/src/components/ai/TextareaWithCounter.tsx`
   - Utwórz `frontend/src/components/ai/AITriviaLoading.tsx`
   - (Opcjonalnie) `frontend/src/components/ai/AiUsageInfo.tsx`
5. **Integracja z tworzeniem talii**
   - W `AIGenerateView` użyj istniejącego `CreateDeckDialog` jako inline dialogu:
     - po `onCreated(deck)` ustaw `selectedDeckId = deck.id`
     - odśwież `deckOptions` (dodaj lokalnie lub refetch)
6. **Walidacja po stronie klienta**
   - Dodaj wspólną funkcję walidacji (np. `frontend/src/lib/ai/validateGenerate.ts`):
     - trim `sourceText`
     - sprawdź `deckId`
     - sprawdź zakres 500–10 000
7. **Loading flow**
   - W `AIGenerateView` po poprawnym submit:
     - `navigate("/ai/loading", { state: { deckId, sourceText } })`
   - W `AILoadingView`:
     - pobierz `state`, wykonaj walidację, wywołaj `generateFlashcards`
     - sukces → `navigate(`/ai/review/${id}`, { replace: true })`
     - błąd → pokaż `InlineError` + `Button` retry
8. **Obsługa błędów pól**
   - Rozszerz `FieldErrors` i `parseValidationErrors` o `deckId` i `sourceText` (rekomendowane), aby `handleApiError` działał spójnie.
9. **Dostępność i UX**
   - Upewnij się, że:
     - wszystkie pola mają `Label` i `aria-invalid` przy błędach
     - licznik znaków jest czytelny, a przy błędach ma `role="alert"` (jak w `CreateDeckDialog`)
     - loading view ma wyraźny komunikat i CTA „Anuluj i wróć”
10. **(Opcjonalnie) Testy**
   - Dodaj testy jednostkowe dla walidacji `validateGenerateForm()`.
   - Dodaj testy dla `aiApi.generateFlashcards` (mock `fetch`), analogicznie do istniejących testów w `lib/api`.

