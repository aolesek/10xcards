# Schemat Bazy Danych PostgreSQL - 10xCards

## 1. Tabele z kolumnami, typami danych i ograniczeniami

### 1.1. Tabela `users`

Tabela przechowująca informacje o użytkownikach systemu wraz z danymi autentykacji i limitami AI.

| Kolumna | Typ danych | Ograniczenia | Opis |
|---------|-----------|--------------|------|
| `id` | UUID | PRIMARY KEY | Unikalny identyfikator użytkownika |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | Adres e-mail użytkownika (login) |
| `password_hash` | VARCHAR(255) | NOT NULL | Zahashowane hasło (bcrypt przez Spring Security) |
| `role` | VARCHAR(20) | NOT NULL, DEFAULT 'USER' | Rola użytkownika w systemie |
| `enabled` | BOOLEAN | NOT NULL, DEFAULT true | Czy konto jest aktywne |
| `monthly_ai_limit` | INTEGER | NOT NULL | Miesięczny limit generacji AI dla użytkownika |
| `ai_usage_in_current_month` | INTEGER | NOT NULL, DEFAULT 0 | Liczba wykorzystanych generacji AI w bieżącym miesiącu |
| `password_reset_token` | VARCHAR(255) | NULL | Token do resetowania hasła |
| `password_reset_token_expiry` | TIMESTAMP WITH TIME ZONE | NULL | Data wygaśnięcia tokenu resetującego |
| `created_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Data utworzenia konta |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Data ostatniej aktualizacji |

**Dodatkowe ograniczenia:**
- `CHECK (monthly_ai_limit >= 0)` - limit nie może być ujemny
- `CHECK (ai_usage_in_current_month >= 0)` - użycie nie może być ujemne
- `CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')` - walidacja formatu e-mail

### 1.2. Tabela `decks`

Tabela przechowująca talie fiszek użytkowników.

| Kolumna | Typ danych | Ograniczenia | Opis |
|---------|-----------|--------------|------|
| `id` | UUID | PRIMARY KEY | Unikalny identyfikator talii |
| `user_id` | UUID | NOT NULL, FOREIGN KEY → users(id) ON DELETE CASCADE | Właściciel talii |
| `name` | VARCHAR(100) | NOT NULL | Nazwa talii (case-sensitive, trimowana) |
| `created_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Data utworzenia talii |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Data ostatniej aktualizacji |

**Dodatkowe ograniczenia:**
- `UNIQUE (user_id, name)` - nazwa talii jest unikalna w obrębie użytkownika (case-sensitive)
- `CHECK (LENGTH(TRIM(name)) > 0)` - nazwa nie może być pusta po trimowaniu
- `CHECK (LENGTH(name) <= 100)` - maksymalna długość nazwy

### 1.3. Tabela `flashcards`

Tabela przechowująca fiszki edukacyjne.

| Kolumna | Typ danych | Ograniczenia | Opis |
|---------|-----------|--------------|------|
| `id` | UUID | PRIMARY KEY | Unikalny identyfikator fiszki |
| `deck_id` | UUID | NOT NULL, FOREIGN KEY → decks(id) ON DELETE CASCADE | Talia, do której należy fiszka |
| `front` | VARCHAR(500) | NOT NULL | Awers fiszki (pytanie/hasło, trimowane) |
| `back` | VARCHAR(500) | NOT NULL | Rewers fiszki (odpowiedź/definicja, trimowane) |
| `source` | flashcard_source_enum | NOT NULL | Źródło pochodzenia fiszki |
| `generation_id` | UUID | NULL, FOREIGN KEY → ai_generations(id) ON DELETE SET NULL | ID generacji AI (jeśli dotyczy) |
| `created_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Data utworzenia fiszki |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Data ostatniej aktualizacji |

**Dodatkowe ograniczenia:**
- `CHECK (LENGTH(TRIM(front)) > 0)` - awers nie może być pusty po trimowaniu
- `CHECK (LENGTH(TRIM(back)) > 0)` - rewers nie może być pusty po trimowaniu
- `CHECK (LENGTH(front) <= 500)` - maksymalna długość awersu
- `CHECK (LENGTH(back) <= 500)` - maksymalna długość rewersu

**ENUM `flashcard_source_enum`:**
```sql
CREATE TYPE flashcard_source_enum AS ENUM ('manual', 'ai', 'ai-edited');
```

### 1.4. Tabela `ai_generations`

Tabela przechowująca historię generacji fiszek przez AI wraz z danymi do metryk i sesji przeglądu.

| Kolumna | Typ danych | Ograniczenia | Opis |
|---------|-----------|--------------|------|
| `id` | UUID | PRIMARY KEY | Unikalny identyfikator generacji |
| `user_id` | UUID | NOT NULL, FOREIGN KEY → users(id) ON DELETE CASCADE | Użytkownik zlecający generację |
| `deck_id` | UUID | NULL, FOREIGN KEY → decks(id) ON DELETE SET NULL | Talia docelowa (może być NULL po usunięciu) |
| `ai_model` | VARCHAR(100) | NOT NULL | Nazwa modelu AI użytego do generacji |
| `source_text_hash` | VARCHAR(64) | NOT NULL | Hash SHA-256 tekstu źródłowego |
| `source_text_length` | INTEGER | NOT NULL | Długość tekstu źródłowego w znakach |
| `generated_candidates_count` | INTEGER | NOT NULL | Liczba wygenerowanych fiszek-kandydatów |
| `candidates` | JSONB | NOT NULL | JSON z kandydatami i ich statusami |
| `created_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Data wykonania generacji |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Data ostatniej aktualizacji sesji |

**Dodatkowe ograniczenia:**
- `CHECK (source_text_length >= 500 AND source_text_length <= 10000)` - zgodnie z wymaganiami PRD
- `CHECK (generated_candidates_count > 0)` - musi zostać wygenerowana co najmniej jedna fiszka

**Struktura JSON w kolumnie `candidates`:**
```json
[
  {
    "id": "uuid-candidate-1",
    "front": "Pytanie 1",
    "back": "Odpowiedź 1",
    "status": "accepted|rejected|edited",
    "edited_front": "Edytowane pytanie",
    "edited_back": "Edytowana odpowiedź"
  }
]
```

## 2. Relacje między tabelami

### 2.1. Relacje główne

```
users (1) ──────< (N) decks
  │
  └──────────────< (N) ai_generations

decks (1) ──────< (N) flashcards
  │
  └──────────────< (N) ai_generations

ai_generations (1) ──────< (N) flashcards
```

### 2.2. Szczegółowy opis relacji

| Relacja | Typ | Klucz obcy | Strategia usuwania | Opis |
|---------|-----|------------|-------------------|------|
| `users` → `decks` | 1:N | `decks.user_id` | `ON DELETE CASCADE` | Usunięcie użytkownika usuwa wszystkie jego talie |
| `users` → `ai_generations` | 1:N | `ai_generations.user_id` | `ON DELETE CASCADE` | Usunięcie użytkownika usuwa historię jego generacji |
| `decks` → `flashcards` | 1:N | `flashcards.deck_id` | `ON DELETE CASCADE` | Usunięcie talii usuwa wszystkie jej fiszki |
| `decks` → `ai_generations` | 1:N | `ai_generations.deck_id` | `ON DELETE SET NULL` | Usunięcie talii zeruje referencję, zachowując statystyki |
| `ai_generations` → `flashcards` | 1:N | `flashcards.generation_id` | `ON DELETE SET NULL` | Usunięcie generacji zeruje referencję w fiszkach |

### 2.3. Kardynalność i własności relacji

- **User-Deck**: Jeden użytkownik może posiadać wiele talii, ale każda talia należy do dokładnie jednego użytkownika (prywatna własność).
- **Deck-Flashcard**: Jedna talia może zawierać wiele fiszek, każda fiszka należy do dokładnie jednej talii.
- **User-AIGeneration**: Jeden użytkownik może wykonać wiele generacji AI, każda generacja jest przypisana do dokładnie jednego użytkownika.
- **Deck-AIGeneration**: Jedna talia może być celem wielu generacji AI, każda generacja (jeśli deck_id nie jest NULL) odnosi się do dokładnie jednej talii.
- **AIGeneration-Flashcard**: Jedna generacja AI może być źródłem wielu zapisanych fiszek, każda fiszka pochodząca z AI (jeśli generation_id nie jest NULL) pochodzi z dokładnie jednej generacji.

## 3. Indeksy

### 3.1. Indeksy automatyczne (klucze główne i unikalne)

Automatycznie tworzone przez PostgreSQL:
- `users_pkey` na `users(id)`
- `decks_pkey` na `decks(id)`
- `flashcards_pkey` na `flashcards(id)`
- `ai_generations_pkey` na `ai_generations(id)`
- `users_email_key` na `users(email)`
- `decks_user_id_name_key` na `decks(user_id, name)`

### 3.2. Indeksy na kluczach obcych

Niezbędne do optymalizacji operacji JOIN i zapytań filtrujących:

```sql
CREATE INDEX idx_decks_user_id ON decks(user_id);
CREATE INDEX idx_flashcards_deck_id ON flashcards(deck_id);
CREATE INDEX idx_flashcards_generation_id ON flashcards(generation_id);
CREATE INDEX idx_ai_generations_user_id ON ai_generations(user_id);
CREATE INDEX idx_ai_generations_deck_id ON ai_generations(deck_id);
```

### 3.3. Indeksy funkcjonalne i specjalizowane

Indeksy wspierające specyficzne zapytania i funkcjonalności:

```sql
-- Optymalizacja wyszukiwania po hash'u tekstu źródłowego (detekcja duplikatów)
CREATE INDEX idx_ai_generations_source_text_hash ON ai_generations(source_text_hash);

-- Optymalizacja zapytań filtrujących fiszki po źródle
CREATE INDEX idx_flashcards_source ON flashcards(source);

-- Optymalizacja sortowania chronologicznego
CREATE INDEX idx_decks_created_at ON decks(created_at DESC);
CREATE INDEX idx_flashcards_created_at ON flashcards(created_at DESC);
CREATE INDEX idx_ai_generations_created_at ON ai_generations(created_at DESC);

-- Indeks GIN dla wydajnego przeszukiwania JSONB (opcjonalny dla przyszłych zapytań)
CREATE INDEX idx_ai_generations_candidates_gin ON ai_generations USING GIN(candidates);
```

### 3.4. Indeksy kompozytowe

Indeksy wspierające złożone zapytania:

```sql
-- Wydajne zapytania o fiszki z konkretnej talii pochodzące z AI
CREATE INDEX idx_flashcards_deck_source ON flashcards(deck_id, source);

-- Wydajne zapytania o generacje użytkownika w określonym przedziale czasowym
CREATE INDEX idx_ai_generations_user_created ON ai_generations(user_id, created_at DESC);
```

## 4. Zasady PostgreSQL (Row Level Security - RLS)

Dla MVP aplikacji 10xCards, bezpieczeństwo na poziomie wierszy (RLS) zostanie zaimplementowane w warstwie aplikacyjnej poprzez Spring Security i JPA. PostgreSQL RLS nie jest wymagany na tym etapie, ponieważ:

1. **Autentykacja i autoryzacja**: Spring Security zarządza sesjami użytkowników i kontrolą dostępu.
2. **Połączenie z bazą**: Aplikacja łączy się z bazą danych za pomocą dedykowanego użytkownika aplikacji, a nie użytkowników końcowych.
3. **Kontrola dostępu**: JPA Repository z metodami filtrującymi po `userId` zapewnia izolację danych użytkowników.

### 4.1. Przyszła implementacja RLS (po MVP)

Jeśli w przyszłości pojawi się wymaganie bezpośredniego dostępu do bazy danych lub potrzeba dodatkowej warstwy bezpieczeństwa, można włączyć RLS:

```sql
-- Włączenie RLS dla tabel użytkownika
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;

-- Przykładowe polityki (wymagają kontekstu sesji użytkownika)
CREATE POLICY decks_user_isolation ON decks
    USING (user_id = current_setting('app.current_user_id')::UUID);

CREATE POLICY flashcards_user_isolation ON flashcards
    USING (deck_id IN (SELECT id FROM decks WHERE user_id = current_setting('app.current_user_id')::UUID));

CREATE POLICY ai_generations_user_isolation ON ai_generations
    USING (user_id = current_setting('app.current_user_id')::UUID);
```

## 5. Dodatkowe uwagi i wyjaśnienia decyzji projektowych

### 5.1. Wybór UUID jako kluczy głównych

**Decyzja:** Wszystkie tabele używają UUID zamiast sekwencyjnych BIGSERIAL.

**Uzasadnienie:**
- **Bezpieczeństwo**: UUID uniemożliwia enumerację zasobów (ataki typu parameter tampering).
- **Skalowalność**: Ułatwia przyszłe sharding i replikację bazy danych.
- **Integracje**: Korzystne przy integracji z zewnętrznymi systemami (unikalne globalne identyfikatory).
- **Distributed systems**: Możliwość generowania ID po stronie aplikacji bez koordynacji z bazą.

**Koszty:** Nieznacznie większe użycie pamięci (16 bajtów vs 8 bajtów) i nieco wolniejsze operacje indeksowania.

### 5.2. Strategia przechowywania kandydatów AI w JSONB

**Decyzja:** Fiszki-kandydaci przechowywane w kolumnie `ai_generations.candidates` typu JSONB, a nie w osobnej tabeli.

**Uzasadnienie:**
- **Atomowość sesji**: Cała sesja przeglądu jest jednym obiektem, co upraszcza operacje read/write.
- **Elastyczność**: JSONB pozwala na łatwą zmianę struktury kandydatów bez migracji schematu.
- **Wydajność**: Pojedyncze zapytanie pobiera wszystkie dane sesji przeglądu.
- **Brak relacji**: Kandydaci nie są pełnoprawnymi encjami - są danymi tymczasowymi sesji.

**Alternatywa odrzucona:** Osobna tabela `flashcard_candidates` wymagałaby dodatkowych JOIN-ów i bardziej złożonej logiki zarządzania stanem.

### 5.3. Soft delete vs Hard delete

**Decyzja:** Implementacja hard delete (fizyczne usuwanie rekordów) dla wszystkich encji w MVP.

**Uzasadnienie:**
- **Prostota**: Brak potrzeby filtrowania "usuniętych" rekordów w każdym zapytaniu.
- **GDPR/Prywatność**: Użytkownicy mogą faktycznie usunąć swoje dane.
- **MVP scope**: Wystarczające dla początkowej wersji produktu.

**Przyszłe rozważania:** W przypadku potrzeby audytu lub możliwości przywracania danych, można dodać kolumny `deleted_at` i politykę soft delete w kolejnych wersjach.

### 5.4. Strategia CASCADE vs SET NULL

**Decyzja różnicowana:**
- `ON DELETE CASCADE`: dla relacji krytycznych (users→decks, decks→flashcards)
- `ON DELETE SET NULL`: dla relacji statystycznych (decks→ai_generations, ai_generations→flashcards)

**Uzasadnienie:**
- **Integralność danych**: Fiszki bez talii nie mają sensu biznesowego - muszą być usunięte.
- **Zachowanie metryk**: Historia generacji AI jest wartościowa dla analityki, nawet jeśli talia została usunięta.
- **Śledzenie pochodzenia**: Fiszki mogą istnieć bez referencji do generacji (np. po manualnej edycji lub czyszczeniu starych danych).

### 5.5. Normalizacja vs Denormalizacja

**Decyzja:** Schemat w 3NF (Third Normal Form) z selektywną denormalizacją.

**Elementy znormalizowane:**
- Oddzielne tabele dla users, decks, flashcards, ai_generations
- Brak duplikacji danych strukturalnych

**Elementy zdenormalizowane:**
- `generated_candidates_count` w `ai_generations` (może być obliczone z JSONB, ale przechowywane dla wydajności)
- `source_text_length` w `ai_generations` (ułatwia raportowanie bez przechowywania pełnego tekstu)

**Uzasadnienie:** Denormalizacja tylko w miejscach, gdzie znacząco poprawia wydajność zapytań analitycznych, przy minimalnym ryzyku niespójności.

### 5.6. Obsługa limitów AI i resetowania liczników

**Decyzja:** Kolumny `monthly_ai_limit` i `ai_usage_in_current_month` w tabeli `users`.

**Implementacja w aplikacji:**
- **Sprawdzanie limitu**: Przed każdą generacją aplikacja sprawdza `ai_usage_in_current_month < monthly_ai_limit`.
- **Inkrementacja użycia**: Po pomyślnej generacji `ai_usage_in_current_month` jest zwiększany o 1.
- **Reset miesięczny**: Zaplanowane zadanie (scheduled job w Spring Boot) resetuje `ai_usage_in_current_month` do 0 dla wszystkich użytkowników pierwszego dnia miesiąca.

**Przyszłe ulepszenia:** Można dodać tabelę `ai_usage_history` do śledzenia historycznego użycia po miesiącach.

### 5.7. Walidacja i trimowanie danych

**Decyzja:** Podstawowa walidacja w bazie (CHECK constraints), główna walidacja i transformacja w aplikacji.

**Podział odpowiedzialności:**
- **Baza danych**: Wymusza niezmienniki biznesowe (np. długość tekstu, formaty).
- **Aplikacja (Spring Boot)**: 
  - Trimowanie białych znaków z name, front, back przed zapisem
  - Zmiana statusu source z `ai` na `ai-edited` przy edycji
  - Walidacja złożonych reguł biznesowych

**Uzasadnienie:** Baza jako ostatnia linia obrony przed nieprawidłowymi danymi, aplikacja jako miejsce logiki biznesowej.

### 5.8. Indeksowanie i wydajność zapytań

**Kluczowe zapytania zidentyfikowane dla MVP:**

1. **Lista talii użytkownika:**
   ```sql
   SELECT * FROM decks WHERE user_id = ? ORDER BY created_at DESC;
   ```
   Obsługiwane przez: `idx_decks_user_id`, `idx_decks_created_at`

2. **Lista fiszek w talii:**
   ```sql
   SELECT * FROM flashcards WHERE deck_id = ? ORDER BY created_at DESC;
   ```
   Obsługiwane przez: `idx_flashcards_deck_id`, `idx_flashcards_created_at`

3. **Losowe fiszki do nauki:**
   ```sql
   SELECT * FROM flashcards WHERE deck_id = ? ORDER BY RANDOM();
   ```
   Obsługiwane przez: `idx_flashcards_deck_id`
   **Uwaga:** `ORDER BY RANDOM()` jest akceptowalne dla MVP, ale przy dużych taliach (>1000 fiszek) może wymagać optymalizacji (np. randomizacja w aplikacji lub użycie algorytmu reservoir sampling).

4. **Metryka akceptacji AI:**
   ```sql
   SELECT 
       g.generated_candidates_count,
       COUNT(f.id) as saved_count
   FROM ai_generations g
   LEFT JOIN flashcards f ON f.generation_id = g.id
   GROUP BY g.id;
   ```
   Obsługiwane przez: `idx_flashcards_generation_id`

5. **Metryka udziału AI:**
   ```sql
   SELECT 
       source,
       COUNT(*) as count
   FROM flashcards
   GROUP BY source;
   ```
   Obsługiwane przez: `idx_flashcards_source`

### 5.9. Typy TIMESTAMP i zarządzanie strefami czasowymi

**Decyzja:** Wszystkie kolumny czasowe używają `TIMESTAMP WITH TIME ZONE`.

**Uzasadnienie:**
- **Globalność**: Aplikacja może być używana przez użytkowników w różnych strefach czasowych.
- **Spójność**: PostgreSQL automatycznie konwertuje do UTC przy zapisie i do lokalnej strefy przy odczycie.
- **Audyt**: Jednoznaczne znaczniki czasu dla operacji tworzenia i aktualizacji.

**Implementacja w Spring Boot:**
- JPA mapuje `TIMESTAMPTZ` na `java.time.Instant` lub `java.time.ZonedDateTime`
- Aplikacja operuje w UTC, konwersja do lokalnej strefy czasowej odbywa się w warstwie prezentacji

### 5.10. Migracje bazy danych z Liquibase

**Struktura changelogów:** (do implementacji w `src/main/resources/db/changelog/`)

```
db/changelog/
├── db.changelog-master.yaml           # Główny plik changelog
├── changes/
│   ├── 001-create-users-table.yaml
│   ├── 002-create-decks-table.yaml
│   ├── 003-create-flashcards-table.yaml
│   ├── 004-create-ai-generations-table.yaml
│   ├── 005-create-indexes.yaml
│   └── 006-insert-seed-data.yaml      # Opcjonalne dane testowe
```

**Najlepsze praktyki:**
- Każda migracja w osobnym pliku z kolejnym numerem
- Rollback zawsze definiowany (gdzie możliwe)
- Preconditions dla krytycznych zmian
- Tagowanie wersji produkcyjnych

### 5.11. Bezpieczeństwo danych wrażliwych

**Hasła:**
- Przechowywane jako bcrypt hash (koszt factor 12-14)
- Hashowanie przez Spring Security (BCryptPasswordEncoder)
- Nigdy nie zwracane w API responses

**Tokeny resetowania hasła:**
- Generowane jako secure random UUID
- Czas wygaśnięcia: 24 godziny (konfigurowalny)
- Jednorazowe użycie (kasowane po wykorzystaniu)
- Przesyłane przez HTTPS only

**Ochrona przed rate limiting:**
- Implementowana w warstwie aplikacji (Spring Security)
- Limit prób logowania: 5 prób / 15 minut per IP
- Limit resetowania hasła: 3 żądania / godzinę per e-mail

### 5.12. Metryki i monitorowanie

**Tabele wspierające metryki sukcesu produktu:**

**Metryka 1: Wskaźnik akceptacji fiszek AI (cel: 75%)**
```sql
-- Zapytanie do obliczenia wskaźnika
SELECT 
    AVG(acceptance_rate) as avg_acceptance_rate
FROM (
    SELECT 
        g.id,
        g.generated_candidates_count,
        COUNT(f.id) as saved_count,
        (COUNT(f.id)::FLOAT / g.generated_candidates_count * 100) as acceptance_rate
    FROM ai_generations g
    LEFT JOIN flashcards f ON f.generation_id = g.id
    WHERE g.created_at >= '2025-01-01'  -- przykładowy okres
    GROUP BY g.id, g.generated_candidates_count
) as generation_stats;
```

**Metryka 2: Udział AI w tworzeniu fiszek (cel: 75%)**
```sql
-- Zapytanie do obliczenia udziału AI
SELECT 
    source,
    COUNT(*) as count,
    ROUND(COUNT(*)::NUMERIC / SUM(COUNT(*)) OVER () * 100, 2) as percentage
FROM flashcards
WHERE created_at >= '2025-01-01'  -- przykładowy okres
GROUP BY source;
```

### 5.13. Backup i disaster recovery

**Rekomendacje dla produkcji:**
- Automatyczne daily backups z PostgreSQL (pg_dump)
- Point-in-time recovery (PITR) włączony
- Retencja backupów: 30 dni
- Testowanie procedury restore: miesięcznie

### 5.14. Ewolucja schematu po MVP

**Potencjalne przyszłe rozszerzenia:**

1. **Zaawansowany algorytm powtórek (SM-2):**
   - Dodanie kolumn do `flashcards`: `ease_factor`, `interval_days`, `repetitions`, `next_review_date`
   - Nowa tabela `review_history` do śledzenia sesji nauki

2. **Współdzielenie talii:**
   - Nowa tabela `deck_shares` z kolumnami: `deck_id`, `shared_with_user_id`, `permission_level`
   - Modyfikacja indeksów i zapytań

3. **Tagi i kategoryzacja:**
   - Nowa tabela `tags`
   - Tabela junction `flashcard_tags` (many-to-many)

4. **Import plików:**
   - Nowa tabela `file_uploads` z metadatami o przetworzonych plikach
   - Rozszerzenie `ai_generations` o `source_file_id`

5. **Statystyki nauki:**
   - Nowa tabela `study_sessions`
   - Nowa tabela `flashcard_reviews` z timestampami i wynikami

---

## Podsumowanie

Schemat bazy danych dla aplikacji 10xCards został zaprojektowany z myślą o:
- ✅ Pełnym wsparciu wszystkich wymagań funkcjonalnych z PRD
- ✅ Skalowalności i możliwości przyszłego rozwoju
- ✅ Bezpieczeństwie danych użytkowników
- ✅ Wydajności kluczowych operacji
- ✅ Możliwości mierzenia metryk sukcesu produktu
- ✅ Zgodności ze stackiem technologicznym (Spring Boot, JPA, PostgreSQL, Liquibase)

Schemat jest gotowy do implementacji jako migracje Liquibase i mapowanie encji JPA w aplikacji Spring Boot.

