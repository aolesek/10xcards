# Plan implementacji widoku Historia generowań AI

## 1. Przegląd
Widok **Historia generowań AI** ma cel wyłącznie informacyjny: pokazuje tabelę ze wszystkimi wykonanymi generowaniami AI bieżącego użytkownika (paginacja).  
W tabeli prezentujemy: **data**, **model AI**, **hash source text**, **długość source text**, **liczba wygenerowanych kandydatów** oraz **liczba zaakceptowanych/edytowanych** (jeśli możliwa do wyliczenia na FE bez zmian w BE).

Brak jakichkolwiek akcji na wierszach (brak edycji, braku nawigacji z wiersza, brak „kopiuj” itp.) – tylko odczyt.

## 2. Routing widoku
- **Ścieżka**: `/ai/generations`
- **Dostęp**: tylko dla zalogowanych – widok opakowany w `ProtectedRoute` (analogicznie jak `/decks`, `/ai/review/:generationId`).
- **Wejście z widoku „Moje talie”**: przycisk/link w headerze widoku *Historia generowania AI)`/decks` prowadzący do `/ai/generations`.

## 3. Struktura komponentów
Wariant MVP (czytelny, bez nadmiarowej abstrakcji):

- `AIGenerationsHistoryView` (route)
  - `ProtectedRoute`
    - `AIGenerationsHistoryPage`
      - `AIGenerationsHistoryHeader`
      - `InlineError` (błąd globalny) / `Alert`
      - `AIGenerationsHistoryTable`
        - `AIGenerationsHistoryRow` (xN)
      - `PaginationControls` (np. prosty komponent, lub inline)
      - `EmptyState` (gdy brak elementów)

## 4. Szczegóły komponentów

### `AIGenerationsHistoryView` (route / container)
- **Opis komponentu**: główny widok routowany; odpowiada za pobranie danych z `GET /api/ai/generations`, obsługę stanów (loading/error/empty/ready) oraz render tabeli.
- **Główne elementy**:
  - wrapper: `ProtectedRoute`
  - layout: `div` w stylu innych widoków (`container mx-auto max-w-7xl px-4 py-8`)
  - `AIGenerationsHistoryHeader`
  - sekcja content: tabela / empty state / błąd
- **Obsługiwane zdarzenia**:
  - `onMount` → pobranie danych (GET)
  - `onPageChange(nextPage)` → pobranie danych dla nowej strony
  - `onRetry()` → ponowne pobranie bieżącej strony
  - `onBackToDecks()` → `navigate("/decks")`
- **Warunki walidacji**:
  - wymagany `accessToken` (z `useAuth()`); jeśli brak → błąd + nie wywoływać API
  - parametry paginacji:
    - `page >= 0`
    - `size` w zakresie `1..100` (backend i tak ogranicza `size = min(size, 100)`)
- **Typy (DTO i ViewModel)**:
  - DTO: `PagedAIGenerationResponseDto`, `AIGenerationResponseDto`, `PageMetaDto`
  - VM: `AIGenerationHistoryRowVm`, `AIGenerationsHistoryStateVm`
- **Propsy**: brak.

### `AIGenerationsHistoryHeader`
- **Opis komponentu**: nagłówek widoku (tytuł + krótki opis + nawigacja).
- **Główne elementy**:
  - `h1`: „Historia generowań AI”
  - opis: np. „Lista wszystkich generowań AI dla Twojego konta”
  - `Button` (outline/ghost): „Wróć do talii”
- **Obsługiwane zdarzenia**:
  - `onBackClick`
- **Warunki walidacji**: brak.
- **Typy**: brak.
- **Propsy**:
  - `onBackClick: () => void`

### `AIGenerationsHistoryTable`
- **Opis komponentu**: prezentacyjna tabela (shadcn `Table`) renderująca wiersze historii.
- **Główne elementy**:
  - `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`
  - kolumny:
    - Data (`createdAt` w formacie lokalnym, np. `dd.MM.yyyy HH:mm`)
    - Model AI (`aiModel`)
    - Hash (`sourceTextHash` – skrót np. pierwsze 8–12 znaków + `title` z pełną wartością)
    - Długość tekstu (`sourceTextLength`)
    - Wygenerowane (`generatedCandidatesCount`)
    - Zaakceptowane/edytowane (liczone na FE; patrz sekcja „Typy”)
- **Obsługiwane zdarzenia**: brak (tabela read-only, brak klików na wierszu).
- **Warunki walidacji**:
  - wartości liczbowe wyświetlać jako `0` jeśli API zwróci `null` (defensywnie), ale preferowane jest zachowanie kontraktu (liczby zawsze obecne).
- **Typy**:
  - `AIGenerationHistoryRowVm[]`
- **Propsy**:
  - `rows: AIGenerationHistoryRowVm[]`

### `PaginationControls` (MVP: prosty, wspólny z innymi widokami lub lokalny)
- **Opis komponentu**: kontrolki paginacji „Poprzednia / Następna” + informacja o stronie.
- **Główne elementy**:
  - `Button` prev/next
  - tekst: „Strona X z Y”
- **Obsługiwane zdarzenia**:
  - `onPrev`, `onNext`
- **Warunki walidacji**:
  - `prev` disabled gdy `page.number === 0` lub `isLoading`
  - `next` disabled gdy `page.number + 1 >= page.totalPages` lub `isLoading`
- **Typy**:
  - `PageMetaDto`
- **Propsy**:
  - `page: PageMetaDto`
  - `isLoading: boolean`
  - `onPageChange: (nextPage: number) => void`

### `EmptyState` (dla historii generowań)
- **Opis komponentu**: informacja, że użytkownik nie ma jeszcze żadnych generowań AI.
- **Główne elementy**:
  - `Card`/`div` z tekstem
  - opcjonalnie link powrotny do `/ai/generate` (UWAGA: to nawigacja, ale nie jest akcją na tabeli; jeśli interpretacja „żadnych akcji” ma być absolutna, zostawić tylko tekst i przycisk „Wróć do talii”).
- **Obsługiwane zdarzenia**:
  - ewentualnie `onBackClick`
- **Warunki walidacji**: brak.
- **Typy**: brak.
- **Propsy**:
  - `onBackClick?: () => void`

## 5. Typy

### DTO (kontrakty API)
Wykorzystujemy istniejący backendowy endpoint:
- `GET /api/ai/generations?page={number}&size={number}&sort=createdAt,desc`

Na FE dodajemy typy (proponowana lokalizacja: `frontend/src/lib/ai/aiTypes.ts` albo nowy plik `frontend/src/lib/ai/aiGenerationsTypes.ts`):

#### `PagedAIGenerationResponseDto`
- `content: AIGenerationResponseDto[]`
- `page: PageMetaDto`

#### `PageMetaDto`
Reużycie istniejącego `PageMetaDto` z `frontend/src/lib/decks/deckTypes.ts` (taki sam kształt jak `pl.olesek._xcards.deck.dto.PageInfo` z backendu):
- `number: number`
- `size: number`
- `totalElements: number`
- `totalPages: number`

### ViewModel (modele widoku)
Widok jest read-only, więc VM służy głównie do:
- formatowania daty,
- skracania hasha,
- policzenia „zaakceptowanych/edytowanych” bez zmian BE.

#### `AIGenerationHistoryRowVm`
- `id: string` (UUID) – technicznie nie wyświetlamy, ale przydatne jako `key`
- `createdAt: string` (ISO, z API)
- `createdAtLabel: string` (sformatowana data do UI)
- `aiModel: string`
- `sourceTextHash: string`
- `sourceTextHashShort: string` (np. `abcdef12…`)
- `sourceTextLength: number`
- `generatedCandidatesCount: number`
- `acceptedOrEditedCandidatesCount: number | null`
  - **MVP (bez zmian w BE)**: liczone jako liczba kandydatów o `status in ["accepted", "edited"]` na podstawie `AIGenerationResponseDto.candidates`.
  - jeśli kiedyś BE zwróci listę bez `candidates`, ustawiamy `null` i w UI pokazujemy `—`.

#### `AIGenerationsHistoryStateVm`
- `rows: AIGenerationHistoryRowVm[]`
- `isLoading: boolean`
- `error: string | null`
- `page: PageMetaDto | null`
- `query: { page: number; size: number; sort: string }`

## 6. Zarządzanie stanem
W `AIGenerationsHistoryView`:
- `rows: AIGenerationHistoryRowVm[]`
- `isLoading: boolean`
- `error: string | null`
- `pageMeta: PageMetaDto | null`
- `page: number` (0-based)
- `size: number` (domyślnie 20, opcjonalnie 50)

Opcjonalny custom hook (zalecany dla czytelności):
`useAIGenerationsHistory(query)`:
- odpowiada za `fetch()` + mapowanie DTO → VM,
- obsługuje `AbortController` (anulowanie requestu przy unmount / szybkim przełączaniu stron),
- udostępnia `setPage`, `retry`.

## 7. Integracja API

### Wymagane wywołanie
**GET `/api/ai/generations`**
- **Headers**: `Authorization: Bearer {accessToken}`
- **Query params**:
  - `page` (domyślnie 0)
  - `size` (domyślnie 20, max 100)
  - `sort` (domyślnie `createdAt,desc`)
- **Response 200**: `PagedAIGenerationResponseDto`
  - `content[]` elementy zgodne z `AIGenerationResponseDto` (obecnie zawierają także `candidates`)

### FE warstwa API
Plik: `frontend/src/lib/api/aiApi.ts`
- dodać funkcję:
  - `listAIGenerations(accessToken: string, params?: { page?: number; size?: number; sort?: string }, signal?: AbortSignal): Promise<PagedAIGenerationResponseDto>`

## 8. Interakcje użytkownika
- **Wejście z `/decks`**:
  - klik w przycisk „Historia generowań AI” → nawigacja do `/ai/generations`.
- **Wejście na `/ai/generations`**:
  - pokazanie stanu ładowania (np. tekst „Ładowanie historii…”),
  - po sukcesie: tabela + paginacja,
  - gdy `content.length === 0`: empty state.
- **Paginacja**:
  - klik „Następna/Poprzednia” odpala pobranie nowej strony,
  - przyciski disabled podczas `isLoading`.
- **Retry po błędzie**:
  - przycisk „Spróbuj ponownie” ponawia request dla bieżącego `page/size/sort`.

## 9. Warunki i walidacja
- **Warunek autoryzacji**:
  - przed wywołaniem API upewnić się, że `accessToken` istnieje,
  - w przeciwnym razie wyświetlić błąd i nie wykonywać requestu.
- **Walidacja parametrów paginacji**:
  - `page` trzymać jako number >= 0,
  - `size` w zakresie `1..100` (w UI ograniczyć wybór tylko do bezpiecznych wartości),
  - `sort` ustawić stałe `createdAt,desc` (MVP bez UI sortowania).
- **Kolumna „zaakceptowane/edytowane”**:
  - liczymy wyłącznie na podstawie `candidates` (bez dodatkowych wywołań i bez zmian w BE),
  - jeśli `candidates` nieobecne: wyświetlić `—`.

## 10. Obsługa błędów
Mapowanie statusów na zachowanie UI (spójnie z `DecksView` i widokami AI):
- **401 Unauthorized**:
  - komunikat „Sesja wygasła. Zaloguj się ponownie.”
  - `logout()` i pozwolenie `ProtectedRoute` na przekierowanie do `/login`.
- **0 / network**:
  - komunikat „Brak połączenia lub problem z siecią. Spróbuj ponownie.”
  - przycisk retry.
- **403** (jeśli kiedyś dojdzie, choć endpoint listujący po userId powinien zwracać 401, nie 403):
  - komunikat „Brak dostępu.”
- **500+**:
  - komunikat „Wystąpił błąd serwera. Spróbuj ponownie.”

## 11. Kroki implementacji
1. **Routing**: dodać trasę `/ai/generations` w `frontend/src/routes/router.tsx` wskazującą na nowy widok `AIGenerationsHistoryView`.
2. **Widok FE**: utworzyć `frontend/src/views/ai/AIGenerationsHistoryView.tsx` (analogiczny układ do `DecksView`: ProtectedRoute, loading/error/empty).
3. **API client**: w `frontend/src/lib/api/aiApi.ts` dodać `listAIGenerations(...)`.
4. **Typy**:
   - dodać `PagedAIGenerationResponseDto` (oraz ewentualnie re-export `PageMetaDto`) w `frontend/src/lib/ai/aiTypes.ts` lub dedykowanym pliku typów AI.
5. **Komponenty UI**:
   - `frontend/src/components/ai/history/AIGenerationsHistoryHeader.tsx`
   - `frontend/src/components/ai/history/AIGenerationsHistoryTable.tsx`
   - (opcjonalnie) `frontend/src/components/common/PaginationControls.tsx` jeśli nie istnieje
6. **Nawigacja z „Moje talie”**:
   - w `frontend/src/components/decks/DecksHeader.tsx` dodać nowy przycisk „Historia generowań AI” i nowy prop `onAiGenerationsHistoryClick`.
   - w `frontend/src/views/DecksView.tsx` dodać handler `navigate("/ai/generations")` i przekazać do `DecksHeader`.
7. **Mapowanie DTO → VM**:
   - w widoku/hooku przygotować `AIGenerationHistoryRowVm`:
     - `createdAtLabel` (formatowanie daty),
     - `sourceTextHashShort`,
     - `acceptedOrEditedCandidatesCount = candidates.filter(status in accepted|edited).length` (fallback do `null`).
8. **Smoke-check**:
   - użytkownik bez generowań → empty state,
   - użytkownik z generowaniami → tabela, poprawne wartości, działa paginacja,
   - błąd 401 → wylogowanie i redirect,
   - błąd sieci/500 → komunikat + retry.
