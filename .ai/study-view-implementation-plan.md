# Plan implementacji widoku „Nauka” (tryb nauki)

## 1. Przegląd
Widok „Nauka” (`/decks/:deckId/study`) umożliwia użytkownikowi przeglądanie fiszek z wybranej talii w **losowej kolejności** (randomizacja po stronie backendu), z możliwością:
- odsłaniania rewersu (klik w fiszkę / Space / Enter),
- nawigacji do następnej i poprzedniej fiszki (przyciski + klawisze Left/Right),
- zobaczenia ekranu podsumowania po ostatniej fiszce,
- obsługi pustej talii (komunikat + CTA do dodania fiszek).

Widok jest chroniony (JWT) i korzysta z endpointu:
- `GET /api/decks/{deckId}/study?shuffle=true`

## 2. Routing widoku
- **Ścieżka**: `/decks/:deckId/study`
- **Parametry route**:
  - `deckId: string` (UUID w URL)
- **Ochrona**: widok powinien być opakowany w `ProtectedRoute` (tak jak `DecksView` i `DeckDetailsView`).
- **Wymagane zmiany w routerze** (`frontend/src/routes/router.tsx`):
  - dodać import: `StudyView` (np. z `@/views/StudyView`)
  - dodać trasę:
    - `path: "/decks/:deckId/study"` → `element: <StudyView />`
- **Nawigacje**:
  - z widoku talii: „Ucz się” → `/decks/:deckId/study` (już jest w `DeckDetailsView` i `DecksView`).
  - z trybu nauki:
    - „Wróć do talii” → `/decks/:deckId`
    - „Wróć do listy talii” (fallback w błędach) → `/decks`

## 3. Struktura komponentów
Zalecana struktura (spójna z istniejącym FE):
- cienki komponent routowany w `frontend/src/views/StudyView.tsx`,
- komponenty UI widoku w `frontend/src/components/study/`,
- typy DTO/VM w `frontend/src/lib/study/studyTypes.ts`,
- wywołanie API w `frontend/src/lib/api/decksApi.ts` (rozszerzenie istniejącego modułu `decksApi`).

### Drzewo komponentów (wysokopoziomowo)
- `StudyView` (route)
  - `ProtectedRoute`
    - `StudyLayout`
      - `StudyTopBar` (nazwa talii + postęp + przycisk „Wróć”)
      - **stany**:
        - loading
        - error (`InlineError` + CTA „Spróbuj ponownie”, „Wróć…”)
        - empty deck (`StudyEmptyState`)
        - in-progress session:
          - `StudyCard` (front/back, click-to-reveal)
          - `StudyControls` (Prev/Reveal/Next)
        - summary:
          - `StudySummary` (podsumowanie + CTA „Powtórz” / „Wróć do talii”)

## 4. Szczegóły komponentu

### `StudyView` (route / container)
- **Opis**: koordynuje pobranie sesji nauki z API, zarządza stanami (loading/error/empty/in-progress/summary), obsługuje nawigacje oraz skróty klawiaturowe.
- **Główne elementy**:
  - wrapper: `ProtectedRoute`
  - layout: `StudyLayout` (pełny ekran / skupienie) z kontenerem `min-h-svh` (spójne z istniejącym użyciem `min-h-svh` w `ProtectedRoute`)
  - w środku: `StudyTopBar`, `StudyCard`/`StudyControls` albo `StudySummary` albo `StudyEmptyState`
- **Obsługiwane zdarzenia**:
  - `onMount` / `onDeckIdChange` → pobranie sesji:
    - `GET /api/decks/{deckId}/study?shuffle=true`
  - `onCardClick` → toggle „reveal” (odsłonięcie/ukrycie rewersu)
  - `onRevealClick` → reveal (jeśli ukryty) / ukryj (opcjonalnie, patrz sekcja „Interakcje”)
  - `onNextClick` → przejście do następnej fiszki
  - `onPrevClick` → przejście do poprzedniej fiszki
  - `onRestartClick` (na summary) → rozpoczęcie od nowa (preferowane: refetch z `shuffle=true`, żeby dostać nową kolejność)
  - `onKeyDown` (globalnie) → skróty:
    - Left/Right: prev/next
    - Space/Enter: reveal
- **Walidacja**:
  - jeżeli `deckId` nie istnieje (`undefined`): nie wywoływać API, pokazać błąd i link do `/decks`.
  - `shuffle` w MVP: zawsze `true` (wymóg losowej kolejności).
- **Typy (DTO i ViewModel)**:
  - DTO: `StudySessionResponseDto`
  - VM: `StudySessionVm`, `StudyUiStateVm`
- **Propsy**: brak (komponent routowany).

### `StudyLayout`
- **Opis**: layout pełnoekranowy wspierający „tryb skupienia”; organizuje top bar, obszar karty i kontrolki w pionie, z dużymi hit-area.
- **Główne elementy**:
  - `div` z `min-h-svh flex flex-col` + padding
  - slot na `StudyTopBar` oraz `children`
- **Obsługiwane zdarzenia**: brak.
- **Walidacja**: brak.
- **Typy**: brak.
- **Propsy**:
  - `children: React.ReactNode`

### `StudyTopBar`
- **Opis**: pasek informacyjny: nazwa talii, postęp (np. „3 / 20”), przycisk „Wróć do talii”.
- **Główne elementy**:
  - `header` z:
    - `Button`/`Link`: „Wróć”
    - `h1`: `deckName`
    - `div`: postęp
- **Obsługiwane zdarzenia**:
  - `onBackClick` → `navigate(/decks/:deckId)`
- **Walidacja**: brak.
- **Typy**:
  - `StudyTopBarVm`
- **Propsy**:
  - `deckName: string`
  - `progressText: string` (np. `"3 / 20"`, albo `currentIndex` + `total`)
  - `onBackClick: () => void`

### `StudyCard`
- **Opis**: pojedyncza karta do nauki. Domyślnie pokazuje awers. Po odsłonięciu pokazuje rewers (flip/reveal).
- **Główne elementy**:
  - klikany kontener (np. `button` lub `div` z `role="button"` i `tabIndex=0`) o dużej powierzchni klikalnej
  - tekst:
    - gdy `isRevealed=false` → `front`
    - gdy `isRevealed=true` → `back` (opcjonalnie pokazuj też `front` jako „pytanie” w nagłówku karty)
- **Obsługiwane zdarzenia**:
  - `onToggleReveal`
  - `onKeyDown` (Enter/Space na samym komponencie) – jako alternatywa do globalnego handlera
- **Walidacja**:
  - brak walidacji pól; jedynie defensywnie: `front/back` mogą być puste tylko jeśli API zwróci niepoprawne dane (w MVP nie oczekujemy).
- **Typy**:
  - `StudyFlashcardVm`
- **Propsy**:
  - `card: StudyFlashcardVm`
  - `isRevealed: boolean`
  - `onToggleReveal: () => void`

### `StudyControls`
- **Opis**: przyciski nawigacyjne. Wymagane: Prev/Next oraz Reveal. Dostosowane do mobile (duże przyciski).
- **Główne elementy**:
  - `div` (np. `grid grid-cols-3 gap-3`)
  - `Button`:
    - „Poprzednia”
    - „Odsłoń” / „Ukryj” (tekst zależny od `isRevealed`)
    - „Następna”
- **Obsługiwane zdarzenia**:
  - `onPrev`
  - `onNext`
  - `onToggleReveal` (lub `onReveal` jeśli ma odsłaniać tylko w jedną stronę)
- **Walidacja**:
  - disable „Poprzednia” gdy `currentIndex === 0`
  - disable „Następna” gdy `currentIndex === total-1` (lub zamienia się w „Zakończ” – patrz Interakcje)
- **Typy**: brak.
- **Propsy**:
  - `canGoPrev: boolean`
  - `canGoNext: boolean`
  - `isRevealed: boolean`
  - `onPrev: () => void`
  - `onNext: () => void`
  - `onToggleReveal: () => void`

### `StudySummary`
- **Opis**: ekran po przejrzeniu ostatniej fiszki; pokazuje podsumowanie i CTA.
- **Główne elementy**:
  - tytuł (np. „Koniec sesji”)
  - tekst: „Przejrzano X fiszek”
  - CTA:
    - „Powtórz” (restart – najlepiej refetch z `shuffle=true`)
    - „Wróć do talii”
- **Obsługiwane zdarzenia**:
  - `onRestart`
  - `onBackToDeck`
- **Walidacja**: brak.
- **Typy**:
  - `StudySummaryVm` (opcjonalnie – w MVP można przekazać proste propsy)
- **Propsy**:
  - `totalCards: number`
  - `onRestart: () => void`
  - `onBackToDeck: () => void`

### `StudyEmptyState`
- **Opis**: stan pusty, gdy `totalCards === 0` (talia bez fiszek). Musi zawierać CTA do dodania fiszek.
- **Główne elementy**:
  - komunikat: „Ta talia nie ma jeszcze fiszek”
  - CTA:
    - „Wróć i dodaj fiszki” → `/decks/:deckId`
    - opcjonalnie: „Wróć do listy talii” → `/decks`
- **Obsługiwane zdarzenia**:
  - `onBackToDeck`
  - `onBackToDecksList` (opcjonalnie)
- **Walidacja**: brak.
- **Typy**: brak.
- **Propsy**:
  - `onBackToDeck: () => void`
  - `onBackToDecksList?: () => void`

## 5. Typy

### DTO (API Contracts)
Zalecane miejsce: `frontend/src/lib/study/studyTypes.ts`.

#### `StudyFlashcardDto`
- `id: string` (UUID)
- `front: string`
- `back: string`

#### `StudySessionResponseDto`
Kontrakt zgodny z `GET /api/decks/{deckId}/study`:
- `deckId: string` (UUID)
- `deckName: string`
- `totalCards: number`
- `flashcards: StudyFlashcardDto[]`

### ViewModel (UI State)
Zalecane miejsce: `frontend/src/lib/study/studyTypes.ts` (w tej samej konwencji co `deckTypes.ts` i `flashcardTypes.ts`).

#### `StudyFlashcardVm`
W MVP może być 1:1 z DTO:
- `id: string`
- `front: string`
- `back: string`

#### `StudySessionVm`
- `deckId: string`
- `deckName: string`
- `totalCards: number`
- `cards: StudyFlashcardVm[]`

#### `StudyUiStateVm`
Minimalny stan widoku (może być lokalnym state w `StudyView`, ale typ ułatwia utrzymanie):
- `isLoading: boolean`
- `error: string | null`
- `session: StudySessionVm | null`
- `currentIndex: number` (0-based)
- `isRevealed: boolean`
- `mode: "loading" | "error" | "empty" | "in-progress" | "summary"`

## 6. Zarządzanie stanem
Wariant MVP (spójny z istniejącymi widokami: state w komponencie + `useEffect` + `useCallback`):
- w `StudyView` utrzymywać:
  - `session: StudySessionResponseDto | null`
  - `isLoading: boolean`
  - `error: string | null`
  - `currentIndex: number`
  - `isRevealed: boolean`
- reguły stanu:
  - po pobraniu sesji:
    - jeśli `totalCards === 0` → widok `StudyEmptyState`
    - inaczej:
      - `currentIndex = 0`
      - `isRevealed = false`
  - po `Next` / `Prev`:
    - aktualizacja `currentIndex`
    - reset `isRevealed = false` (żeby awers był domyślny)
  - po „Powtórz” (summary):
    - refetch sesji (ponownie `shuffle=true`) i reset state

Custom hook (opcjonalny, gdy chcemy czytelniej): `useStudySession(deckId)` w `frontend/src/lib/study/useStudySession.ts`
- odpowiedzialność: fetch + mapowanie do VM + `refetch()`
- zwraca: `{ session, isLoading, error, refetch }`

## 7. Integracja API

### Wymagane wywołania API
#### `GET /api/decks/{deckId}/study`
- **Użycie w UI**: przy wejściu na widok oraz przy „Powtórz”.
- **Query params**:
  - `shuffle` (boolean, default `true`)
  - w MVP: wysyłamy `shuffle=true` zawsze.

### Zmiany w warstwie API (frontend)
Zalecane: rozszerzyć `frontend/src/lib/api/decksApi.ts` (bo endpoint jest pod `/api/decks`).

Proponowane API:
- `getStudySession(accessToken: string, deckId: string, params?: { shuffle?: boolean }): Promise<StudySessionResponseDto>`
  - budowanie URL:
    - `GET /api/decks/${deckId}/study?shuffle=true`
  - nagłówek:
    - `Authorization: Bearer ${accessToken}`

### Typy request/response
- request: brak body
- response: `StudySessionResponseDto`

## 8. Interakcje użytkownika
- **Wejście na widok**:
  - pokazujemy loading („Ładowanie…”) i pobieramy sesję.
- **Klik w fiszkę**:
  - gdy rewers ukryty → odsłoń,
  - gdy rewers odsłonięty → (opcjonalnie) ukryj; w MVP może to być toggle dla prostoty.
- **Przycisk „Odsłoń/Ukryj”**:
  - działa analogicznie do kliknięcia w kartę (toggle).
- **Przyciski „Poprzednia / Następna”**:
  - zmieniają `currentIndex` w ramach `[0, total-1]`,
  - po zmianie indeksu rewers znów ukryty.
- **Klawisze (global shortcuts)**:
  - Left → poprzednia fiszka (jeśli możliwe),
  - Right → następna fiszka (jeśli możliwe),
  - Space/Enter → odsłoń/ukryj.
  - Uwaga: handler powinien ignorować eventy, gdy focus jest w polu tekstowym (w tym widoku raczej nie ma inputów, ale warto zabezpieczyć).
- **Ostatnia fiszka**:
  - po kliknięciu „Następna” na ostatniej fiszce: przejście do `StudySummary`.
  - alternatywa (równie OK): „Następna” jest disabled na ostatniej fiszce, a poniżej pokazuje się przycisk „Zakończ” – w MVP preferuj prostotę: „Następna” przełącza na summary.
- **Podsumowanie**:
  - „Powtórz” → refetch sesji (nowa randomizacja) i start od 1. fiszki,
  - „Wróć do talii” → `/decks/:deckId`.
- **Pusta talia**:
  - komunikat + CTA „Wróć i dodaj fiszki” → `/decks/:deckId`.

## 9. Warunki i walidacja
W trybie nauki nie ma formularzy, ale są warunki sterujące UI:
- **Warunek danych**:
  - jeśli `session.totalCards === 0` → `StudyEmptyState` (z CTA).
- **Warunki nawigacji**:
  - `currentIndex` zawsze w zakresie `[0, totalCards-1]` (wymuszać w handlerach).
  - `Prev` disabled, gdy `currentIndex === 0`.
  - `Next` na ostatniej fiszce przełącza na summary (albo jest disabled + dodatkowe CTA).
- **Warunki API**:
  - autoryzacja przez `Authorization: Bearer ...` (jeśli brak `accessToken`, nie wywołuj API, pokaż błąd).
  - `shuffle` jako boolean – w MVP stałe `true` (losowa kolejność to wymaganie US-015).

## 10. Obsługa błędów
Spójna obsługa jak w `DecksView` / `DeckDetailsView`:
- **401 Unauthorized**:
  - pokazać komunikat „Sesja wygasła. Zaloguj się ponownie.”
  - wykonać `logout()` i pozwolić `ProtectedRoute` przekierować na `/login`.
- **403 Forbidden / 404 Not Found**:
  - komunikat: „Nie znaleziono talii lub nie masz do niej dostępu.”
  - CTA: „Wróć do listy talii” (`/decks`) oraz opcjonalnie „Wróć do talii” (jeśli `deckId` istnieje, ale to może nie mieć sensu przy 404).
- **0 (network) / 500+**:
  - komunikat z `getErrorMessage(err)` + przycisk „Spróbuj ponownie” (wywołuje refetch).
- **Edge-case: bardzo duża talia (>1000)**:
  - API może zwrócić dużo danych. UI powinno:
    - nie renderować listy – tylko bieżącą kartę (OK),
    - utrzymywać minimalny DOM,
    - opcjonalnie dodać ostrzeżenie UX („Duża talia – ładowanie może potrwać”) tylko jeśli faktycznie wystąpi problem; w MVP można pominąć.

## 11. Kroki implementacji
1. **Typy**
   - Dodaj `frontend/src/lib/study/studyTypes.ts` z `StudySessionResponseDto`, `StudyFlashcardDto` i VM (`StudySessionVm`, itp.).
2. **Warstwa API**
   - Rozszerz `frontend/src/lib/api/decksApi.ts` o `getStudySession(...)` i zwracaj `StudySessionResponseDto`.
3. **Routing**
   - Dodaj trasę `/decks/:deckId/study` w `frontend/src/routes/router.tsx` i import `StudyView`.
4. **Komponenty UI widoku**
   - Utwórz katalog `frontend/src/components/study/` i dodaj:
     - `StudyLayout.tsx`
     - `StudyTopBar.tsx`
     - `StudyCard.tsx`
     - `StudyControls.tsx`
     - `StudySummary.tsx`
     - `StudyEmptyState.tsx`
5. **Widok routowany**
   - Utwórz `frontend/src/views/StudyView.tsx`:
     - pobierz `deckId` z `useParams()`,
     - pobierz `accessToken/logout` z `useAuth()`,
     - pobierz sesję przez `getStudySession(accessToken, deckId, { shuffle: true })`,
     - wyrenderuj stany: loading/error/empty/in-progress/summary,
     - dodaj obsługę `Prev/Next/Reveal` + reset `isRevealed` przy zmianie indeksu.
6. **Skróty klawiaturowe**
   - Dodaj `useEffect` z `window.addEventListener("keydown", ...)` i cleanup.
   - Zadbaj o:
     - blokadę gdy `mode !== "in-progress"` (np. w summary),
     - `preventDefault()` dla Space (żeby nie scrollował).
7. **Dostępność i UX**
   - `StudyCard` jako `button` lub `div` z `role="button"`, `tabIndex=0` i opisem ARIA:
     - `aria-label` (np. „Fiszka. Naciśnij aby odsłonić odpowiedź.”).
   - Duże hit-area przycisków i czytelne focus states (Tailwind + shadcn).
8. **Checklist testów manualnych**
   - Wejście na `/decks/:deckId/study`:
     - losowa kolejność (w praktyce: 2 odpalenia „Powtórz” powinny dawać różne kolejności).
   - Reveal:
     - klik w kartę odsłania,
     - Space/Enter odsłania,
     - po `Next` rewers znów ukryty.
   - Nav:
     - Left/Right działają,
     - „Poprzednia” disabled na pierwszej,
     - po ostatniej fiszce pojawia się summary.
   - Pusta talia:
     - komunikat + CTA „Wróć i dodaj fiszki”.
   - Błędy:
     - 401 → `logout()` i redirect do `/login`,
     - 404/403 → komunikat + link do `/decks`,
     - network → retry działa.

