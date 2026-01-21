## Plan implementacji widoku „Talia” (szczegóły talii + fiszki)

## 1. Przegląd
Widok „Talia” (`/decks/:deckId`) służy do zarządzania fiszkami w obrębie wybranej talii. W MVP zapewnia:
- nagłówek z nazwą talii i liczbą fiszek,
- listę fiszek (karty) z podglądem `front/back`, badge `source` oraz akcjami „Edytuj” i „Usuń”,
- tworzenie nowej fiszki (modal),
- edycję istniejącej fiszki (modal),
- usuwanie fiszki (modal potwierdzenia),
- start trybu nauki („Ucz się” → `/decks/:deckId/study`),
- obsługę stanów: loading / błąd / brak fiszek.

Widok jest chroniony (JWT) i integruje się z backendem przez endpointy:
- `GET /api/decks/{deckId}`
- `GET /api/decks/{deckId}/flashcards`
- `POST /api/decks/{deckId}/flashcards`
- `PUT /api/flashcards/{flashcardId}`
- `DELETE /api/flashcards/{flashcardId}`

## 2. Routing widoku
- **Ścieżka**: `/decks/:deckId`
- **Parametry route**:
  - `deckId: string` (UUID w URL)
- **Ochrona**: komponent routowany powinien być opakowany w `ProtectedRoute` (analogicznie do `DecksView`).
- **Wymagane zmiany w routerze** (`frontend/src/routes/router.tsx`):
  - dodać trasę:
    - `path: "/decks/:deckId"` → `element: <DeckDetailsView />`
  - (opcjonalnie, jeśli jeszcze nie dodane w projekcie) dodać:
    - `path: "/decks/:deckId/study"` → `element: <StudyView />`
- **Nawigacje w obrębie widoku**:
  - „Ucz się” → `navigate("/decks/:deckId/study")`
  - „Powrót do listy talii” (np. link w błędzie 404/403) → `navigate("/decks")`

## 3. Struktura komponentów
Zalecany wariant MVP (spójny z istniejącymi widokami): cienka warstwa routowana w `frontend/src/views/` + komponenty domenowe w `frontend/src/components/` + API clienty w `frontend/src/lib/api/`.

### Drzewo komponentów (wysokopoziomowo)
- `DeckDetailsView` (route)
  - `ProtectedRoute`
    - `DeckDetailsPageLayout` (opcjonalnie jako wewnętrzny layout)
      - `DeckHeader`
        - CTA: `Button` „Dodaj fiszkę” (otwiera `CreateFlashcardDialog`)
        - CTA: `Button` „Ucz się” (nawigacja)
      - stany:
        - loading deck i/lub flashcards
        - `InlineError` + akcja „Wróć do talii” / „Spróbuj ponownie”
        - `EmptyFlashcardsState` (gdy lista pusta)
      - `FlashcardList`
        - `FlashcardCard` (xN)
          - `FlashcardSourceBadge`
          - akcje: `EditFlashcardDialogTrigger`, `DeleteFlashcardConfirmTrigger`
  - modale (renderowane na końcu strony):
    - `CreateFlashcardDialog`
    - `EditFlashcardDialog`
    - `ConfirmDeleteFlashcardDialog`

## 4. Szczegóły komponentów

### `DeckDetailsView` (route / container)
- **Opis**: koordynuje pobranie danych talii i listy fiszek, zarządza stanami (loading/error/empty), utrzymuje stan otwartych dialogów, deleguje wywołania API do `lib/api/*` i odpowiada za nawigacje.
- **Główne elementy**:
  - wrapper: `ProtectedRoute`
  - layout: kontener (np. `container mx-auto max-w-5xl px-4 py-8`)
  - `DeckHeader`, `FlashcardList` / `EmptyFlashcardsState`, `InlineError`
  - modale (dialogi) zasilane danymi i callbackami
- **Obsługiwane zdarzenia**:
  - `onMount` / `onDeckIdChange` → pobranie:
    - `GET /api/decks/{deckId}` (nagłówek)
    - `GET /api/decks/{deckId}/flashcards` (lista fiszek)
  - `onCreateClick` → otwarcie `CreateFlashcardDialog`
  - `onStudyClick` → nawigacja do trybu nauki
  - `onFlashcardEditClick(flashcard)` → otwarcie `EditFlashcardDialog` z prefill
  - `onFlashcardDeleteClick(flashcard)` → otwarcie `ConfirmDeleteFlashcardDialog`
  - `onCreated/onUpdated/onDeleted` → po sukcesie:
    - refetch listy fiszek,
    - refetch talii (żeby zaktualizować `flashcardCount`),
    - zamknięcie dialogu
  - `onRetry` → ponowne pobranie danych
- **Walidacja**:
  - `deckId` musi istnieć (min. `if (!deckId)`) zanim wykonasz requesty/nawigacje.
  - brak filtrów `source` w MVP (nie dodawać UI filtrów mimo, że API wspiera `source`).
- **Typy**:
  - DTO: `DeckResponseDto`, `PagedFlashcardResponseDto`, `FlashcardResponseDto`
  - VM: `FlashcardListItemVm`, `DeckDetailsStateVm` (opcjonalnie) / lokalny state
- **Propsy**: brak (komponent routowany).

### `DeckHeader`
- **Opis**: nagłówek strony — nazwa talii, liczba fiszek oraz akcje „Dodaj fiszkę” i „Ucz się”.
- **Główne elementy**:
  - `div` (flex) z:
    - `h1` (nazwa talii)
    - `p` (np. „Fiszki: X”)
    - CTA: `Button` „Dodaj fiszkę”, `Button` „Ucz się”
- **Obsługiwane zdarzenia**:
  - `onCreateClick`
  - `onStudyClick`
- **Walidacja**: brak (prezentacyjny); przyciski można disable podczas `isLoading`/mutacji.
- **Typy**:
  - używa danych z `DeckResponseDto` (lub prostych propsów `deckName`, `flashcardCount`)
- **Propsy**:
  - `deckName: string`
  - `flashcardCount: number`
  - `onCreateClick: () => void`
  - `onStudyClick: () => void`
  - `isDisabled?: boolean`

### `FlashcardList`
- **Opis**: renderuje listę fiszek jako karty (grid lub kolumna). Dla MVP wystarczy lista bez paginacji w UI (pobieramy np. `size=100`).
- **Główne elementy**:
  - `div` z układem (np. `space-y-3` albo `grid gap-4`)
  - dzieci: `FlashcardCard[]`
- **Obsługiwane zdarzenia**: delegowane do `FlashcardCard`.
- **Walidacja**: brak.
- **Typy**:
  - `FlashcardListItemVm[]`
- **Propsy**:
  - `items: FlashcardListItemVm[]`
  - `onEdit: (item: FlashcardListItemVm) => void`
  - `onDelete: (item: FlashcardListItemVm) => void`

### `FlashcardCard`
- **Opis**: pojedyncza fiszka w formie karty z podglądem `front/back` (skrócone) oraz badge `source`.
- **Główne elementy**:
  - `Card`
    - `CardHeader`: `front` + `FlashcardSourceBadge`
    - `CardContent`: `back` (skrócony)
    - `CardFooter`: `Button` „Edytuj”, `Button` „Usuń”
- **Obsługiwane zdarzenia**:
  - `onEditClick` → `props.onEdit(item)`
  - `onDeleteClick` → `props.onDelete(item)`
- **Walidacja**: brak.
- **Typy**:
  - `FlashcardListItemVm`
- **Propsy**:
  - `item: FlashcardListItemVm`
  - `onEdit: (item: FlashcardListItemVm) => void`
  - `onDelete: (item: FlashcardListItemVm) => void`

### `FlashcardSourceBadge`
- **Opis**: wizualny badge prezentujący `source`: `manual` / `ai` / `ai-edited`.
- **Główne elementy**:
  - `span`/`div` z klasami Tailwind (np. tło/kolor zależny od `source`)
- **Obsługiwane zdarzenia**: brak.
- **Walidacja**: brak.
- **Typy**:
  - `FlashcardSourceVm`
- **Propsy**:
  - `source: FlashcardSourceVm`

### `EmptyFlashcardsState`
- **Opis**: stan pusty, gdy talia nie ma fiszek. Powinien zawierać CTA „Dodaj fiszkę”.
- **Główne elementy**:
  - tekst informacyjny + `Button` „Dodaj fiszkę”
- **Obsługiwane zdarzenia**:
  - `onCreateClick`
- **Walidacja**: brak.
- **Typy**: brak.
- **Propsy**:
  - `onCreateClick: () => void`
  - `isDisabled?: boolean`

### `CreateFlashcardDialog`
- **Opis**: modal do tworzenia nowej fiszki w ramach talii. Po sukcesie powinien zamknąć się i zasygnalizować rodzicowi refresh.
- **Główne elementy**:
  - `Dialog`, `DialogContent`, `DialogHeader`, `DialogFooter`
  - formularz:
    - `Input`/`Textarea` dla `front`
    - `Input`/`Textarea` dla `back`
    - `InlineError` dla błędu globalnego
    - `LoadingButton` do submitu
- **Obsługiwane zdarzenia**:
  - `onOpenChange(open)`
  - `onFrontChange`, `onBackChange`
  - `onSubmit` → `POST /api/decks/{deckId}/flashcards`
- **Walidacja (zgodnie z API + PRD)**:
  - `front`:
    - `trim()`
    - wymagane (po trim: długość ≥ 1)
    - maks. 500 znaków
  - `back`:
    - `trim()`
    - wymagane (po trim: długość ≥ 1)
    - maks. 500 znaków
  - podczas wysyłki: disable pól i przycisków, brak wielokrotnego submitu
- **Typy**:
  - DTO: `CreateFlashcardRequestDto`, `FlashcardResponseDto`
  - VM: `FlashcardFormVm`, `FlashcardFormErrorsVm`
- **Propsy**:
  - `open: boolean`
  - `deckId: string`
  - `accessToken: string`
  - `onOpenChange: (open: boolean) => void`
  - `onCreated: (flashcard: FlashcardResponseDto) => void`

### `EditFlashcardDialog`
- **Opis**: modal do edycji istniejącej fiszki. Prefill danymi fiszki. Po sukcesie zamyka się i odświeża listę. Backend automatycznie zmienia `source` z `ai` na `ai-edited` — UI tylko wyświetla to, co wróci w odpowiedzi.
- **Główne elementy**: analogiczne do `CreateFlashcardDialog`.
- **Obsługiwane zdarzenia**:
  - `onOpenChange(open)`
  - `onFrontChange`, `onBackChange`
  - `onSubmit` → `PUT /api/flashcards/{flashcardId}`
- **Walidacja**: identyczna jak w create (trim + 1–500).
- **Typy**:
  - DTO: `UpdateFlashcardRequestDto`, `FlashcardResponseDto`
  - VM: `FlashcardFormVm`, `FlashcardFormErrorsVm`
- **Propsy**:
  - `open: boolean`
  - `flashcard: FlashcardListItemVm | null` (lub `FlashcardResponseDto | null`)
  - `accessToken: string`
  - `onOpenChange: (open: boolean) => void`
  - `onUpdated: (flashcard: FlashcardResponseDto) => void`

### `ConfirmDeleteFlashcardDialog`
- **Opis**: modal potwierdzenia usunięcia fiszki.
- **Główne elementy**:
  - `AlertDialog` (shadcn/ui), opis nieodwracalności
  - `InlineError` dla błędu
  - `Button` „Anuluj” i `Button` „Usuń” (z loading spinnerem)
- **Obsługiwane zdarzenia**:
  - `onOpenChange(open)`
  - `onConfirm` → `DELETE /api/flashcards/{flashcardId}`
- **Walidacja**: brak.
- **Typy**:
  - `FlashcardListItemVm`
- **Propsy**:
  - `open: boolean`
  - `flashcard: FlashcardListItemVm | null`
  - `accessToken: string`
  - `onOpenChange: (open: boolean) => void`
  - `onDeleted: (flashcardId: string) => void`

## 5. Typy

### DTO (kontrakty API)
Zalecane miejsce: `frontend/src/lib/flashcards/flashcardTypes.ts` (nowy plik/katalog).

- **`FlashcardResponseDto`** (odpowiada backend `FlashcardResponse`):
  - `id: string` (UUID)
  - `deckId: string` (UUID)
  - `front: string`
  - `back: string`
  - `source: "manual" | "ai" | "ai-edited"`
  - `generationId: string | null`
  - `createdAt: string` (ISO 8601)
  - `updatedAt: string` (ISO 8601)

- **`PagedFlashcardResponseDto`**:
  - `content: FlashcardResponseDto[]`
  - `page: PageMetaDto` (można reużyć z `frontend/src/lib/decks/deckTypes.ts`, bo ma identyczny kształt jak backend `PageInfo`)

- **`CreateFlashcardRequestDto`**:
  - `front: string`
  - `back: string`

- **`UpdateFlashcardRequestDto`**:
  - `front: string`
  - `back: string`

### ViewModel (UI)
Miejsce: `frontend/src/lib/flashcards/flashcardTypes.ts` lub `frontend/src/lib/flashcards/flashcardViewModels.ts` (opcjonalnie).

- **`FlashcardSourceVm`**:
  - `type FlashcardSourceVm = "manual" | "ai" | "ai-edited"`

- **`FlashcardListItemVm`** (dla listy):
  - `id: string`
  - `deckId: string`
  - `front: string`
  - `back: string`
  - `source: FlashcardSourceVm`
  - `generationId: string | null`
  - `createdAt: string`
  - `updatedAt: string`

- **`FlashcardsListStateVm`**:
  - `items: FlashcardListItemVm[]`
  - `isLoading: boolean`
  - `error: string | null`
  - `page: PageMetaDto | null`

- **`FlashcardFormVm`**:
  - `front: string`
  - `back: string`

- **`FlashcardFormErrorsVm`**:
  - `front?: string`
  - `back?: string`
  - `formError?: string | null`

### Aktualizacja istniejących typów błędów (wspólne dla FE)
Aktualnie `handleApiError`/`parseValidationErrors` mapuje wybrane pola (`email`, `password`, `name`, ...). Żeby obsłużyć walidację fiszek:
- rozszerzyć `FieldErrors` w `frontend/src/lib/auth/authTypes.ts` o:
  - `front?: string`
  - `back?: string`
- rozszerzyć mapowanie w `parseValidationErrors` (`frontend/src/lib/api/errorParser.ts`) o pola:
  - `front`, `back`

## 6. Zarządzanie stanem
Wariant MVP (najprostszy, spójny z `DecksView`):
- trzymać state w `DeckDetailsView`:
  - `deck: DeckResponseDto | null`
  - `flashcards: FlashcardListItemVm[]`
  - `isLoadingDeck: boolean`, `isLoadingFlashcards: boolean`
  - `error: string | null`
  - `pageMeta: PageMetaDto | null` (jeśli używamy paginacji z API)
  - state dialogów:
    - `createOpen: boolean`
    - `editOpen: boolean`
    - `deleteOpen: boolean`
    - `selectedFlashcard: FlashcardListItemVm | null`
- fetch w `useEffect` + `useCallback` (jak w `DecksView`).

Wariant rekomendowany (czytelniejszy przy rozbudowie):
- dodać hook `useDeckDetails(deckId)` w `frontend/src/lib/decks/useDeckDetails.ts` lub `frontend/src/lib/flashcards/useDeckFlashcards.ts`, który:
  - pobiera `deck` i `flashcards`,
  - udostępnia `refetchAll()` / `refetchDeck()` / `refetchFlashcards()`,
  - enkapsuluje obsługę 401 (logout) oraz wspólny `error`/`loading`.

## 7. Integracja API

### Nowe/rozszerzone funkcje API client
- **`frontend/src/lib/api/decksApi.ts`**:
  - dodać `getDeck(accessToken: string, deckId: string): Promise<DeckResponseDto>`
  - endpoint: `GET /api/decks/{deckId}`

- **`frontend/src/lib/api/flashcardsApi.ts`** (nowy plik):
  - `listFlashcardsInDeck(accessToken, deckId, params?): Promise<PagedFlashcardResponseDto>`
    - endpoint: `GET /api/decks/{deckId}/flashcards`
    - params:
      - `page` (default 0)
      - `size` (default 50, max 100)
      - `sort` (default `"createdAt,desc"`)
      - `source?` (UI w MVP nie używa)
  - `getFlashcard(accessToken, flashcardId): Promise<FlashcardResponseDto>`
    - endpoint: `GET /api/flashcards/{flashcardId}` (opcjonalnie — w MVP nie jest wymagane, bo do edycji mamy dane z listy)
  - `createFlashcard(accessToken, deckId, dto: CreateFlashcardRequestDto): Promise<FlashcardResponseDto>`
    - endpoint: `POST /api/decks/{deckId}/flashcards`
  - `updateFlashcard(accessToken, flashcardId, dto: UpdateFlashcardRequestDto): Promise<FlashcardResponseDto>`
    - endpoint: `PUT /api/flashcards/{flashcardId}`
  - `deleteFlashcard(accessToken, flashcardId): Promise<void>`
    - endpoint: `DELETE /api/flashcards/{flashcardId}` (204)

### Autoryzacja
Wszystkie requesty wymagają nagłówka:
- `Authorization: Bearer ${accessToken}`

### Mapowanie danych do VM
W MVP można mapować 1:1 DTO → VM (pola są identyczne), jedynie typ `source` zawęzić do union.

## 8. Interakcje użytkownika
- **Wejście na widok**:
  - UI pokazuje loading, następnie nagłówek + listę lub empty state.
- **Dodaj fiszkę**:
  - klik „Dodaj fiszkę” → otwiera modal,
  - submit:
    - walidacja front/back,
    - `POST` do API,
    - po sukcesie: zamknięcie modala + refetch listy i decka (dla `flashcardCount`).
- **Edytuj fiszkę**:
  - klik „Edytuj” na karcie → otwiera modal z prefill,
  - submit:
    - walidacja front/back,
    - `PUT` do API,
    - po sukcesie: zamknięcie modala + refetch (źródło `ai` może stać się `ai-edited`).
- **Usuń fiszkę**:
  - klik „Usuń” → modal potwierdzenia,
  - potwierdzenie:
    - `DELETE` do API,
    - po sukcesie: zamknięcie modala + refetch listy i decka.
- **Ucz się**:
  - klik „Ucz się” → `navigate("/decks/:deckId/study")`.

## 9. Warunki i walidacja

### Walidacja formularzy fiszek (Create/Edit)
Wymagania z PRD + backend:
- **Trim**: zawsze używać `front.trim()` i `back.trim()` przed walidacją i przed wysłaniem.
- **Wymagalność**: po trim długość musi być ≥ 1.
- **Limit**: długość ≤ 500 znaków dla `front` i `back`.
- **Blokady UI**:
  - podczas requestu disable inputy i przyciski,
  - zapobiegać podwójnemu submitowi.

### Warunki związane z parametrami/route
- jeśli `deckId` jest pusty (nie powinno się zdarzyć): nie wywoływać API; pokazać błąd i link do `/decks`.
- jeśli backend zwróci 400 dla niepoprawnego UUID: wyświetlić czytelny komunikat (np. „Nieprawidłowy identyfikator talii.”) i link do `/decks`.

### Warunki wymagane przez API
- `size` w `GET /flashcards` nie przekracza 100 (frontend może użyć np. 100 i nie budować UI paginacji w MVP).
- `sort` w formacie `"field,direction"` (w MVP: `"createdAt,desc"`).
- brak użycia `source` w MVP (zgodnie z ui-plan).

## 10. Obsługa błędów

### Błędy autoryzacji
- **401 Unauthorized**:
  - zachowanie spójne z `DecksView`: pokazać komunikat „Sesja wygasła…”, wykonać `logout()` i przerwać dalsze akcje.

### Błędy zasobu
- **404 Not Found**:
  - deck nie istnieje lub nie należy do użytkownika (backend może nie rozróżniać 403/404),
  - UI: komunikat „Nie znaleziono talii lub nie masz do niej dostępu.” + link/przycisk „Wróć do listy talii”.

### Walidacja (400)
- dla create/edit:
  - użyć `handleApiError` i mapować błędy pól `front/back`,
  - jeśli nie uda się sparsować: pokazać błąd globalny.

### Błędy sieci/serwera
- status 0 / wyjątki fetch:
  - globalny błąd „Błąd sieci. Spróbuj ponownie.”
- 500:
  - globalny błąd z `getErrorMessage(err)` + akcja „Spróbuj ponownie”.

### Spójność danych po mutacjach
Po create/edit/delete zalecany jest refetch zamiast „ręcznej” aktualizacji listy, aby:
- zminimalizować ryzyko rozjazdu `flashcardCount`,
- zawsze odzwierciedlać `source` po edycji (AI → AI_EDITED).

## 11. Kroki implementacji
1. **Routing**
   - Dodaj trasę `/decks/:deckId` w `frontend/src/routes/router.tsx` do nowego widoku `DeckDetailsView`.
2. **Typy**
   - Utwórz `frontend/src/lib/flashcards/flashcardTypes.ts` i dodaj DTO + VM opisane w sekcji 5.
3. **Obsługa błędów walidacji dla fiszek**
   - Zaktualizuj `FieldErrors` (`frontend/src/lib/auth/authTypes.ts`) o `front/back`.
   - Zaktualizuj `parseValidationErrors` (`frontend/src/lib/api/errorParser.ts`) o mapowanie `front/back`.
4. **API client**
   - Rozszerz `frontend/src/lib/api/decksApi.ts` o `getDeck`.
   - Dodaj `frontend/src/lib/api/flashcardsApi.ts` z funkcjami list/create/update/delete.
5. **Komponenty UI**
   - Dodaj folder `frontend/src/components/flashcards/` i utwórz:
     - `FlashcardList.tsx`, `FlashcardCard.tsx`, `FlashcardSourceBadge.tsx`,
     - `CreateFlashcardDialog.tsx`, `EditFlashcardDialog.tsx`, `ConfirmDeleteFlashcardDialog.tsx`,
     - `EmptyFlashcardsState.tsx` (jeśli wydzielany).
   - Dodaj `DeckHeader` do `frontend/src/components/decks/` (lub `components/deck-details/`, jeśli wolicie odseparować).
6. **Widok**
   - Utwórz `frontend/src/views/DeckDetailsView.tsx`:
     - pobierz `deckId` z `useParams()`,
     - pobierz `accessToken/logout` z `useAuth()`,
     - pobierz deck + flashcards w `useEffect`,
     - dodaj obsługę dialogów i callbacki do mutacji,
     - dodaj obsługę stanów: loading/error/empty.
7. **Nawigacje**
   - Zaimplementuj „Ucz się” w `DeckHeader` (`navigate(/decks/:deckId/study)`).
   - W błędach 404/400 dodaj link „Wróć do listy talii” (`/decks`).
8. **UX/Accessibility**
   - Użyj `aria-invalid` i `aria-describedby` dla błędów pól (jak w `CreateDeckDialog`).
   - Auto-focus w dialogach na pierwszym polu.
9. **Weryfikacja manualna (checklista)**
   - Wejście na `/decks/:deckId` (poprawny) → widok ładuje dane, pokazuje listę.
   - Brak fiszek → empty state + „Dodaj fiszkę”.
   - Create: walidacja trim + 1–500, sukces → fiszka widoczna, `flashcardCount` zaktualizowany.
   - Edit: `source` dla `ai` przechodzi na `ai-edited` po zapisie (po refetch).
   - Delete: znika z listy, count spada.
   - 401 → logout.
   - 404/invalid UUID → sensowny komunikat + link do `/decks`.

