# Architektura UI dla 10xCards

## 1. Przegląd struktury UI

10xCards (MVP) to aplikacja webowa z prostą nawigacją i minimalną liczbą ekranów, skupiona na trzech głównych zadaniach użytkownika:

- **Uwierzytelnienie i sesja**: rejestracja/logowanie/odzyskiwanie hasła + utrzymanie sesji JWT.
- **Zarządzanie treścią**: talie (decks) i fiszki (flashcards) w obrębie konta użytkownika.
- **AI flow**: generowanie fiszek z tekstu → loading → przegląd kandydatów (utrwalony na backendzie) → zapis wsadowy.

Założenia architektury UI (wynikające z PRD + API + session notes):

- **Mobile-first i responsywność**: siatki kart 1 kolumna (mobile), 2 (tablet), 3 (desktop).
- **Nawigacja**: top navigation na desktopie + hamburger/`Sheet` na mobile.
- **Brak cache w MVP**: po każdej mutacji wykonujemy refetch danych z API (zawsze świeże).
- **Shadcn/ui**: komponenty w domyślnej lokalizacji `src/components/ui/`, własne w `src/components/shared/`.
- **Flow AI**: formularz → loading → review z `generationId` w URL (`/ai/review/:generationId`).
- **Stany UI**: proste i spójne (loading/success/error) + toast/alert. W miejscach w ktorych toasty będą trudniejsze niż inline error, robimy inline error - preferujemy najłatwiejsze rozwiązanie.
- **Auth na FE**: React Context API + localStorage (MVP).

## 2. Lista widoków

Poniżej komplet widoków wymaganych do MVP, wraz z mapowaniem na endpointy API oraz elementami UX/dostępności/bezpieczeństwa.

### 2.1. Publiczne (bez zalogowania)

#### 1) Logowanie
- **Nazwa widoku**: Logowanie
- **Ścieżka widoku**: `/login`
- **Główny cel**: umożliwić wejście do aplikacji i ustanowienie sesji.
- **Kluczowe informacje do wyświetlenia**:
  - pola: e-mail, hasło
  - linki: „Załóż konto”, „Zapomniałem hasła”
  - komunikaty: błędne dane, limit prób (429)
- **Kluczowe komponenty widoku**:
  - `AuthCard` (kontener formularza)
  - `LoginForm` (walidacja klienta + trim)
  - `InlineError` / `Alert` (błędy)
  - `LoadingButton`
- **Integracja API**:
  - `POST /api/auth/login`
  - obsługa `401`, `429`
- **UX, dostępność i względy bezpieczeństwa**:
  - etykiety pól i komunikaty walidacyjne powiązane z polami (aria)
  - blokada wielokrotnego submitu + czytelny stan ładowania
  - brak ujawniania szczegółów (np. „konto istnieje/nie istnieje”) poza tym, co zwraca API
  - po sukcesie: redirect do `/decks` (widok startowy po zalogowaniu)

#### 2) Rejestracja
- **Nazwa widoku**: Rejestracja
- **Ścieżka widoku**: `/register`
- **Główny cel**: utworzyć konto i (zgodnie z PRD) automatycznie zalogować użytkownika.
- **Kluczowe informacje do wyświetlenia**:
  - pola: e-mail, hasło
  - wymagania hasła (czytelny opis + walidacja)
  - komunikaty: konflikt e-mail (409), walidacja (400)
- **Kluczowe komponenty widoku**:
  - `RegisterForm`
  - `PasswordRequirementsHint`
  - `LoadingButton`, `InlineError`
- **Integracja API**:
  - `POST /api/auth/register`
- **UX, dostępność i względy bezpieczeństwa**:
  - walidacja: regex e-mail + reguły hasła (min 8, uppercase/lowercase/digit/special)
  - komunikat konfliktu 409 bez sugerowania „co dokładnie jest w bazie” (ale 409 jest wystarczająco precyzyjne)
  - po sukcesie: zapis tokenów + redirect do `/decks`

#### 3) Reset hasła — prośba o link
- **Nazwa widoku**: Reset hasła (prośba)
- **Ścieżka widoku**: `/password-reset/request`
- **Główny cel**: wysłać prośbę o link resetujący.
- **Kluczowe informacje do wyświetlenia**:
  - pole: e-mail
  - komunikat zawsze „jeśli konto istnieje…” (nieujawniający)
  - komunikaty: rate limit (429)
- **Kluczowe komponenty widoku**:
  - `PasswordResetRequestForm`
  - `InfoAlert` z odpowiedzią nieujawniającą
- **Integracja API**:
  - `POST /api/auth/password-reset/request`
- **UX, dostępność i względy bezpieczeństwa**:
  - stały komunikat powodzenia niezależny od istnienia konta
  - czytelny timer/komunikat dla 429 („spróbuj później”)

#### 4) Reset hasła — ustawienie nowego hasła
- **Nazwa widoku**: Reset hasła (potwierdzenie)
- **Ścieżka widoku**: `/password-reset/confirm?token=...`
- **Główny cel**: ustawić nowe hasło na podstawie tokenu z linku.
- **Kluczowe informacje do wyświetlenia**:
  - token pobrany z query string (ukryty przed użytkownikiem)
  - pole: nowe hasło (+ wymagania)
  - komunikaty: token niepoprawny/expired (400/410)
- **Kluczowe komponenty widoku**:
  - `PasswordResetConfirmForm`
  - `PasswordRequirementsHint`
- **Integracja API**:
  - `POST /api/auth/password-reset/confirm`
- **UX, dostępność i względy bezpieczeństwa**:
  - po sukcesie: redirect do `/login` z komunikatem „hasło zmienione”
  - po 410: CTA do ponowienia prośby o reset

### 2.2. Chronione (wymagają zalogowania)

> Wszystkie poniższe widoki są opakowane w `ProtectedRoute` i renderowane w `AppShell` z top navigation + mobile sheet.

#### 5) Lista talii (widok startowy)
- **Nazwa widoku**: Moje talie
- **Ścieżka widoku**: `/decks`
- **Główny cel**: szybki dostęp do talii i akcji MVP (wejście, edycja nazwy, usunięcie, nauka).
- **Kluczowe informacje do wyświetlenia**:
  - lista talii jako siatka kart: nazwa, `flashcardCount`
  - empty state: „Utwórz pierwszą talię”
- **Kluczowe komponenty widoku**:
  - `DeckGrid`
  - `DeckCard` (akcje: Otwórz, Edytuj, Usuń, Ucz się)
  - `CreateDeckDialog` (modal)
  - `EditDeckDialog` (modal)
  - `ConfirmDeleteDialog`
  - `EmptyState`
- **Integracja API**:
  - `GET /api/decks`
  - `POST /api/decks`
  - `PUT /api/decks/{deckId}`
  - `DELETE /api/decks/{deckId}`
- **UX, dostępność i względy bezpieczeństwa**:
  - walidacja nazwy talii: trim, 1–100 znaków
  - obsługa 409 (duplikat nazwy) jako komunikat w dialogu
  - fokus i klawiatura w dialogach (Shadcn)
  - po usunięciu: refetch listy

#### 6) Szczegóły talii + fiszki
- **Nazwa widoku**: Talia
- **Ścieżka widoku**: `/decks/:deckId`
- **Główny cel**: zarządzanie fiszkami w danej talii (lista + CRUD) oraz start trybu nauki.
- **Kluczowe informacje do wyświetlenia**:
  - nagłówek: nazwa talii, liczba fiszek
  - lista fiszek jako karty: front/back (skrócone), `source` (np. badge), akcje
  - brak filtrów źródła w MVP (zgodnie z sesją)
- **Kluczowe komponenty widoku**:
  - `DeckHeader` (title + CTA: „Dodaj fiszkę”, „Ucz się”)
  - `FlashcardList` (karty)
  - `FlashcardCard` (akcje: Edytuj, Usuń)
  - `CreateFlashcardDialog` (modal)
  - `EditFlashcardDialog` (modal)
  - `ConfirmDeleteDialog`
- **Integracja API**:
  - `GET /api/decks/{deckId}` (opcjonalnie dla nagłówka)
  - `GET /api/decks/{deckId}/flashcards`
  - `POST /api/decks/{deckId}/flashcards`
  - `PUT /api/flashcards/{flashcardId}`
  - `DELETE /api/flashcards/{flashcardId}`
- **UX, dostępność i względy bezpieczeństwa**:
  - walidacja fiszki: trim front/back, 1–500 znaków
  - źródło fiszki: UI pokazuje `manual` / `ai` / `ai-edited` (badge), a zmiana `ai`→`ai-edited` dzieje się w backendzie podczas edycji (`PUT`)
  - stany: „brak fiszek” z CTA „Dodaj fiszkę”
  - obsługa 403/404: komunikat + link powrotu do `/decks`

#### 7) Tryb nauki
- **Nazwa widoku**: Nauka
- **Ścieżka widoku**: `/decks/:deckId/study`
- **Główny cel**: proste przeglądanie fiszek w losowej kolejności z odsłanianiem rewersu i nawigacją.
- **Kluczowe informacje do wyświetlenia**:
  - nazwa talii, postęp (np. „3 / 20”)
  - fiszka: awers (domyślnie), rewers po odsłonięciu
  - ekran podsumowania po ostatniej fiszce
- **Kluczowe komponenty widoku**:
  - `StudyLayout` (pełny ekran / skupienie)
  - `StudyCard` (flip/reveal)
  - `StudyControls` (Prev/Next/Reveal)
  - `StudySummary`
- **Integracja API**:
  - `GET /api/decks/{deckId}/study?shuffle=true`
- **UX, dostępność i względy bezpieczeństwa**:
  - skróty klawiaturowe: Left/Right (prev/next), Space/Enter (reveal)
  - wyraźne stany focus, duże hit-area dla przycisków (mobile)
  - obsługa pustej talii: komunikat + CTA do dodania fiszek

#### 8) Generowanie fiszek przez AI (formularz)
- **Nazwa widoku**: Generuj fiszki (AI)
- **Ścieżka widoku**: `/ai/generate`
- **Główny cel**: wkleić tekst i wygenerować kandydatów, wybierając docelową talię lub tworząc nową.
- **Kluczowe informacje do wyświetlenia**:
  - wybór talii (select) + opcja utworzenia nowej talii (modal w tym samym flow)
  - pole tekstowe `sourceText` (500–10 000 znaków) + licznik znaków
  - informacja o limicie AI (jeśli dostępna z auth payload lub z `/api/users/me`)
- **Kluczowe komponenty widoku**:
  - `AIGenerateForm`
  - `DeckSelect` + `InlineCreateDeckDialog`
  - `TextareaWithCounter`
  - `ErrorAlert` / `Toast`
- **Integracja API**:
  - `GET /api/decks` (aby zasilić select)
  - `POST /api/decks` (tworzenie talii w flow)
  - `POST /api/ai/generate` (start generacji)
  - opcjonalnie: `GET /api/users/me` (jeśli chcemy pewnie pokazać limit/zużycie)
- **UX, dostępność i względy bezpieczeństwa**:
  - walidacja długości tekstu przed submit (500–10 000) + trim
  - obsługa 403 limitu AI: jasny komunikat i brak „proaktywnego” ostrzegania (zgodnie z PRD), ale po błędzie pokazujemy powód
  - po sukcesie: redirect do `/ai/loading?generationId=...&deckId=...` lub od razu do `/ai/review/:generationId` z natychmiastowym loading state (patrz kolejny widok)

#### 9) Generowanie AI — loading
- **Nazwa widoku**: Generowanie (loading)
- **Ścieżka widoku**: `/ai/loading?generationId=...` (lub stan loading w `/ai/review/:generationId`)
- **Główny cel**: nie blokować UI; komunikować, że trwa generowanie i zaraz przejdziemy do przeglądu.
- **Kluczowe informacje do wyświetlenia**:
  - spinner/progress + losowy „fakt edukacyjny” (20 zahardkodowanych faktów)
  - CTA „Anuluj i wróć” (bez anulowania po API — tylko nawigacja)
- **Kluczowe komponenty widoku**:
  - `AITriviaLoading` (fakty)
  - `Spinner`
- **Integracja API**:
  - w praktyce: poll / fetch `GET /api/ai/generations/{generationId}` aż `candidates` dostępne (albo pojedynczy fetch, jeśli backend zwraca od razu)
- **UX, dostępność i względy bezpieczeństwa**:
  - czytelny fallback przy długim czasie/503: komunikat + „Spróbuj ponownie”
  - brak wrażliwych danych w faktach (statyczne treści)

#### 10) Przegląd kandydatów AI
- **Nazwa widoku**: Przegląd fiszek (AI Review)
- **Ścieżka widoku**: `/ai/review/:generationId`
- **Główny cel**: przejrzeć kandydatów, zaakceptować/odrzucić/edytować, a następnie zapisać wsadowo.
- **Kluczowe informacje do wyświetlenia**:
  - nagłówek: liczba kandydatów, status postępu (np. „zaakceptowane/odrzucone/edytowane”)
  - siatka kart kandydatów z akcjami: Akceptuj, Odrzuć, Edytuj
  - banner „postęp zapisany” / „zmiany nie zapisane” (w zależności od strategii zapisu)
- **Kluczowe komponenty widoku**:
  - `AIGenerationHeader` (CTA: „Zapisz do talii”)
  - `CandidateGrid`
  - `CandidateCard` (status + akcje)
  - `EditCandidateDialog` (modal edycji front/back)
  - `SaveBar` (opcjonalnie: „Zapisz postęp” / autosave status)
- **Integracja API**:
  - `GET /api/ai/generations/{generationId}` (pobranie i odświeżanie stanu)
  - `PATCH /api/ai/generations/{generationId}/candidates` (zmiana statusów / zapis edycji)
  - `POST /api/ai/generations/{generationId}/save` (wsadowy zapis zaakceptowanych/edytowanych)
- **UX, dostępność i względy bezpieczeństwa**:
  - edycja w modalu z walidacją 1–500 znaków (jak fiszki)
  - odporność na refresh: `generationId` w URL, stan ładowany z backendu
  - obsługa 400 (brak zaakceptowanych do zapisu): komunikat + wskazówka „zaakceptuj choć jedną”
  - obsługa 404 (generation nie istnieje / deck usunięty przed zapisem): komunikat + powrót do `/ai/generate` lub `/decks`

#### 11) „Nie znaleziono” / błędy routingu
- **Nazwa widoku**: 404
- **Ścieżka widoku**: `*`
- **Główny cel**: bezpieczny fallback dla nieistniejących tras.
- **Kluczowe informacje do wyświetlenia**: krótki komunikat + link do `/decks` lub `/login`.
- **Kluczowe komponenty widoku**: `NotFoundState`
- **UX, dostępność i względy bezpieczeństwa**:
  - brak ujawniania szczegółów technicznych
  - przycisk „Wróć”

## 3. Mapa podróży użytkownika

### 3.1. Główny przypadek użycia (AI → zapis → nauka)

1) **Wejście do aplikacji**
- Użytkownik trafia na `/login` (lub jest przekierowany z `/`).
- Loguje się (`POST /api/auth/login`) → zapis tokenów → redirect `/decks`.

2) **Wybór / utworzenie talii**
- Na `/decks` widzi siatkę talii (`GET /api/decks`).
- Jeśli brak talii: tworzy pierwszą (`POST /api/decks`) z modala → refetch listy → widzi nową talię.

3) **Generowanie AI**
- Przechodzi do `/ai/generate` z top nav.
- Wybiera talię (z listy pobranej `GET /api/decks`) i wkleja tekst (500–10 000).
- Klik „Generuj” → `POST /api/ai/generate`:
  - sukces: otrzymuje `generationId` → przejście do loading/review
  - błąd: pokazujemy komunikat zależny od kodu (np. 403 limit, 503 AI, 400 walidacja)

4) **Loading**
- UI pokazuje `AITriviaLoading` i pobiera `GET /api/ai/generations/{generationId}` aż ma dane do renderu (lub pojedynczy fetch, jeśli backend zwraca od razu).

5) **Review kandydatów**
- Użytkownik na `/ai/review/:generationId` widzi kandydatów.
- Dla każdego kandydata: Akceptuj/Odrzuć/Edytuj (modal) → zapis stanu do backendu przez `PATCH /api/ai/generations/{generationId}/candidates`:
  - rekomendacja MVP: **zapis „na bieżąco” z debounce** (prosto dla użytkownika i odporne na refresh/wyjście)

6) **Zapis do talii**
- Klik „Zapisz” → `POST /api/ai/generations/{generationId}/save`.
- Po sukcesie: redirect do `/decks/:deckId` (deckId dostępne w payload generacji lub utrzymane w stanie) → refetch fiszek.

7) **Nauka**
- Na `/decks/:deckId` klik „Ucz się” → `/decks/:deckId/study` → `GET /api/decks/{deckId}/study`.
- Przegląda fiszki → po końcu widzi podsumowanie → powrót do talii lub losowanie od nowa.

### 3.2. CRUD fiszek (manual)

- `/decks/:deckId` → „Dodaj fiszkę” → modal → `POST /api/decks/{deckId}/flashcards` → refetch listy.
- `FlashcardCard` → „Edytuj” → modal → `PUT /api/flashcards/{flashcardId}` → refetch.
- `FlashcardCard` → „Usuń” → confirm → `DELETE /api/flashcards/{flashcardId}` → refetch.

### 3.3. Odzyskiwanie hasła

- `/login` → „Zapomniałem hasła” → `/password-reset/request` → `POST /api/auth/password-reset/request` → komunikat „jeśli konto istnieje…”
- Użytkownik klika link z maila → `/password-reset/confirm?token=...` → `POST /api/auth/password-reset/confirm` → po sukcesie `/login`.

## 4. Układ i struktura nawigacji

### 4.1. Struktura globalna (AppShell)

- **Desktop**: top navigation
  - **Brand** (klik → `/decks`)
  - **Linki**: „Moje talie” (`/decks`), „Generuj fiszki” (`/ai/generate`)
  - **Menu użytkownika**: e-mail + „Wyloguj”
- **Mobile**: hamburger → `Sheet`
  - te same linki + „Wyloguj”

### 4.2. Routing i ochrona tras

- `ProtectedRoute`:
  - jeśli brak sesji → redirect `/login`
  - jeśli `401` z API i refresh nieudany → `logout()` + redirect `/login`
- Publiczne trasy:
  - `/login`, `/register`, `/password-reset/*`
  - jeśli użytkownik już zalogowany → redirect `/decks`

### 4.3. Nawigacja kontekstowa (wewnątrz widoków)

- `/decks`: CTA „Utwórz talię”
- `/decks/:deckId`: CTA „Dodaj fiszkę”, „Ucz się”
- `/ai/generate`: CTA „Utwórz nową talię” w obrębie wyboru talii
- `/ai/review/:generationId`: CTA „Zapisz do talii”, ewentualnie „Wróć do generowania”

## 5. Kluczowe komponenty

Poniższe komponenty są współdzielone między wieloma widokami i stanowią „kręgosłup” UI.

- **`AppShell`**: layout (top nav + container), wersja mobile z `Sheet`.
- **`ProtectedRoute`**: ochrona tras wymagających auth, redirecty.
- **`AuthProvider` / `AuthContext`**: stan sesji (accessToken + refreshToken w localStorage w MVP), `login/logout/refresh`.
- **`ApiClient` (axios)**:
  - request interceptor: `Authorization: Bearer <accessToken>`
  - response interceptor: na `401` próba `POST /api/auth/refresh` + retry; jeśli fail → logout
- **`DataState`**: spójne wzorce `LoadingState`, `EmptyState`, `ErrorState` (z CTA retry/back).
- **`ToastProvider` / `useToast`**: krótkie komunikaty sukcesu/błędu.
- **Dialogi**:
  - `CreateDeckDialog`, `EditDeckDialog`, `ConfirmDeleteDialog`
  - `CreateFlashcardDialog`, `EditFlashcardDialog`
  - `EditCandidateDialog`
- **Listy/siatki kart**:
  - `DeckGrid` + `DeckCard`
  - `FlashcardList` + `FlashcardCard`
  - `CandidateGrid` + `CandidateCard`
- **Formy z walidacją**:
  - `LoginForm`, `RegisterForm`, `PasswordReset*Form`
  - `AIGenerateForm` (textarea + counter)
  - wspólne: `FormField`, `TextareaWithCounter`, `LoadingButton`
- **Study**:
  - `StudyCard`, `StudyControls`, `StudySummary`
- **AI loading**:
  - `AITriviaLoading` (20 faktów, losowane)

---

## Mapowanie wymagań PRD → elementy UI (jawne)

- **Auth (rejestracja/logowanie/reset/wylogowanie)** → widoki: `/register`, `/login`, `/password-reset/request`, `/password-reset/confirm`, menu użytkownika w `AppShell`.
- **JWT sesja** → `AuthContext` + `ApiClient` z `Authorization: Bearer` + refresh na 401.
- **Talie (CRUD + lista + licznik fiszek)** → `/decks` + dialogi create/edit/delete; licznik `flashcardCount` na `DeckCard`.
- **Fiszki (CRUD + limit 500 + trim + source)** → `/decks/:deckId` + dialogi create/edit/delete; badge `source`.
- **AI generowanie (tekst 500–10 000 + wybór/utworzenie talii)** → `/ai/generate` + `DeckSelect` + `TextareaWithCounter`.
- **AI review (utrwalone na backendzie + grid + accept/reject/edit + batch save)** → `/ai/review/:generationId` + `CandidateGrid` + `EditCandidateDialog` + `Save`.
- **Limit miesięczny AI** → obsługa błędu `403` w `/ai/generate` + komunikat; brak proaktywnego ostrzegania w MVP (zgodnie z PRD).
- **Tryb nauki (losowo, reveal, next/prev, summary)** → `/decks/:deckId/study` + `StudyCard/Controls/Summary`.

## Mapowanie historyjek użytkownika (US-*) → widoki

- **US-001 Rejestracja** → `/register`
- **US-002 Logowanie** → `/login`
- **US-003 Reset hasła** → `/password-reset/request`, `/password-reset/confirm`
- **US-004 Wylogowanie** → `AppShell` → menu użytkownika → akcja logout (API: `POST /api/auth/logout` jeśli używane) + czyszczenie tokenów
- **US-005 Tworzenie talii** → `/decks` (modal `CreateDeckDialog`) + `/ai/generate` (inline create)
- **US-006 Lista talii** → `/decks`
- **US-007 Edycja talii** → `/decks` (modal `EditDeckDialog`)
- **US-008 Usuwanie talii** → `/decks` (dialog potwierdzenia)
- **US-009 Ręczne tworzenie fiszki** → `/decks/:deckId` (modal `CreateFlashcardDialog`)
- **US-010 Generowanie z tekstu** → `/ai/generate` → `/ai/review/:generationId` (z loading state)
- **US-011 Przegląd i edycja AI** → `/ai/review/:generationId` (siatka + modal edycji)
- **US-012 Zapis AI** → `/ai/review/:generationId` (CTA „Zapisz”) → redirect `/decks/:deckId`
- **US-013 Edycja fiszki** → `/decks/:deckId` (modal `EditFlashcardDialog`)
- **US-014 Usuwanie fiszki** → `/decks/:deckId` (dialog potwierdzenia)
- **US-015 Tryb nauki** → `/decks/:deckId/study`
- **US-016 Limit AI** → `/ai/generate` (obsługa 403 + komunikat)

## Stany brzegowe i błędy (spójna obsługa)

### Kody HTTP (wspólna polityka UI)
- **400 Bad Request**: walidacja (wyświetlić przy formularzu, wskazać pole, zachować wpisane dane).
- **401 Unauthorized**: automatyczny refresh token; jeśli nieudany → wylogowanie + redirect do `/login`.
- **403 Forbidden**: brak uprawnień (nie ta talia/fiszka/generacja) lub limit AI → komunikat + bezpieczny powrót.
- **404 Not Found**: zasób usunięty/nie istnieje → komunikat + link do `/decks`.
- **409 Conflict**: duplikaty (e-mail, nazwa talii) → komunikat kontekstowy w dialogu/formularzu.
- **410 Gone**: wygasły token resetu → CTA do ponownego resetu.
- **429 Too Many Requests**: komunikat o limicie + sugerowany czas ponowienia.
- **503 Service Unavailable**: AI niedostępne → retry + opcja powrotu.

### Kluczowe edge-case’y MVP
- **Brak talii** (`/decks`): empty state + CTA „Utwórz pierwszą talię”.
- **Brak fiszek w talii** (`/decks/:deckId` i `/study`): komunikat + CTA „Dodaj fiszkę”.
- **Deck usunięty podczas AI review**: `POST /save` może zwrócić 404 → komunikat + powrót do `/decks` i sugestia wyboru innej talii.
- **Utrata sieci**: globalny `ErrorState` z retry; formularze zachowują stan.
- **Długi tekst w kartach**: skracanie + możliwość podglądu pełnej treści (np. expand w karcie lub w modalu edycji).

## Uwagi decyzyjne (MVP) — zgodność z session notes

- **Tokeny**: w MVP `accessToken` + `refreshToken` w localStorage (zgodnie z decyzją). W UI architekturze przewidziana jest łatwa zmiana na HttpOnly cookies w przyszłości (bez zmiany widoków, tylko warstwa `AuthProvider`/`ApiClient`).
- **AI review — zapis postępu**: rekomendacja MVP: autosave zmian przez `PATCH` (z debounce) zamiast osobnego „Zapisz postęp”, aby maksymalnie uprościć doświadczenie i spełnić wymóg „powrotu po odświeżeniu”.
- **Profil**: brak osobnej strony `/profile` w MVP; e-mail + wylogowanie w menu użytkownika. Jeśli chcemy wyświetlać limit AI, robimy to na `/ai/generate` (bez nowego widoku).
- **Paginacja**: API wspiera paginację, ale UI w MVP może zacząć bez paginacji (domyślne `size` po stronie FE) i dodać ją później bez zmiany nawigacji.

