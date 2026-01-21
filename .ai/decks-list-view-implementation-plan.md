## Plan implementacji widoku „Moje talie” (lista talii)

## 1. Przegląd
Widok „Moje talie” (`/decks`) jest głównym ekranem aplikacji po zalogowaniu. Pokazuje listę talii użytkownika jako siatkę kart i umożliwia wykonanie akcji MVP:
- utworzenie nowej talii,
- edycję nazwy talii,
- usunięcie talii (z potwierdzeniem),
- nawigację do szczegółów talii,
- start trybu nauki dla talii.

Widok integruje się z backendem przez endpointy `GET/POST/PUT/DELETE /api/decks` i wymaga autoryzacji JWT.

## 2. Routing widoku
- **Ścieżka**: `/decks`
- **Ochrona**: widok powinien być opakowany w `ProtectedRoute` (już jest) – dostęp tylko dla zalogowanych.
- **Nawigacje z widoku**:
  - „Otwórz” → `/decks/:deckId`
  - „Ucz się” → `/decks/:deckId/study`

## 3. Struktura komponentów
Docelowo `frontend/src/views/DecksView.tsx` staje się kompozycją niżej opisanych komponentów.

Wariant MVP (bez nadmiarowej abstrakcji): komponenty UI w katalogu `frontend/src/components/decks/` + cienka warstwa API w `frontend/src/lib/api/decksApi.ts` + typy w `frontend/src/lib/decks/deckTypes.ts`.

### Drzewo komponentów (wysokopoziomowo)
- `DecksView` (route)
  - `ProtectedRoute`
    - `DecksPageLayout`
      - `DecksHeader`
        - `CreateDeckDialogTrigger` (np. `Button`)
      - `InlineError` / `Alert` (błędy globalne)
      - `DeckGrid`
        - `DeckCard` (xN)
          - akcje: `Open`, `Study`, `EditDeckDialogTrigger`, `DeleteDeckConfirmTrigger`
      - `EmptyState` (gdy brak talii)
      - `PaginationControls` (opcjonalnie, jeśli nie pobieramy `size=100`)
  - `CreateDeckDialog`
  - `EditDeckDialog`
  - `ConfirmDeleteDialog`

## 4. Szczegóły komponentów

### `DecksView` (route / container)
- **Opis**: koordynuje pobranie listy talii, renderuje stany ładowania/pusty stan/błąd, utrzymuje stan otwartych dialogów i deleguje akcje do warstwy API.
- **Główne elementy**:
  - wrapper: `ProtectedRoute`
  - layout: `div` z kontenerem (`mx-auto`, `max-w-*`, `p-*`)
  - `DecksHeader`, `DeckGrid`, `EmptyState`, ewentualnie `InlineError` dla globalnych błędów
- **Obsługiwane zdarzenia**:
  - `onMount` → pobranie talii (GET)
  - `onCreateSubmit` → utworzenie talii (POST) + refetch / update listy
  - `onEditSubmit` → zmiana nazwy (PUT) + update listy
  - `onDeleteConfirm` → usunięcie (DELETE) + update listy
  - `onOpen(deckId)` → `navigate(/decks/:deckId)`
  - `onStudy(deckId)` → `navigate(/decks/:deckId/study)`
- **Walidacja**: delegowana do dialogów (create/edit), ale `DecksView` powinien:
  - blokować akcje w trakcie requestów,
  - zapewnić, że `deckId` jest niepustym stringiem UUID zanim wywoła nawigację (minimum: `if (!deckId) return;`).
- **Typy**:
  - `PagedDeckResponseDto`, `DeckResponseDto`
  - `DeckListItemVm`, `DecksListStateVm`
- **Propsy**: brak (komponent routowany).

### `DecksPageLayout`
- **Opis**: prosty layout strony (nagłówek + content). Może być częścią `DecksView` (nie musi być osobnym plikiem).
- **Główne elementy**:
  - `header` / `div` dla tytułu i CTA
  - `main` dla gridu
- **Zdarzenia**: brak (prezentacyjny).
- **Walidacja**: brak.
- **Typy**: brak.
- **Propsy**:
  - `children: ReactNode` (jeśli wydzielony).

### `DecksHeader`
- **Opis**: tytuł widoku („Moje talie”) oraz akcja „Utwórz talię”.
- **Główne elementy**:
  - `h1` + opis (opcjonalnie)
  - `Button` „Utwórz talię” jako trigger do `CreateDeckDialog`
- **Obsługiwane zdarzenia**:
  - `onCreateClick` → otwarcie dialogu
- **Walidacja**: brak.
- **Typy**: brak.
- **Propsy**:
  - `onCreateClick: () => void`
  - `isDisabled?: boolean` (np. gdy trwa refetch lub mutacja)

### `DeckGrid`
- **Opis**: renderuje siatkę kart talii, responsywnie (1 kolumna mobile → 2–3 kolumny desktop).
- **Główne elementy**:
  - `div` z klasami Tailwind np. `grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
  - dzieci: `DeckCard[]`
- **Obsługiwane zdarzenia**: delegowane do `DeckCard`.
- **Walidacja**: brak.
- **Typy**:
  - `DeckListItemVm`
- **Propsy**:
  - `items: DeckListItemVm[]`
  - `onOpen: (deckId: string) => void`
  - `onStudy: (deckId: string) => void`
  - `onEdit: (deck: DeckListItemVm) => void`
  - `onDelete: (deck: DeckListItemVm) => void`

### `DeckCard`
- **Opis**: pojedyncza karta talii z nazwą, liczbą fiszek i zestawem akcji.
- **Główne elementy**:
  - `Card`
    - `CardHeader` (nazwa)
    - `CardContent` (np. „Fiszki: X”)
    - `CardFooter` (przyciski akcji)
- **Obsługiwane zdarzenia**:
  - `onOpenClick` → otwórz szczegóły talii
  - `onStudyClick` → przejdź do trybu nauki
  - `onEditClick` → otwórz `EditDeckDialog` (prefill)
  - `onDeleteClick` → otwórz `ConfirmDeleteDialog`
- **Walidacja**:
  - brak walidacji danych wejściowych; komponent zakłada, że `item.id` jest poprawne.
- **Typy**:
  - `DeckListItemVm`
- **Propsy**:
  - `item: DeckListItemVm`
  - `onOpen(deckId: string): void`
  - `onStudy(deckId: string): void`
  - `onEdit(item: DeckListItemVm): void`
  - `onDelete(item: DeckListItemVm): void`

### `CreateDeckDialog`
- **Opis**: modal do tworzenia talii. Zawiera `Input` dla nazwy, walidację i obsługę błędów 400/409.
- **Główne elementy** (shadcn):
  - `Dialog`
    - `DialogHeader` (tytuł: „Utwórz nową talię”)
    - `Input` (`name`)
    - sekcja błędu pola (`p.text-destructive`)
    - `InlineError` dla błędu globalnego (np. sieć/500)
    - `LoadingButton` / `Button` submit
- **Obsługiwane zdarzenia**:
  - `onOpenChange(open)` → reset formularza przy zamknięciu (zalecane)
  - `onChange(name)` → aktualizacja state + czyszczenie `fieldErrors.name`
  - `onSubmit` → `POST /api/decks`
- **Walidacja (zgodna z API/PRD)**:
  - `nameTrimmed = name.trim()`
  - `nameTrimmed.length >= 1` (wymagane)
  - `nameTrimmed.length <= 100`
  - submit wysyła **przyciętą** nazwę (`trim()`)
- **Typy**:
  - DTO: `CreateDeckRequestDto`, `DeckResponseDto`
  - VM: `DeckNameFormVm`, `DeckNameFormErrorsVm`
- **Propsy**:
  - `open: boolean`
  - `onOpenChange: (open: boolean) => void`
  - `onCreated: (deck: DeckResponseDto) => void` (lub `() => void` jeśli robimy refetch)

### `EditDeckDialog`
- **Opis**: modal do edycji nazwy talii; prefill aktualną nazwą, walidacja jak przy create, obsługa 409 („inna talia z tą nazwą”).
- **Główne elementy**: analogicznie do `CreateDeckDialog`.
- **Obsługiwane zdarzenia**:
  - `onOpenChange` + reset
  - `onSubmit` → `PUT /api/decks/{deckId}`
- **Walidacja**:
  - identyczna: trim + 1–100
  - opcjonalnie: jeśli `nameTrimmed === originalNameTrimmed` → można zablokować submit (UX), ale nie jest to wymagane przez API
- **Typy**:
  - DTO: `UpdateDeckRequestDto`, `DeckResponseDto`
  - VM: `DeckNameFormVm`, `DeckNameFormErrorsVm`
- **Propsy**:
  - `open: boolean`
  - `deck: DeckListItemVm | null` (dla prefill i deckId)
  - `onOpenChange(open: boolean): void`
  - `onUpdated: (deck: DeckResponseDto) => void` (lub `() => void` przy refetch)

### `ConfirmDeleteDialog`
- **Opis**: modal potwierdzający usunięcie talii (nieodwracalne, usuwa też fiszki).
- **Główne elementy** (shadcn):
  - `Dialog` / `AlertDialog` (jeśli dodacie shadcn `alert-dialog`)
  - opis konsekwencji
  - przyciski: „Anuluj”, „Usuń” (destructive)
  - `InlineError` dla błędu globalnego
- **Obsługiwane zdarzenia**:
  - `onConfirm` → `DELETE /api/decks/{deckId}` (oczekiwane `204`)
- **Walidacja**: brak (poza sprawdzeniem, że `deckId` istnieje).
- **Typy**:
  - `DeckListItemVm`
- **Propsy**:
  - `open: boolean`
  - `deck: DeckListItemVm | null`
  - `onOpenChange(open: boolean): void`
  - `onDeleted: (deckId: string) => void` (lub `() => void` przy refetch)

### `EmptyState`
- **Opis**: renderowany, gdy `items.length === 0` i nie trwa ładowanie; zachęca do utworzenia pierwszej talii.
- **Główne elementy**:
  - `Card` lub `div` z tekstem: „Nie masz jeszcze żadnych talii”
  - `Button`: „Utwórz pierwszą talię”
- **Obsługiwane zdarzenia**:
  - `onCreateClick`
- **Walidacja**: brak.
- **Typy**: brak.
- **Propsy**:
  - `onCreateClick: () => void`

## 5. Typy
Zalecane umiejscowienie:
- DTO: `frontend/src/lib/decks/deckTypes.ts` (lub `frontend/src/lib/api/decksTypes.ts`)
- API: `frontend/src/lib/api/decksApi.ts`

### DTO (kontrakty API)
#### `DeckResponseDto`
- `id: string` (UUID)
- `name: string`
- `flashcardCount: number`
- `createdAt: string` (ISO 8601)
- `updatedAt: string` (ISO 8601)

#### `PagedDeckResponseDto`
- `content: DeckResponseDto[]`
- `page: PageMetaDto`

#### `PageMetaDto`
- `number: number`
- `size: number`
- `totalElements: number`
- `totalPages: number`

#### `CreateDeckRequestDto`
- `name: string` (1–100 po `trim`)

#### `UpdateDeckRequestDto`
- `name: string` (1–100 po `trim`)

### ViewModel (stan UI)
#### `DeckListItemVm`
VM może być 1:1 z DTO (dla prostoty) lub minimalny:
- `id: string`
- `name: string`
- `flashcardCount: number`
- `createdAt?: string` (opcjonalnie, jeśli nie wyświetlamy)
- `updatedAt?: string`

#### `DecksListStateVm`
- `items: DeckListItemVm[]`
- `isLoading: boolean`
- `error: string | null`
- `page: PageMetaDto | null`

#### `DeckNameFormVm`
- `name: string`

#### `DeckNameFormErrorsVm`
- `name?: string`
- `formError?: string | null`

### Uwaga dot. istniejących typów błędów
Obecnie `handleApiError()` zwraca `FieldErrors` z `frontend/src/lib/auth/authTypes.ts` i parser mapuje tylko pola auth. Żeby obsłużyć walidację dla `name`, są dwie opcje:
- **Opcja A (zalecana MVP)**: rozszerzyć `FieldErrors` o `name?: string` i dodać mapowanie `fieldName === "name"` w `parseValidationErrors()`.
- **Opcja B**: zrobić lokalne parsowanie błędów w dialogach (niezalecane – duplikacja logiki).

## 6. Zarządzanie stanem
Bez dodatkowych bibliotek (spójnie z istniejącymi widokami auth):

### Stan w `DecksView`
- `items: DeckListItemVm[]`
- `isLoading: boolean` (pierwsze pobranie)
- `error: string | null` (błąd globalny listy)
- `pageMeta: PageMetaDto | null`
- `createOpen: boolean`
- `editOpen: boolean`
- `deleteOpen: boolean`
- `selectedDeck: DeckListItemVm | null` (dla edit/delete)
- `isMutating: boolean` (opcjonalnie, wspólna blokada akcji podczas POST/PUT/DELETE)

### Rekomendowany custom hook (opcjonalny, ale pomaga utrzymać czytelność)
`useDecksList()` (np. `frontend/src/lib/decks/useDecksList.ts`):
- odpowiedzialność: `listDecks()` + trzymanie `items/isLoading/error/pageMeta`
- API hooka:
  - `state: DecksListStateVm`
  - `refetch(): Promise<void>`
  - `applyCreated(deck: DeckResponseDto)`: aktualizacja listy bez refetch (opcjonalnie)
  - `applyUpdated(deck: DeckResponseDto)`
  - `applyDeleted(deckId: string)`

W MVP można też zrobić wszystko w `DecksView` bez hooka – ważne, żeby zachować prostotę.

## 7. Integracja API
### 7.1. Warstwa API (frontend)
Utworzyć `frontend/src/lib/api/decksApi.ts` z funkcjami:
- `listDecks(accessToken: string, params?: { page?: number; size?: number; sort?: string }): Promise<PagedDeckResponseDto>`
- `createDeck(accessToken: string, dto: CreateDeckRequestDto): Promise<DeckResponseDto>`
- `updateDeck(accessToken: string, deckId: string, dto: UpdateDeckRequestDto): Promise<DeckResponseDto>`
- `deleteDeck(accessToken: string, deckId: string): Promise<void>` (oparte o `fetchJson` + 204)

Każde wywołanie musi dodać header:
- `Authorization: Bearer ${accessToken}`

### 7.2. Wywołania i typy
- `GET /api/decks?page=0&size=100&sort=createdAt,desc`
  - **Response 200**: `PagedDeckResponseDto`
  - **UI akcja**: render listy
- `POST /api/decks`
  - **Request**: `CreateDeckRequestDto`
  - **Response 201**: `DeckResponseDto`
  - **UI akcja**: domknięcie modala + dodanie do listy (lub refetch)
- `PUT /api/decks/{deckId}`
  - **Request**: `UpdateDeckRequestDto`
  - **Response 200**: `DeckResponseDto`
  - **UI akcja**: domknięcie modala + aktualizacja elementu w liście (lub refetch)
- `DELETE /api/decks/{deckId}`
  - **Response 204**: brak treści
  - **UI akcja**: domknięcie modala + usunięcie z listy (lub refetch)

### 7.3. Uwaga o autoryzacji (istotne dla MVP)
`ProtectedRoute` przepuszcza tylko gdy `useAuth().isAuthenticated === true`. Aktualny `AuthProvider` przy starcie przywraca tokeny, ale nie przywraca `user`, więc po refreshu użytkownik może zostać przekierowany na `/login`.
- Jeśli to nie jest już rozwiązane w innym zadaniu, trzeba dodać mechanizm `restoreSession()` (np. zapis usera w storage lub endpoint „me”).
- Dla tego widoku zakładamy, że `accessToken` jest dostępny w kontekście.

## 8. Interakcje użytkownika
- **Wejście na `/decks`**:
  - UI pokazuje stan ładowania (np. tekst „Ładowanie…” lub skeletony kart),
  - po sukcesie renderuje grid,
  - po błędzie renderuje `InlineError` + przycisk „Spróbuj ponownie” (opcjonalnie).
- **Klik „Utwórz talię”**:
  - otwiera `CreateDeckDialog` z focusem na polu nazwy,
  - `Esc` i klik w tło zamyka modal (shadcn),
  - submit tworzy talię, pokazuje loading na przycisku.
- **Klik „Edytuj” na karcie**:
  - otwiera `EditDeckDialog` z prefill `name`,
  - submit wysyła PUT, po sukcesie aktualizuje nazwę w gridzie.
- **Klik „Usuń” na karcie**:
  - otwiera `ConfirmDeleteDialog` z nazwą talii w treści,
  - klik „Usuń” wysyła DELETE, po sukcesie usuwa kartę z gridu.
- **Klik „Otwórz”**:
  - nawigacja do `/decks/:deckId`.
- **Klik „Ucz się”**:
  - nawigacja do `/decks/:deckId/study`.

## 9. Warunki i walidacja
### Walidacja po stronie klienta (Create/Edit)
Dotyczy: `CreateDeckDialog`, `EditDeckDialog`
- `name.trim().length === 0` → błąd pola: „Nazwa talii jest wymagana”
- `name.trim().length > 100` → błąd pola: „Nazwa talii może mieć maksymalnie 100 znaków”
- submit zawsze wysyła `name: name.trim()`

### Warunki wynikające z API
Dotyczy: wszystkie requesty do `/api/decks`
- **Authorization**: requesty muszą mieć `Authorization: Bearer ...`
  - jeśli brak tokenu w UI → nie wywołuj API, pokaż błąd globalny i/lub wykonaj `logout()`.
- **409 Conflict** (duplikat nazwy):
  - Create: „Talia o tej nazwie już istnieje”
  - Edit: „Inna talia o tej nazwie już istnieje”
  - UI: preferowane jako błąd pola `name`.
- **400 Bad Request** (walidacja):
  - UI próbuje sparsować `ErrorResponseDto.message` do błędów pól (dla `name`), fallback do błędu globalnego.

## 10. Obsługa błędów
### Mapowanie statusów na UI (zalecane)
- `0` (network/fetch failure): global error „Brak połączenia lub problem z siecią. Spróbuj ponownie.”
- `400`: walidacja:
  - jeśli parser potrafi wyciągnąć `name` → pokaż pod inputem,
  - inaczej pokaż jako `InlineError` w dialogu.
- `401`: sesja wygasła / brak autoryzacji:
  - pokaż komunikat „Sesja wygasła. Zaloguj się ponownie.”
  - następnie `logout()` (czyści tokeny) i pozwól `ProtectedRoute` przekierować na `/login`.
- `409`: konflikt nazwy:
  - pokaż błąd pola `name`.
- `404`: (rzadkie na liście; częściej w PUT/DELETE gdy talia zniknęła):
  - pokaż global error „Talia nie istnieje lub została usunięta” + refetch listy.
- `500+`: global error „Wystąpił błąd serwera. Spróbuj ponownie.”

### UX dla błędów
- W dialogach: błędy walidacji przy polu + błąd globalny na górze (komponent `InlineError`).
- Na liście: błąd globalny zamiast gridu + CTA „Odśwież” (wywołuje `refetch()`).

## 11. Kroki implementacji
1. **Warstwa typów**: dodać `deckTypes.ts` z DTO i VM (`DeckResponseDto`, `PagedDeckResponseDto`, itd.).
2. **Warstwa API**: dodać `decksApi.ts` oparte o `fetchJson`, z przekazywaniem `Authorization`.
3. **Obsługa walidacji błędów pola `name`**:
   - rozszerzyć `FieldErrors` o `name?: string`,
   - zaktualizować `parseValidationErrors()` o mapowanie `name`.
4. **UI komponenty shadcn**:
   - jeśli brakuje: dodać `dialog` i (opcjonalnie) `alert-dialog` do `frontend/src/components/ui/`.
5. **Komponenty widoku**:
   - utworzyć `frontend/src/components/decks/` i dodać: `DecksHeader`, `DeckGrid`, `DeckCard`, `CreateDeckDialog`, `EditDeckDialog`, `ConfirmDeleteDialog`, `EmptyState`.
6. **Zastąpić placeholder** w `frontend/src/views/DecksView.tsx` implementacją listy:
   - pobranie `accessToken` z `useAuth()`,
   - `useEffect` → `GET /api/decks` (np. `size=100`, `sort=createdAt,desc`),
   - render: loading / error / empty / grid,
   - podpiąć dialogi i akcje kart.
7. **Aktualizacja listy po mutacjach**:
   - MVP: po create/edit/delete wykonać `refetch()` (prościej),
   - opcjonalnie: aktualizacje lokalne (dodanie/patch/usunięcie elementu) dla lepszego UX.
8. **Dostępność i UX**:
   - poprawne `aria-invalid` / `aria-describedby` dla inputu `name`,
   - focus management po otwarciu modala (shadcn),
   - blokada wielokrotnego submitu (`isSubmitting`).
9. **Smoke-check**:
   - scenariusz: pusta lista → empty state,
   - create: poprawna nazwa → pojawia się karta,
   - create: `""` / >100 → walidacja klienta,
   - create: duplikat → 409 i błąd pola,
   - edit: zmiana nazwy → update,
   - delete: potwierdzenie → usuwa kartę,
   - 401: wylogowanie i redirect do `/login`.

