## Plan implementacji widoku 404 („Nie znaleziono”)

## 1. Przegląd
Widok **404** jest bezpiecznym fallbackiem dla nieistniejących tras (`*`). Jego celem jest:
- poinformować użytkownika, że strona nie istnieje,
- **nie ujawniać szczegółów technicznych** (brak stack trace, brak nazw endpointów),
- zapewnić prostą nawigację powrotną: **do `/decks` (gdy zalogowany)** lub **do `/login` (gdy niezalogowany)**,
- utrzymać spójny styl UI z aplikacją (Tailwind + shadcn/ui).

## 2. Routing widoku
- **Ścieżka**: `*` (catch-all)
- **Miejsce rejestracji**: `frontend/src/routes/router.tsx`
- **Zasada kolejności**: trasa `*` powinna być **ostatnia** w tablicy `createBrowserRouter([...])`, aby nie przechwytywać istniejących tras.
- **Dostępność**: widok powinien być dostępny zarówno dla użytkowników zalogowanych, jak i niezalogowanych (bez `ProtectedRoute`).

## 3. Struktura komponentów
Główne elementy:
- `NotFoundView` (kontener widoku, logika wyboru CTA na podstawie auth)
- `NotFoundState` (komponent prezentacyjny z tekstem + przyciskiem/przyciskami)

Proponowane lokalizacje plików:
- `frontend/src/views/NotFoundView.tsx`
- `frontend/src/components/common/NotFoundState.tsx` (lub `frontend/src/components/routing/NotFoundState.tsx` – zależnie od konwencji w repo)

## 4. Szczegóły komponentów
### `NotFoundView`
- **Opis**: Kontener strony 404. Odpowiada za:
  - wybór docelowej ścieżki CTA (`/decks` vs `/login`) zależnie od stanu zalogowania,
  - obsługę nawigacji (np. `useNavigate`) i ewentualnie przycisku „Wróć” (nawigacja wstecz).
- **Główne elementy**:
  - wrapper layoutu: `div.container mx-auto max-w-7xl px-4 py-8` (spójnie z `DecksView`)
  - `NotFoundState` jako jedyna zawartość w środku
- **Obsługiwane zdarzenia**:
  - `onPrimaryAction` → nawigacja do `/decks` albo `/login`
  - opcjonalnie `onBack` → `navigate(-1)` (jeśli repo używa takiego wzorca; przydatne jako „Wróć”)
- **Warunki walidacji**:
  - brak walidacji formularzy,
  - logika warunkowa tylko na podstawie stanu auth:
    - jeśli `isLoading === true`: pokazać prosty „Ładowanie...” (albo skeleton) zamiast CTA, aby nie migał link,
    - jeśli `isLoading === false`:
      - `isAuthenticated === true` → CTA do `/decks`
      - `isAuthenticated === false` → CTA do `/login`
- **Typy (DTO i ViewModel)**:
  - brak DTO (brak integracji API),
  - `NotFoundCtaVm` (ViewModel) wyliczany w komponencie na bazie `useAuth()`.
- **Propsy**:
  - brak (widok routowany bezpośrednio w routerze).

### `NotFoundState`
- **Opis**: Prezentacyjny komponent UI „nie znaleziono” zgodny ze stylem aplikacji. Powinien:
  - pokazać krótki komunikat (bez detali technicznych),
  - zapewnić 1–2 akcje (primary CTA + ewentualnie secondary „Wróć”),
  - być responsywny i dostępny (czytelny nagłówek, poprawne role).
- **Główne elementy** (shadcn/ui + Tailwind):
  - `Card` (opcjonalnie `className="border-dashed"` jak w innych empty state)
  - `CardContent` z układem `flex flex-col items-center justify-center py-12 text-center`
  - `h1`/`h2` z tytułem (np. „Nie znaleziono strony”)
  - `p` z opisem (np. „Ta strona nie istnieje lub została przeniesiona.”)
  - `Button` primary (np. „Przejdź do talii” / „Przejdź do logowania”)
  - opcjonalny `Button` secondary `variant="outline"` (np. „Wróć”)
- **Obsługiwane zdarzenia**:
  - kliknięcie primary CTA (`onPrimaryAction`)
  - opcjonalnie kliknięcie secondary CTA (`onSecondaryAction`)
- **Warunki walidacji**:
  - jeśli `isPrimaryDisabled === true` (np. podczas `isLoading`), przycisk ma `disabled`
  - treści tekstowe nie powinny zależeć od błędów technicznych (brak renderowania `error.message`)
- **Typy (DTO i ViewModel)**:
  - `NotFoundStateProps` (props komponentu)
- **Propsy**:
  - `title: string`
  - `description: string`
  - `primaryActionLabel: string`
  - `onPrimaryAction: () => void`
  - `secondaryActionLabel?: string`
  - `onSecondaryAction?: () => void`
  - `isPrimaryDisabled?: boolean`

## 5. Typy
### DTO
Brak – widok 404 nie wykonuje requestów do backendu.

### ViewModel
#### `NotFoundCtaVm`
- **Opis**: Minimalny model prezentacyjny wyliczany w `NotFoundView`.
- **Pola**:
  - `primaryHref: "/decks" | "/login"` (docelowa ścieżka)
  - `primaryLabel: string` (np. „Wróć do talii” / „Przejdź do logowania”)
  - `showBack: boolean` (czy pokazać dodatkowy przycisk „Wróć” – opcjonalnie)

### Props
#### `NotFoundStateProps`
Jak w sekcji komponentu `NotFoundState`:
- `title: string`
- `description: string`
- `primaryActionLabel: string`
- `onPrimaryAction: () => void`
- `secondaryActionLabel?: string`
- `onSecondaryAction?: () => void`
- `isPrimaryDisabled?: boolean`

## 6. Zarządzanie stanem
Widok jest niemal bezstanowy. Wystarczą:
- **Źródło stanu**: `useAuth()`:
  - `isLoading` – czy trwa odtwarzanie sesji (np. z `localStorage` + `getCurrentUser`)
  - `isAuthenticated` – czy użytkownik jest zalogowany
- **Stan lokalny**: nie jest wymagany (brak formularzy, brak requestów).
- **Custom hook**: nie jest konieczny; ewentualnie można wydzielić czystą funkcję:
  - `getNotFoundCta(isLoading, isAuthenticated): NotFoundCtaVm`
  aby ułatwić testowanie i utrzymać porządek w widoku.

## 7. Integracja API
Brak.

Powiązanie z backendem jest pośrednie tylko przez `AuthProvider` (odtwarzanie sesji), ale 404 **nie powinien inicjować** nowych wywołań API.

## 8. Interakcje użytkownika
- **Wejście na nieistniejącą trasę**:
  - renderuje się `NotFoundView` + `NotFoundState`.
- **Kliknięcie primary CTA**:
  - gdy zalogowany → przejście do `/decks`
  - gdy niezalogowany → przejście do `/login`
- **Kliknięcie „Wróć” (opcjonalnie)**:
  - nawigacja wstecz `navigate(-1)`
  - jeśli historia jest pusta / niepożądana, jako fallback można kierować na primary CTA

## 9. Warunki i walidacja
Warunki weryfikowane po stronie UI (bez API):
- **Auth loading**:
  - `isLoading === true` → nie pokazuj agresywnych przekierowań; pokaż neutralny stan ładowania lub wyłącz CTA (`disabled`).
- **Dobór linku**:
  - `isAuthenticated === true` → primary CTA do `/decks`
  - `isAuthenticated === false` → primary CTA do `/login`
- **Bezpieczeństwo komunikatu**:
  - brak wyświetlania ścieżki URL jako „błędu” (opcjonalnie można pokazać, ale wg UI-plan: „brak ujawniania szczegółów technicznych”; rekomendacja: nie pokazywać pełnej ścieżki lub sanitizować).

## 10. Obsługa błędów
Potencjalne przypadki brzegowe i rekomendacje:
- **`useAuth` poza providerem**: w tym repo `AuthProvider` otacza całą aplikację w `main.tsx`, więc nie powinno wystąpić; mimo to nie implementować try/catch w widoku (błąd programistyczny).
- **Migotanie CTA przy odtwarzaniu sesji**:
  - użyć `isLoading` i w tym czasie ukryć CTA albo wyłączyć przycisk (preferowane: prosty stan „Ładowanie...”).
- **Nawigacja wstecz prowadzi z powrotem na 404**:
  - jeśli dodasz przycisk „Wróć”, rozważ fallback: gdy `location.key === "default"` lub po cofnięciu nadal `*`, to kieruj na primary CTA (opcjonalnie; zależne od UX).

## 11. Kroki implementacji
1. **Utwórz komponent prezentacyjny** `NotFoundState`:
   - oprzyj UI o `Card`, `CardContent`, `Button` (jak inne empty state),
   - dodaj tytuł + opis + primary CTA (+ opcjonalnie secondary).
2. **Utwórz widok** `NotFoundView`:
   - pobierz `isLoading` i `isAuthenticated` z `useAuth()`,
   - wylicz `NotFoundCtaVm` i przekaż do `NotFoundState`,
   - obsłuż `onPrimaryAction` przez `useNavigate()`.
3. **Podepnij routing**:
   - w `src/routes/router.tsx` dodaj trasę `{ path: "*", element: <NotFoundView /> }` jako ostatnią.
4. **Spójność UX**:
   - upewnij się, że teksty są krótkie, nietechniczne, po polsku,
   - CTA zgodne z UI-plan: link do `/decks` lub `/login`.
5. **Szybka weryfikacja manualna**:
   - niezalogowany: wejście na `/asdf` → 404 → CTA prowadzi do `/login`,
   - zalogowany: wejście na `/asdf` → 404 → CTA prowadzi do `/decks`.
