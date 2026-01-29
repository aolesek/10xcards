<plan_testów>

### Plan testów – 10xCards (Java/Spring Boot + React)

### 1. Wprowadzenie i cele testowania
- **Cel główny**: potwierdzić, że aplikacja 10xCards (backend + frontend) działa poprawnie, bezpiecznie i stabilnie w kluczowych przepływach: autoryzacja JWT, zarządzanie taliami i fiszkami, tryb nauki oraz generowanie fiszek przez AI (OpenRouter).
- **Cele szczegółowe**:
  - **Poprawność funkcjonalna**: zgodność zachowania API/UI z kontraktami (statusy HTTP, walidacje, format błędów).
  - **Bezpieczeństwo**: brak regresji w mechanizmach JWT (access/refresh), blokadzie tokenów, izolacji danych między użytkownikami, CORS.
  - **Niezawodność**: odporność na błędy usług zewnętrznych (AI), retry i poprawne mapowanie na błędy (503).
  - **Jakość UX**: sensowne komunikaty błędów w UI (parsowanie walidacji), brak „dead-endów” w nawigacji.
  - **Wydajność bazowa**: brak oczywistych wąskich gardeł w typowych listowaniach, studiu i AI history.

### 2. Zakres testów
- **Backend (Spring Boot 3, Java 21)**:
  - **Auth**: rejestracja, logowanie, odświeżanie tokenów, wylogowanie, „me”, reset hasła (request/confirm), rate-limit.
  - **Decks**: CRUD, paginacja/sortowanie, unikalność nazw per użytkownik, pobranie sesji nauki (`/study`).
  - **Flashcards**: CRUD w talii, paginacja/sortowanie, filtr `source`, automatyczna zmiana `source` (AI → AI_EDITED).
  - **AI**: generowanie kandydatów, historia generowań, aktualizacja kandydatów, zapis do talii; limity per-minute i miesięczne; zachowanie przy błędach OpenRouter.
  - **Obsługa błędów**: spójny `ErrorResponse` oraz mapowanie wyjątków na kody: 400/401/403/404/409/410/429/503/500.
  - **DB/Liquibase**: migracje i zgodność schematu z encjami; integralność relacji (users–decks–flashcards–ai_generations).
- **Frontend (React 19, TS 5, Tailwind 4, shadcn/ui)**:
  - **Auth UI**: login, register, password reset request/confirm; walidacje klienta; obsługa błędów z API.
  - **Token flow**: `localStorage` tokenStorage, `authenticatedFetch` z auto-refresh oraz zdarzenie `auth:token-refresh-failed`.
  - **Decks/Flashcards UI**: listy, dialogi create/edit/delete, odświeżanie widoków po operacjach, obsługa 401/404.
  - **Study UI**: nawigacja kart, klawiatura (strzałki, spacja/enter), summary, retry.
  - **AI UI**: generowanie (mode/model/count), loading, review (accept/reject/edit/save), history (paginacja, przejścia).
- **Poza zakresem (explicit)**:
  - **Jakość merytoryczna odpowiedzi AI** (czy fiszki są „dobre” poznawczo) – testujemy format, stabilność, obsługę błędów i podstawowe własności danych (nie puste, limity długości), nie „prawdę” treści.
  - **Dostarczalność e-maili** (deliverability) – testujemy, że wysyłka jest wywoływana i nie ujawnia informacji; nie testujemy infrastruktury pocztowej.

### 3. Typy testów do przeprowadzenia
- **Testy jednostkowe (backend)**: JUnit 5 + Mockito + AssertJ (serwisy, mappery, walidacje, wyjątki).
- **Testy jednostkowe (frontend)**: Vitest (walidacje, parser błędów, logika token refresh, mapping DTO→VM).
- **Testy integracyjne (backend)**:
  - **API + Security**: RestAssured (autoryzacja, statusy, body, nagłówki, CORS).
  - **Integracja z OpenRouter**: testy z mockiem HTTP (WireMock) dla różnych odpowiedzi (OK, 5xx, timeout, niepoprawny JSON).
- **Testy kontraktowe API**:
  - **Spring Cloud Contract**: kontrakt między backend a frontend, automatyczna generacja testów po stronie producenta i stubów dla konsumenta.
  - **Kontrakt error response** (`ErrorResponse`) i statusy dla kluczowych endpointów (szczególnie 400/401/403/404/409/410/429/503).
- **Testy architektury**:
  - **ArchUnit**: wymuszanie reguł architektonicznych (warstwy, zależności między pakietami, konwencje nazewnictwa).
- **Testy end-to-end (E2E, UI)**:
  - Playwright (scenariusze użytkownika od logowania po AI/save/nauka).
- **Testy wydajnościowe (smoke)**:
  - k6 – krótkie testy obciążeniowe (paginacje, `/study`, AI history).
- **Testy bezpieczeństwa (podstawowe)**:
  - Skan OWASP ZAP na środowisku testowym, testy JWT (token tampered/expired), CORS, brak IDOR.
- **Testy regresji**:
  - Zestaw „smoke" po każdym mergu do `main`: auth + podstawowy CRUD + 1 przepływ AI.

### 4. Scenariusze testowe dla kluczowych funkcjonalności

#### 4.1 Autentykacja i autoryzacja (API + UI)
- **Rejestracja (`POST /api/auth/register`)**:
  - **Happy-path**: poprawny email + hasło spełniające wymagania → 201, zwraca access/refresh, user info.
  - **Walidacje**: niepoprawny email → 400; hasło bez spełnienia reguł → 400; email >255 → 400.
  - **Duplikat**: istniejący email → 409.
  - **Normalizacja**: email z odstępami/dużymi literami → zapis jako lowercase/trim.
- **Login (`POST /api/auth/login`)**:
  - **Happy-path**: poprawne dane → 200, zwraca tokeny.
  - **Błędne hasło** → 401.
  - **Konto wyłączone** → 401.
  - **Rate limit**: >5 prób/15 min per IP → 429.
  - **Bezpieczeństwo**: brak wycieku informacji o istniejącym koncie poza status/message.
- **Odświeżanie tokenu (`POST /api/auth/refresh`)**:
  - **Happy-path**: poprawny refresh → 200, nowe tokeny.
  - **Blacklist**: refresh już użyty (zablokowany) → 401.
  - **Expired refresh** → 410 (jeśli mapowane) lub 401 zgodnie z implementacją; test potwierdza faktyczny kontrakt.
- **Wylogowanie (`POST /api/auth/logout`)**:
  - **Happy-path**: 204, access token trafia na blacklist.
  - **Następne użycie tokenu**: próba wywołania endpointu chronionego po logout → 401.
- **Current user (`GET /api/auth/me`)**:
  - **Happy-path**: 200 i spójne pola (id/email/role/AI limity).
  - **Brak/niepoprawny JWT** → 401.
- **Password reset request (`POST /api/auth/password-reset/request`)**:
  - **Nieujawnianie**: email istnieje vs nie istnieje → 200 i ten sam komunikat.
  - **Rate limit**: >3/h per email → 429.
  - **Integracja email**: wywołanie wysyłki (mock JavaMailSender), bez propagacji błędu do klienta.
- **Password reset confirm (`POST /api/auth/password-reset/confirm`)**:
  - **Happy-path**: poprawny token + hasło → 200.
  - **Invalid token** → 401.
  - **Expired token** → 410.

#### 4.2 Talie (Decks)
- **Lista (`GET /api/decks`)**:
  - **Paginacja**: page/size; size >100 ucinane do 100.
  - **Sortowanie**: `createdAt,desc/asc`; stabilność sortowania (secondary sort po `id`).
  - **Autoryzacja**: bez tokenu → 401; brak dostępu do cudzych talii (IDOR) – nie powinno zwrócić danych.
- **Szczegóły (`GET /api/decks/{deckId}`)**:
  - **Happy-path**: 200 + flashcardCount spójny z DB.
  - **Nie istnieje** → 404.
  - **Cudzy deckId** → 404 lub 403 (zgodnie z implementacją) – test potwierdza.
- **Utworzenie (`POST /api/decks`)**:
  - **Trim**: nazwa z odstępami → zapisana przycięta.
  - **Pusta po trim** → 400.
  - **Duplikat nazwy per user** → 409.
- **Edycja (`PUT /api/decks/{deckId}`)**:
  - **Zmiana nazwy**: 200.
  - **Bez zmiany**: brak walidacji duplikatu – nadal 200.
  - **Duplikat**: 409.
- **Usunięcie (`DELETE /api/decks/{deckId}`)**:
  - **Happy-path**: 204.
  - **Efekt uboczny**: fiszki w talii usunięte/nieosiągalne; zachowanie generacji AI powiązanych z talią (test zależny od relacji DB).

#### 4.3 Fiszki (Flashcards)
- **Lista w talii (`GET /api/decks/{deckId}/flashcards`)**:
  - **Paginacja**: size ≤100.
  - **Filtr `source`**: `manual|ai|ai-edited`; niepoprawna wartość → 400.
  - **Cudzy deckId** → 404.
- **Szczegóły (`GET /api/flashcards/{flashcardId}`)**:
  - **Happy-path**: 200.
  - **Cudzy flashcardId** → 404.
- **Utworzenie manual (`POST /api/decks/{deckId}/flashcards`)**:
  - **Trim**: front/back przycięte.
  - **Puste po trim**: 400.
  - **Source**: zawsze `manual`.
- **Edycja (`PUT /api/flashcards/{flashcardId}`)**:
  - **Trim + walidacje pustych**.
  - **Automatyczna zmiana source**: `ai` → `ai-edited` po edycji; `manual` pozostaje `manual`; `ai-edited` pozostaje `ai-edited`.
- **Usunięcie (`DELETE /api/flashcards/{flashcardId}`)**:
  - **Happy-path**: 204.

#### 4.4 Tryb nauki (Study)
- **Sesja nauki (`GET /api/decks/{deckId}/study?shuffle=true`)**:
  - **Pusta talia**: `totalCards=0`, lista pusta.
  - **Niepusta**: liczność i elementy zgodne z DB.
  - **Shuffle**: przy `shuffle=false` stały porządek (createdAt desc), przy `shuffle=true` brak gwarancji kolejności – testy powinny weryfikować multizbiór, nie kolejność.
  - **Brak dostępu / brak talii**: 403/404.
- **UI Study**:
  - **Reveal**: toggle klik + klawiatura (spacja/enter).
  - **Nawigacja**: strzałki lewo/prawo, summary na końcu, restart.
  - **Odporność**: brak deckId w URL → komunikat i nawigacja.

#### 4.5 Generowanie AI (OpenRouter)
- **Generate (`POST /api/ai/generate`)**:
  - **Walidacja sourceText**: 500–10000 znaków (uwaga: test także przypadek „spełnia @Size przed trim, ale po trim <500” – wykrycie ryzyka kontraktu).
  - **requestedCandidatesCount**: 1–100; null → domyślnie 10.
  - **Model**: dozwolone wartości `AIModel`; brak → default.
  - **Mode**: `AIGenerationMode` (KNOWLEDGE + LANGUAGE_*); brak → default.
  - **Rate limit**: 10/min per user → 429.
  - **Monthly limit**: >=100 w bieżącym miesiącu → 403.
  - **Deck ownership**: cudzy deck → 403; nie istnieje → 404.
  - **Awaria AI**: timeout/5xx/parse error → 503.
- **Historia (`GET /api/ai/generations`)**:
  - **Paginacja**: page/size; size ≤100.
  - **Sort**: domyślnie createdAt desc; spójność UI (paginacja).
- **Pobranie generacji (`GET /api/ai/generations/{generationId}`)**:
  - **Owner-only**: cudza generacja → 403; brak → 404.
- **Update candidates (`PATCH /api/ai/generations/{generationId}/candidates`)**:
  - **Lista niepusta**: pusta → 400.
  - **Status**: tylko `accepted|rejected|edited`.
  - **Edited**: wymaga `editedFront` i `editedBack` niepustych.
  - **Limity długości**: `editedFront/back` ≤500.
  - **Candidate ID**: nieistniejący w generacji → 400.
- **Save (`POST /api/ai/generations/{generationId}/save`)**:
  - **Co najmniej 1 accepted/edited**: inaczej 400.
  - **Deck usunięty**: 404 (zgodnie z implementacją).
  - **Tworzenie fiszek**: accepted → `source=AI` i front/back z AI; edited → `source=AI_EDITED` i front/back z pól edited.
- **AIClientService**:
  - **Retry**: na timeout/5xx łącznie 3 próby (1 + 2 retry) → finalnie 503.
  - **Parsowanie odpowiedzi**: plain JSON array, ` ```json ... ``` ` oraz ` ``` ... ``` `.
  - **Niepoprawny JSON/format**: 503.

#### 4.6 Obsługa błędów i kontrakt `ErrorResponse`
- **Spójność `ErrorResponse`**:
  - Zawiera `timestamp/status/error/message/path`.
  - `message` dla walidacji formatuje się jako `field: message, field2: message2` (frontend to parsuje).
- **Mapowanie statusów**:
  - 400: walidacje, nieprawidłowe parametry (`source`, puste po trim, niepoprawne candidate update).
  - 401: invalid credentials / invalid token / brak auth.
  - 403: brak dostępu do zasobu, limit miesięczny AI.
  - 404: brak talii/fiszki/generacji.
  - 409: konflikty unikalności (email, nazwa talii).
  - 410: wygasłe tokeny (reset hasła / JWT expired wg implementacji).
  - 429: rate limit.
  - 503: AI unavailable.

#### 4.7 Kontrakty API (Spring Cloud Contract)
- **Definicja kontraktów dla kluczowych endpointów**:
  - **Auth**: register, login, refresh, me (format response, statusy).
  - **Decks**: CRUD, lista z paginacją (format page response, sortowanie).
  - **Flashcards**: CRUD w ramach decka, filtry source.
  - **AI**: generate request/response, historia generacji, format kandydatów.
  - **ErrorResponse**: kontrakty dla scenariuszy negatywnych (400/401/403/404/409/429/503).
- **Weryfikacja**:
  - Backend: automatycznie generowane testy weryfikujące kontrakty.
  - Frontend: generowane stuby dla testów jednostkowych i integracyjnych.
  - CI: walidacja, że kontrakt nie został złamany przy zmianach.

#### 4.8 Architektura kodu (ArchUnit)
- **Reguły warstwowe**:
  - `controller` może używać tylko `service` i `dto`.
  - `service` może używać tylko innych `service`, `repository`, `mapper`, `dto`.
  - `repository` nie może być używane bezpośrednio przez `controller`.
  - Żadne cykle zależności między pakietami.
- **Konwencje nazewnictwa**:
  - Klasy w `controller` kończą się na `Controller` i mają adnotację `@RestController`.
  - Klasy w `service` kończą się na `Service` i mają adnotację `@Service`.
  - Klasy w `repository` kończą się na `Repository` i dziedziczą po `JpaRepository`.
- **Bezpieczeństwo**:
  - Endpointy w `controller` mają odpowiednie adnotacje security (`@PreAuthorize`, `@Secured`).
  - Brak używania `@PermitAll` poza endpointami publicznymi (auth).
- **Zależności**:
  - Brak zależności od klas testowych w kodzie produkcyjnym.
  - Domain nie może zależeć od infrastruktury (JPA annotations dozwolone).

#### 4.9 Pokrycie testami (JaCoCo)
- **Progi pokrycia (CI gates)**:
  - Service layer: minimum 70% line coverage, 60% branch coverage.
  - Mapper/util classes: minimum 80% line coverage.
  - Controllers: minimum 60% line coverage (wyższe pokrycie przez testy RestAssured).
  - Repositories: wyłączone z raportów (proste metody Spring Data).
- **Wykluczenia z raportów**:
  - DTOs, entities (POJO).
  - Configuration classes.
  - Main application class.
  - Wygenerowane klasy (Lombok getters/setters).
- **Raportowanie**:
  - Generowanie HTML report lokalnie (`target/site/jacoco/index.html`).
  - XML report dla integracji z CI/CD (coverage badges).
  - Fail build jeśli próg nie został osiągnięty w krytycznych pakietach.

### 5. Środowisko testowe
- **Lokalnie (dev)**:
  - Backend: Spring Boot na `localhost:8080`.
  - DB: PostgreSQL z `docker-compose` (`localhost:5432/10xcards`).
  - Frontend: Vite na `localhost:5173`.
- **CI (GitHub Actions)**:
  - Uruchamianie testów backend (`mvn test`) i frontend (`npm run test:run`).
  - Rekomendacja: dołożyć etap integracyjny z Postgres/Testcontainers.
- **Środowisko testowe (staging)**:
  - Oddzielna baza (nieprodukcyjna), osobne sekrety JWT i ewentualny klucz OpenRouter (z limitem wydatków).
  - Możliwość uruchomienia OWASP ZAP i testów E2E bez wpływu na dane produkcyjne.

### 6. Narzędzia do testowania
- **Backend**:
  - **JUnit 5, Mockito, AssertJ**: testy jednostkowe (już używane).
  - **RestAssured**: testy API + security (czytelniejsze i bardziej deklaratywne niż MockMvc).
  - **Testcontainers (PostgreSQL)**: integracja DB + Liquibase.
  - **WireMock**: stub OpenRouter (mockowanie zewnętrznych serwisów HTTP).
  - **Spring Cloud Contract**: testowanie kontraktów API między backend a frontend.
  - **ArchUnit**: testowanie reguł architektonicznych (warstwy, zależności pakietów, konwencje).
  - **JaCoCo**: mierzenie pokrycia kodu testami, raportowanie i wymuszanie minimalnych progów w CI.
- **Frontend**:
  - **Vitest**: unit tests (już używane).
  - **Testing Library** (react): testy komponentów.
  - **Playwright**: E2E.
- **Wydajność**: **k6** (nowoczesny, scriptowanie w JS, świetne raporty).
- **Bezpieczeństwo**: **OWASP ZAP**, podstawowe skany zależności (npm audit / OWASP Dependency-Check).
- **Jakość**: ESLint (frontend), Spotless (backend) – jako „quality gates", nie testy, ale w CI.

### 7. Harmonogram testów
- **Sprint 0 / Start (1–2 dni)**:
  - Konfiguracja środowisk testowych, dane testowe, baseline smoke.
  - Konfiguracja JaCoCo w `pom.xml` z progami pokrycia.
  - Ustalenie kryteriów P0/P1 i checklisty regresji.
- **Sprint 1 (3–5 dni)**:
  - Rozszerzenie unit testów: walidacje, błędy, edge-case'y AI parsing.
  - Dodanie testów API (RestAssured) dla auth/decks/flashcards.
  - Implementacja podstawowych testów ArchUnit (reguły warstwowe).
  - Konfiguracja WireMock dla OpenRouter.
- **Sprint 2 (3–5 dni)**:
  - Integracyjne DB (Testcontainers + Liquibase) dla kluczowych repozytoriów i przepływów.
  - Definicja kontraktów Spring Cloud Contract dla kluczowych endpointów.
  - Rozszerzenie testów ArchUnit (konwencje nazewnictwa, security).
  - E2E (Playwright) – minimum: login → deck CRUD → flashcard CRUD → study → AI generate/review/save.
- **Sprint 3 (2–3 dni)**:
  - Dokończenie kontraktów dla wszystkich publicznych API.
  - Osiągnięcie progów pokrycia JaCoCo dla krytycznych serwisów.
  - Testy wydajnościowe k6 (baseline).
- **Ciągłe (po każdym mergu)**:
  - Smoke/regresja P0 w CI.
  - Walidacja JaCoCo coverage (fail build poniżej progów).
  - Weryfikacja ArchUnit rules.
  - W tygodniu przed releasem: pełna regresja + ZAP + pełny test wydajnościowy k6.

### 8. Kryteria akceptacji testów
- **P0** (blokujące release):
  - Brak błędów w: auth, izolacja danych użytkownika, deck/flashcard CRUD, study, podstawowy flow AI (generate → review → save).
  - Wszystkie endpointy zwracają poprawne statusy i `ErrorResponse` w scenariuszach negatywnych.
  - Token refresh w frontend działa, a przy failure następuje czyste wylogowanie.
  - Kontrakty Spring Cloud Contract przechodzą dla kluczowych endpointów (auth, decks, flashcards, AI).
  - Wszystkie testy ArchUnit przechodzą (brak naruszeń architektury).
  - Progi JaCoCo coverage osiągnięte dla krytycznych pakietów.
- **P1**:
  - Paginacje/sortowania stabilne, filtry source, historia AI, retry w AIClientService.
  - Kontrakty dla wszystkich publicznych endpointów zdefiniowane i weryfikowane.
  - Rozszerzone testy ArchUnit (konwencje nazewnictwa, security annotations).
- **Jakość testów**:
  - **Pokrycie JaCoCo (wymuszane w CI)**:
    - Service layer: ≥70% line coverage, ≥60% branch coverage.
    - Mapper/util classes: ≥80% line coverage.
    - Controllers: ≥60% line coverage.
  - **ArchUnit**: 100% reguł przechodzących (zero violations).
  - **Kontrakty**: 100% kluczowych endpointów pokrytych kontraktami.
  - Frontend utils/api: ≥70% line coverage (Vitest).

### 9. Role i odpowiedzialności w procesie testowania
- **QA / QA Lead**:
  - Definicja strategii, priorytety P0/P1, plan regresji, prowadzenie testów E2E i testów eksploracyjnych.
  - Analiza ryzyk (AI parsing, security, rate limits), utrzymanie checklist.
  - Weryfikacja kontraktów API (współpraca z devs przy definicji).
- **Backend Dev**:
  - Testy jednostkowe i integracyjne (RestAssured), kontrakty Spring Cloud Contract, stuby WireMock dla OpenRouter.
  - Implementacja testów ArchUnit, utrzymanie reguł architektonicznych.
  - Monitoring pokrycia JaCoCo, dopisywanie testów do osiągnięcia progów.
  - Naprawy defektów.
- **Frontend Dev**:
  - Testy Vitest dla utils/api i krytycznych komponentów.
  - Integracja z stubami generowanymi przez Spring Cloud Contract.
  - E2E wspólnie z QA, naprawy defektów UI.
- **DevOps/CI**:
  - Pipeline CI: konfiguracja JaCoCo reporting, ArchUnit validation, contract verification.
  - Środowisko staging, sekrety, uruchamianie ZAP/k6.
  - Monitoring coverage trends, publikacja raportów.
- **Product Owner**:
  - Akceptacja kryteriów biznesowych, doprecyzowanie wymagań (np. kody błędów w edge-case'ach).
  - Review kontraktów API pod kątem zgodności z oczekiwaniami biznesowymi.

### 10. Procedury raportowania błędów
- **Kanał**: issue tracker (GitHub Issues/Jira – zależnie od projektu).
- **Szablon zgłoszenia**:
  - **Tytuł**: `[module] krótki opis`.
  - **Środowisko**: local/staging, wersja, commit/sha.
  - **Kroki odtworzenia**: numerowane, deterministyczne.
  - **Oczekiwany rezultat** vs **rzeczywisty**.
  - **Załączniki**: logi backend (`pl.olesek._xcards`), payload request/response, screenshot/har (dla UI).
  - **Priorytet**: P0/P1/P2 + uzasadnienie (wpływ na bezpieczeństwo/dane/flow).
- **Triaging**:
  - Codzienny przegląd P0/P1; P0 natychmiastowa eskalacja do odpowiedniego właściciela modułu.

</plan_testów>

