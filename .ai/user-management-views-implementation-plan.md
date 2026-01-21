## Plan implementacji widoków User Management (Auth): logowanie, rejestracja, reset hasła

## 1. Przegląd
Celem jest wdrożenie zestawu widoków umożliwiających użytkownikowi:
- logowanie (`/login`) i ustanowienie sesji JWT,
- rejestrację (`/register`) z automatycznym zalogowaniem (zgodnie z PRD),
- reset hasła w 2 krokach:
  - prośba o link (`/password-reset/request`) z odpowiedzią nieujawniającą,
  - ustawienie nowego hasła na podstawie tokenu (`/password-reset/confirm?token=...`).

Widoki mają działać na React 19 + TypeScript 5 + Tailwind 4 + shadcn/ui, z integracją z backendem Spring Boot (endpointy `/api/auth/*`).

## 2. Routing widoku
### Docelowe ścieżki
- `/login` – widok logowania
- `/register` – widok rejestracji
- `/password-reset/request` – widok prośby o link resetujący
- `/password-reset/confirm` – widok ustawienia nowego hasła (token z query string: `?token=...`)

### Redirecty i ochrona tras
- Po sukcesie logowania/rejestracji: redirect do `/decks` (widok startowy po zalogowaniu; może być placeholder, jeśli nie istnieje jeszcze).
- Jeśli użytkownik jest zalogowany i wejdzie na `/login`, `/register`, `/password-reset/*`:
  - domyślnie redirect do `/decks` (żeby nie pokazywać formularzy, kiedy sesja istnieje).
- Trasy wymagające zalogowania (poza zakresem tego planu, ale warto przygotować fundament):
  - `ProtectedRoute` lub loader w routerze, który przekieruje na `/login` przy braku tokenu.

### Rekomendowana implementacja routera (React Router v7)
- Użyć `createBrowserRouter` + `RouterProvider`.
- Trasy auth jako osobny „segment” z layoutem `AuthLayout`.

## 3. Struktura komponentów
### Rekomendowana struktura katalogów (frontend)
- `frontend/src/routes/router.tsx` – definicja routera
- `frontend/src/views/auth/LoginView.tsx`
- `frontend/src/views/auth/RegisterView.tsx`
- `frontend/src/views/auth/PasswordResetRequestView.tsx`
- `frontend/src/views/auth/PasswordResetConfirmView.tsx`
- `frontend/src/components/auth/AuthLayout.tsx`
- `frontend/src/components/auth/AuthCard.tsx`
- `frontend/src/components/auth/LoadingButton.tsx`
- `frontend/src/components/auth/InlineError.tsx` (lub `FormError`)
- `frontend/src/components/auth/PasswordRequirementsHint.tsx`
- `frontend/src/lib/api/httpClient.ts` (fetch wrapper)
- `frontend/src/lib/api/authApi.ts` (wywołania auth)
- `frontend/src/lib/auth/tokenStorage.ts`
- `frontend/src/lib/auth/authTypes.ts` (DTO/VM)
- `frontend/src/lib/auth/AuthProvider.tsx` + `frontend/src/lib/auth/useAuth.ts`
- `frontend/src/lib/validation/password.ts` (wspólne reguły hasła)

### Wysokopoziomowy diagram drzewa komponentów
```
RouterProvider
└── Routes
    ├── AuthLayout
    │   ├── /login
    │   │   └── LoginView
    │   │       └── AuthCard
    │   │           ├── LoginForm (część widoku)
    │   │           ├── InlineError / Alert
    │   │           └── LoadingButton
    │   ├── /register
    │   │   └── RegisterView
    │   │       └── AuthCard
    │   │           ├── PasswordRequirementsHint
    │   │           ├── InlineError / Alert
    │   │           └── LoadingButton
    │   ├── /password-reset/request
    │   │   └── PasswordResetRequestView
    │   │       └── AuthCard
    │   │           ├── InfoAlert (po sukcesie)
    │   │           ├── InlineError / Alert
    │   │           └── LoadingButton
    │   └── /password-reset/confirm
    │       └── PasswordResetConfirmView
    │           └── AuthCard
    │               ├── PasswordRequirementsHint
    │               ├── InlineError / Alert
    │               └── LoadingButton
    └── ProtectedRoute (opcjonalnie)
        └── /decks (placeholder)
```

## 4. Szczegóły komponentów

### `AuthLayout`
- **Opis**: Layout dla widoków auth (centrowanie, spójna szerokość, branding, tło). Zapewnia wspólne odstępy, typografię i kontener.
- **Główne elementy**:
  - `<main>` z `min-h-svh`, kontenerem i centrowaniem
  - opcjonalnie nagłówek/stopka (np. link do strony głównej)
- **Obsługiwane zdarzenia**: brak
- **Walidacja**: brak
- **Typy**: brak
- **Propsy**:
  - `children: React.ReactNode`

### `AuthCard`
- **Opis**: Kontener formularza oparty o shadcn/ui `Card` (nagłówek + treść + footer). Ujednolica wygląd formularzy.
- **Główne elementy**:
  - `Card`, `CardHeader` (może być własny), `CardContent`, `CardFooter`
- **Obsługiwane zdarzenia**: brak
- **Walidacja**: brak
- **Typy**: brak
- **Propsy**:
  - `title: string`
  - `description?: string`
  - `children: React.ReactNode`
  - `footer?: React.ReactNode`

### `LoadingButton`
- **Opis**: Przycisk submit z blokadą wielokrotnego wysyłania i stanem ładowania.
- **Główne elementy**:
  - shadcn `Button`
  - spinner (np. ikona z `lucide-react`) + tekst
- **Obsługiwane zdarzenia**:
  - `onClick` (opcjonalnie, zwykle submit przez `<form>`)
- **Walidacja**: brak (ale ma reagować na `disabled`)
- **Typy**: brak
- **Propsy**:
  - `isLoading: boolean`
  - `disabled?: boolean`
  - `type?: "button" | "submit"`
  - `children: React.ReactNode`

### `InlineError` (lub `Alert`)
- **Opis**: Komponent do prezentacji błędów globalnych formularza lub błędów z API.
- **Główne elementy**:
  - semantycznie: `role="alert"`, aria-live
  - styl: wyraźny komunikat (np. shadcn `Alert`, jeśli dodany; albo własny `div`)
- **Obsługiwane zdarzenia**: brak
- **Walidacja**: brak
- **Typy**:
  - `message: string`
- **Propsy**:
  - `message: string | null`

### `PasswordRequirementsHint`
- **Opis**: Czytelne wymagania hasła (zgodne z backendową walidacją `@ValidPassword`).
- **Główne elementy**:
  - lista wymagań + informacja o dozwolonych znakach specjalnych
- **Obsługiwane zdarzenia**: brak
- **Walidacja**: brak (czysto informacyjny)
- **Typy**: brak


### `LoginView`
- **Opis**: Formularz logowania (email + hasło) z linkami do rejestracji i resetu hasła. Po sukcesie zapis tokenów i redirect do `/decks`.
- **Główne elementy HTML / dzieci**:
  - `AuthCard`
  - `<form>`
    - `<label>` + `<input type="email">`
    - `<label>` + `<input type="password">`
    - `InlineError` (globalny)
    - `LoadingButton` (submit)
  - linki: `Link` do `/register` i `/password-reset/request`
- **Obsługiwane zdarzenia**:
  - `onSubmit` formularza
  - `onChange` pól (aktualizacja stanu formularza, czyszczenie błędów)
- **Warunki walidacji (klient + zgodne z API)**:
  - `email`:
    - wymagane (backend: `@NotNull`)
    - format email (backend: `@Email`)
    - trim przed wysyłką
  - `password`:
    - wymagane (backend: `@NotNull`)
    - brak dodatkowych wymagań regex przy loginie (backend nie sprawdza `@ValidPassword` w loginie)
- **Typy (DTO/VM)**:
  - `LoginRequestDto` (payload)
  - `AuthResponseDto` (success)
  - `ErrorResponseDto` (error)
  - `LoginFormValues` (VM)
- **Propsy**: brak (widok routowany)

### `RegisterView`
- **Opis**: Formularz rejestracji (email + hasło) z opisem wymagań hasła. Po sukcesie użytkownik jest automatycznie zalogowany (tokeny z odpowiedzi) i przekierowany do `/decks`.
- **Główne elementy**:
  - `AuthCard`
  - `<form>`
    - pola: email, hasło
    - `PasswordRequirementsHint`
    - `InlineError` / błędy pól
    - `LoadingButton`
  - link: `Link` do `/login`
- **Obsługiwane zdarzenia**:
  - `onSubmit`
  - `onChange` pól
- **Warunki walidacji (klient + zgodne z API)**:
  - `email`:
    - wymagane
    - format email
    - max 255 (backend: `@Size(max=255)`)
    - trim przed wysyłką
  - `password`:
    - wymagane
    - zgodne z backendowym `PasswordValidator`:
      - min 8 znaków,
      - co najmniej 1 mała litera,
      - co najmniej 1 wielka litera,
      - co najmniej 1 cyfra,
      - co najmniej 1 znak specjalny z zestawu: `@$!%*?&#`
      - dozwolone znaki: litery/cyfry oraz wyłącznie `@$!%*?&#` (wynika z regex backendu)
- **Typy (DTO/VM)**:
  - `RegisterRequestDto`
  - `AuthResponseDto`
  - `ErrorResponseDto`
  - `RegisterFormValues`
- **Propsy**: brak

### `PasswordResetRequestView`
- **Opis**: Formularz prośby o link resetujący hasło (email). Zawsze pokazuje komunikat typu „jeśli konto istnieje…” po odpowiedzi 200 (zgodnie z PRD i backendem), bez ujawniania istnienia konta.
- **Główne elementy**:
  - `AuthCard`
  - `<form>`
    - pole email
    - `InlineError` dla 429 i błędów walidacji
    - `InfoAlert` (lub odpowiednik) po sukcesie 200 z `MessageResponse.message`
    - `LoadingButton`
  - link powrotny do `/login`
- **Obsługiwane zdarzenia**:
  - `onSubmit`
  - `onChange`
- **Warunki walidacji**:
  - `email` wymagane + format email, trim
- **Typy (DTO/VM)**:
  - `PasswordResetRequestDto`
  - `MessageResponseDto`
  - `ErrorResponseDto`
  - `PasswordResetRequestFormValues`
- **Propsy**: brak

### `PasswordResetConfirmView`
- **Opis**: Formularz ustawienia nowego hasła. Token pobierany z query string (`token`) i wysyłany razem z `newPassword`. Po sukcesie redirect do `/login` z informacją „hasło zmienione”.
- **Główne elementy**:
  - `AuthCard`
  - `<form>`
    - pole `newPassword` (type=password)
    - `PasswordRequirementsHint`
    - `InlineError` (token invalid/expired, walidacja)
    - `LoadingButton`
- **Obsługiwane zdarzenia**:
  - `onSubmit`
  - `onChange`
  - odczyt `searchParams` z routera (token)
- **Warunki walidacji (klient + zgodne z API)**:
  - `token`:
    - wymagany (backend: `@NotBlank`)
    - UI: jeśli brak tokenu w URL → zablokować submit i pokazać czytelny błąd + CTA do `/password-reset/request`
  - `newPassword`:
    - wymagane
    - identyczne reguły jak przy rejestracji (`@ValidPassword`)
- **Typy (DTO/VM)**:
  - `PasswordResetConfirmDto`
  - `MessageResponseDto`
  - `ErrorResponseDto`
  - `PasswordResetConfirmFormValues`
- **Propsy**: brak

## 5. Typy
### DTO (kontrakty API) – TypeScript
Pola muszą odpowiadać backendowym recordom:

- `LoginRequestDto`
  - `email: string`
  - `password: string`

- `RegisterRequestDto`
  - `email: string`
  - `password: string`

- `PasswordResetRequestDto`
  - `email: string`

- `PasswordResetConfirmDto`
  - `token: string`
  - `newPassword: string`

- `AuthResponseDto`
  - `id: string` (UUID)
  - `email: string`
  - `role: string` (np. `"USER"`)
  - `monthlyAiLimit: number`
  - `aiUsageInCurrentMonth: number`
  - `accessToken: string`
  - `refreshToken: string`

- `MessageResponseDto`
  - `message: string`

- `ErrorResponseDto` (z `pl.olesek._xcards.common.dto.ErrorResponse`)
  - `timestamp: string` (ISO)
  - `status: number`
  - `error: string`
  - `message: string`
  - `path: string`

### ViewModel (typy UI)
- `LoginFormValues`
  - `email: string`
  - `password: string`

- `RegisterFormValues`
  - `email: string`
  - `password: string`

- `PasswordResetRequestFormValues`
  - `email: string`

- `PasswordResetConfirmFormValues`
  - `newPassword: string`

### Typy pomocnicze dla walidacji/błędów
- `FieldErrors`
  - `email?: string`
  - `password?: string`
  - `newPassword?: string`
  - `token?: string`
- `ApiErrorKind` (opcjonalnie)
  - `"validation" | "unauthorized" | "conflict" | "rate_limit" | "gone" | "unknown"`

### Parsowanie błędów walidacji z backendu
Backend przy `400` buduje `ErrorResponse.message` jako string łączący błędy pól:
`"email: Invalid email format, password: Password must be ..."`

UI powinno:
- próbować sparsować `message` do `FieldErrors` przez split po `", "` oraz `": "`,
- fallback: pokazać `message` jako błąd globalny, jeśli parsowanie się nie powiedzie.

## 6. Zarządzanie stanem
### Wymagane stany w widokach
W każdym widoku formularza:
- `values` (VM) – kontrolowane inputy,
- `isSubmitting` – blokada wielokrotnego submitu,
- `fieldErrors?: FieldErrors` – błędy per pole,
- `formError?: string | null` – błąd globalny,
- `successMessage?: string | null` – tylko dla password reset request/confirm.

### Auth stan aplikacji (sesja JWT)
Wymagane dla przepływu „po sukcesie redirect do /decks”:
- `AuthContext` / `AuthProvider` utrzymujący:
  - `user?: { id; email; role; monthlyAiLimit; aiUsageInCurrentMonth }` (pochodne z `AuthResponseDto`)
  - `accessToken: string | null`
  - `refreshToken: string | null`
  - metody: `login()`, `register()`, `logout()`, `restoreSession()`

### Rekomendowane custom hooki
- `useAuth()`
  - pobiera stan i akcje auth
- `useQueryParam(name: string)` (opcjonalnie)
  - ułatwia obsługę `token` na `/password-reset/confirm`

### Token storage (MVP)
Ponieważ backend zwraca tokeny w JSON:
- zapisać `accessToken` i `refreshToken` w `localStorage` (MVP),
- przy starcie aplikacji (`AuthProvider`) wczytać tokeny i ustawić stan,
- dodać mechanizm „logout = wyczyszczenie storage”.

Uwaga bezpieczeństwa (do odnotowania w implementacji):
- `localStorage` jest podatny na XSS; w docelowej wersji warto przejść na refresh token w httpOnly cookie (wymaga zmian backendu).

## 7. Integracja API
### Bazowe założenia
- Wywołania jako `fetch` na ścieżki względne `/api/...` (FE serwowany przez Spring Boot).
- `Content-Type: application/json`.
- Dla endpointów auth w tym zakresie nie wymagamy `Authorization` header.

### Wywołania
- `POST /api/auth/login`
  - **Request**: `LoginRequestDto`
  - **Success 200**: `AuthResponseDto`
  - **Errors**:
    - `401` (`ErrorResponseDto`) – niepoprawne dane lub konto wyłączone (backend może zwrócić `Account is disabled`)
    - `429` (`ErrorResponseDto`) – rate limit (backend message: „Too many login attempts. Please try again in 15 minutes”)
    - `400` (`ErrorResponseDto`) – walidacja (np. brak email)

- `POST /api/auth/register`
  - **Request**: `RegisterRequestDto`
  - **Success 201**: `AuthResponseDto`
  - **Errors**:
    - `409` (`ErrorResponseDto`) – email istnieje
    - `400` (`ErrorResponseDto`) – walidacja email/hasła (w tym regex hasła)

- `POST /api/auth/password-reset/request`
  - **Request**: `PasswordResetRequestDto`
  - **Success 200**: `MessageResponseDto` (zawsze „If an account exists...”)
  - **Errors**:
    - `429` (`ErrorResponseDto`) – rate limit (backend message: „Too many password reset requests. Please try again in 1 hour”)
    - `400` (`ErrorResponseDto`) – walidacja

- `POST /api/auth/password-reset/confirm`
  - **Request**: `PasswordResetConfirmDto`
  - **Success 200**: `MessageResponseDto` („Password has been reset successfully.”)
  - **Errors**:
    - `410` (`ErrorResponseDto`) – token wygasł („Password reset token has expired”)
    - `401` (`ErrorResponseDto`) – token nieprawidłowy (backend rzuca `InvalidTokenException` mapowane na 401)
    - `400` (`ErrorResponseDto`) – walidacja (np. `newPassword` nie spełnia wymagań, brak tokenu/hasła)

### Warstwa API (frontend)
Zaimplementować `authApi.ts`:
- `login(dto: LoginRequestDto): Promise<AuthResponseDto>`
- `register(dto: RegisterRequestDto): Promise<AuthResponseDto>`
- `requestPasswordReset(dto: PasswordResetRequestDto): Promise<MessageResponseDto>`
- `confirmPasswordReset(dto: PasswordResetConfirmDto): Promise<MessageResponseDto>`

Zaimplementować `httpClient.ts`:
- wspólny `fetchJson<T>()`:
  - serializacja JSON,
  - parsowanie odpowiedzi,
  - dla statusów != 2xx rzuca błąd z `{ status, data?: ErrorResponseDto }`

## 8. Interakcje użytkownika

### Logowanie
- Użytkownik wpisuje email i hasło → klik „Zaloguj”.
- UI waliduje pola (email/required) → jeśli OK, wysyła `POST /api/auth/login`.
- W trakcie: disable submit + spinner.
- Sukces:
  - zapis tokenów + ustawienie stanu auth,
  - redirect do `/decks`.
- Błąd:
  - 401: komunikat „Nieprawidłowy e-mail lub hasło” (albo backendowy message),
  - 429: komunikat o limicie (możliwy tekst dokładnie z backendu),
  - 400: podpiąć błędy do pól (parsowanie), reszta jako błąd globalny.

### Rejestracja
- Email + hasło → „Załóż konto”.
- UI waliduje email (format + max 255) i hasło (regex jak backend).
- Sukces 201:
  - zapis tokenów + stan auth,
  - redirect do `/decks`.
- Błędy:
  - 409: „Konto o tym adresie e-mail już istnieje”
  - 400: błędy pól (email/hasło) wg `ErrorResponse.message`.

### Reset hasła — prośba
- Email → „Wyślij link”.
- UI waliduje email.
- Sukces 200:
  - zawsze pokazuje `MessageResponse.message` (nieujawniający).
- 429:
  - komunikat „Spróbuj ponownie za 1 godzinę” (lub backend message),
  - opcjonalnie: dodać UI „cooldown” (na podstawie stałego czasu, bez polegania na nagłówkach).

### Reset hasła — ustawienie nowego hasła
- Widok czyta `token` z query string.
- Jeśli brak `token`:
  - błąd globalny + przycisk/link do `/password-reset/request`, submit disabled.
- Użytkownik wpisuje nowe hasło → „Zmień hasło”.
- UI waliduje hasło (regex) + obecność tokenu.
- Sukces 200:
  - redirect do `/login` i przekazanie info (np. `location.state` lub `?reset=success`) do pokazania jednorazowego komunikatu.
- Błędy:
  - 410: pokaż komunikat „Link wygasł” + CTA do ponowienia prośby o reset
  - 401/400 invalid token: pokaż komunikat „Nieprawidłowy link resetujący” + CTA do ponowienia prośby
  - 400 walidacja hasła: podpiąć pod pole.

## 9. Warunki i walidacja
### Walidacja email
Weryfikowana w:
- `LoginView`, `RegisterView`, `PasswordResetRequestView`

Reguły:
- required
- format email
- `RegisterView`: max 255
- trim przed wysyłką (spójnie z backendem; backend dodatkowo lower-case)

### Walidacja hasła (Register + PasswordResetConfirm)
Weryfikowana w:
- `RegisterView` (`password`)
- `PasswordResetConfirmView` (`newPassword`)

Reguły zgodne z backendem:
- min 8 znaków
- min 1 mała litera `[a-z]`
- min 1 wielka litera `[A-Z]`
- min 1 cyfra `\d`
- min 1 znak z `@$!%*?&#`
- dozwolony zestaw znaków: `[A-Za-z\d@$!%*?&#]` (ważne: inne znaki specjalne nie przejdą backendu)

### Walidacja tokenu (PasswordResetConfirm)
- token wymagany, niepusty (UI: presence check w URL).

### UX walidacji
- Walidacja „na submit” + czyszczenie błędu pola po zmianie inputu.
- Komunikaty błędów powiązane z polami (aria-describedby).
- Submit disabled, gdy:
  - `isSubmitting === true`
  - lub (dla confirm) brak tokenu.

## 10. Obsługa błędów
### Scenariusze i obsługa
- **400 Bad Request (walidacja)**:
  - próbować mapować `ErrorResponse.message` na `fieldErrors`,
  - fallback do błędu globalnego.
- **401 Unauthorized**:
  - login: „Invalid email or password” → błąd globalny
  - confirm: invalid token → błąd globalny + CTA
  - dodatkowo (z backendu): konto wyłączone („Account is disabled”) → błąd globalny
- **409 Conflict**:
  - register: błąd globalny + sugestia przejścia do `/login`
- **410 Gone**:
  - confirm: token expired → błąd globalny + CTA do `/password-reset/request`
- **429 Too Many Requests**:
  - login/reset request: błąd globalny + zablokowanie ponownego submitu na krótko (opcjonalnie)
- **500/unknown**:
  - komunikat ogólny: „Wystąpił nieoczekiwany błąd. Spróbuj ponownie.”

### Dostępność
- `role="alert"` dla błędów
- focus management:
  - po błędzie walidacji: focus na pierwszym polu z błędem
  - po sukcesie: focus na komunikacie (opcjonalnie)

## 11. Kroki implementacji
1. Dodać routing (React Router v7):
   - `router.tsx` + trasy auth + placeholder `/decks`.
2. Dodać `AuthLayout` i `AuthCard` (na bazie shadcn `Card`) oraz `LoadingButton`, `InlineError`, `PasswordRequirementsHint`.
3. Dodać typy TypeScript (DTO + VM) w `authTypes.ts`.
4. Zaimplementować `httpClient.ts` (fetch wrapper) oraz `authApi.ts` (4 funkcje API).
5. Zaimplementować `tokenStorage.ts` (localStorage) i `AuthProvider` + `useAuth`.
6. Wdrożyć `LoginView`:
   - formularz, walidacja, obsługa 200/400/401/429, redirect `/decks`.
7. Wdrożyć `RegisterView`:
   - walidacja hasła identyczna jak backend regex, obsługa 201/400/409, redirect `/decks`.
8. Wdrożyć `PasswordResetRequestView`:
   - odpowiedź nieujawniająca, obsługa 200/400/429.
9. Wdrożyć `PasswordResetConfirmView`:
   - odczyt `token` z query, walidacja, obsługa 200/400/401/410, redirect `/login` z komunikatem sukcesu.
10. Dodać redirecty dla zalogowanych użytkowników z tras auth (np. `AuthGate`).
11. (Opcjonalnie) Dodać proste testy jednostkowe walidacji hasła (funkcja regex) i parsera `ErrorResponse.message`.
