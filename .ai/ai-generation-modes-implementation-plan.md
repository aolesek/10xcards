## Plan implementacji zmiany: tryb generowania fiszek (Przyswajanie wiedzy + Nauka języka A1–C2)

## 1. Przegląd
Celem zmiany jest dodanie do widoku generowania fiszek AI możliwości wyboru **trybu generacji**:
- **Przyswajanie wiedzy**: zachowanie obecnego działania (obecny prompt).
- **Nauka języka A1/A2/B1/B2/C1/C2**: nowy prompt, który z podanego tekstu (w języku innym niż polski) wybiera słowa powyżej wskazanego poziomu CEFR i generuje fiszki w formacie:
  - **front**: słowo
  - **back**: definicja w języku słowa (styl słownikowy, np. Oxford) + w nowej linii tłumaczenie na polski

W UI obok pola wyboru trybu ma się znaleźć **ikonka informacyjna** wyświetlająca po najechaniu (hover) opis różnic między trybami.

Założenie biznesowe: jeśli model nie znajdzie słów spełniających kryteria, zwracamy **pustą listę** kandydatów i UI to prezentuje bez dodatkowych “fallbacków”.

Założenie produktowe dot. języków: tryby językowe są projektowane głównie pod **język angielski**, ale jeśli model poprawnie poradzi sobie z innym językiem (nie-PL), funkcja może również zadziałać.

## 2. Routing widoku
Bez zmian (zgodnie z istniejącym routingiem):
- `/ai/generate` – formularz generowania
- `/ai/loading` – wykonywanie generacji (wywołanie API)
- `/ai/review/:generationId` – przegląd kandydatów

## 3. Struktura komponentów
Docelowa struktura (wysokopoziomowo):

```
AIGenerateView
  └─ AIGenerateForm
      ├─ DeckSelect
      ├─ (NEW) AIGenerationModeSelect
      │    └─ (NEW) ModeInfoTooltip (ikonka + hover tooltip)
      ├─ AIModelSelect
      ├─ TextareaWithCounter
      └─ Input (requestedCandidatesCount)
```

Uwagi:
- Pole “Liczba fiszek” jest widoczne we wszystkich trybach i określa **maksymalny limit** liczby kandydatów do wygenerowania (szczegóły w sekcji 9 i 11).

## 4. Szczegóły komponentów

### `AIGenerateView` (widok)
- **Opis**: Kontener widoku generowania. Ładuje talie, utrzymuje stan formularza (VM), waliduje i przekierowuje do `/ai/loading` z `location.state`.
- **Główne elementy**: nagłówek, `AIGenerateForm`, `CreateDeckDialog`.
- **Obsługiwane zdarzenia**:
  - wybór talii, modelu, trybu, tekstu źródłowego, liczby kandydatów
  - submit formularza → nawigacja do `/ai/loading` z pełnym state
- **Warunki walidacji**:
  - poprzez `validateGenerateForm(form)` (po stronie FE) + walidacje backendu (Bean Validation).
  - w trybie językowym ewentualne dodatkowe zasady (np. ostrzeżenie, że tekst ma być nie-PL) są opcjonalne; wymaganie mówi, że nie trzeba obsługiwać braku słów.
- **Typy**:
  - `AIGenerateFormVm` (rozszerzony o `mode`)
  - `AIGenerateFormErrorsVm` (rozszerzony o `mode`)
  - `AIGenerateNavigationState` (rozszerzony o `mode`)
- **Propsy**: brak (to view route component).

### `AIGenerateForm` (formularz)
- **Opis**: Prezentacyjny formularz, renderuje pola, błędy i przycisk “Generuj”.
- **Główne elementy**:
  - `DeckSelect`
  - (NEW) `AIGenerationModeSelect` + ikonka info tooltip
  - `AIModelSelect`
  - `TextareaWithCounter`
  - `Input type=number` dla `requestedCandidatesCount`
  - `LoadingButton`
- **Obsługiwane zdarzenia**:
  - `onDeckChange(deckId)`
  - `onModeChange(mode)`
  - `onModelChange(model)`
  - `onSourceTextChange(text)`
  - `onRequestedCandidatesCountChange(count)`
  - `onSubmit()`
- **Warunki walidacji (FE)**:
  - błędy przekazywane przez rodzica w `errors.*`
  - `requestedCandidatesCount` jest zawsze wymagane (1–100) i oznacza **limit maksymalnej liczby fiszek**:
    - w trybie **Przyswajanie wiedzy**: generujemy do `count` kandydatów na podstawie całego tekstu (jak dotychczas)
    - w trybach **Nauka języka A1–C2**: model ma zebrać **wszystkie** słowa powyżej progu, ale zwrócić **maksymalnie `count`** (jeśli słów jest więcej, wybiera najistotniejsze/najczęstsze w tekście/najbardziej “wartościowe” do nauki)
- **Typy**:
  - `AIGenerateFormVm`, `AIGenerateFormErrorsVm`, `DeckOptionVm`, `AIModelOptionVm`, `AIGenerationMode`
- **Propsy (interfejs)**:
  - dodać do `AIGenerateFormProps`:
    - `modeOptions: AIGenerationModeOptionVm[]` (lub wprost stała lista)
    - `onModeChange: (mode: AIGenerationMode) => void`

### (NEW) `AIGenerationModeSelect`
- **Opis**: Pole wyboru trybu generacji (dropdown) + obok ikonka info z tooltipem.
- **Główne elementy**:
  - `Label`
  - `select` (native, analogicznie do `AIModelSelect`)
  - `ModeInfoTooltip` (ikonka `Info` z `lucide-react`)
- **Obsługiwane zdarzenia**:
  - `onChange(mode)` na zmianę opcji
- **Warunki walidacji**:
  - tryb wymagany (domyślnie `KNOWLEDGE_ASSIMILATION`), błąd gdy pusty/nieobsługiwany
- **Typy**:
  - `AIGenerationMode`, `AIGenerationModeOptionVm`
- **Propsy**:
  - `value: AIGenerationMode | ""`
  - `options: AIGenerationModeOptionVm[]`
  - `disabled?: boolean`
  - `error?: string | null`
  - `onChange: (mode: AIGenerationMode) => void`

### (NEW) `ModeInfoTooltip`
- **Opis**: Ikonka informacyjna z tekstem wyjaśniającym różnicę między trybami po najechaniu.
- **Implementacja techniczna (bez dodatkowych zależności)**:
  - zbudować tooltip w oparciu o CSS (`group`, `group-hover`) i pozycjonowanie absolutne
  - dodać `aria-describedby` / `role="tooltip"` dla dostępności
- **Treść tooltipa (propozycja)**:
  - “Przyswajanie wiedzy: AI tworzy fiszki na podstawie całego tekstu.”
  - “Nauka języka (A1–C2): AI wybiera słowa trudniejsze niż wskazany poziom i tworzy fiszki: słowo → definicja (w języku słowa) + tłumaczenie na polski.”
  - “Liczba fiszek określa maksymalny limit kandydatów do wygenerowania.”
- **Propsy**:
  - `content: string` (lub stała treść w komponencie)

### `AILoadingView` (wykonywanie generacji)
- **Opis**: Pobiera `AIGenerateNavigationState` z `location.state`, waliduje i wywołuje `POST /api/ai/generate`.
- **Wymagana zmiana**:
  - rozszerzyć request wysyłany do `generateFlashcards()` o `mode`
  - uwzględnić `mode` w walidacji `validateGenerateForm(...)`
- **Obsługa pustej listy kandydatów**:
  - brak dodatkowej logiki; przekierowanie do `/ai/review/:id` i tam wyświetlenie pustego stanu (patrz `CandidateGrid`).

### `AIReviewView` / `CandidateGrid`
- **Opis**: przegląd kandydatów.
- **Wymagana zmiana (UX, zalecane)**:
  - rozróżnić pustą listę wynikającą z:
    - “wszystkie odrzucone” vs “nic nie wygenerowano”
  - obecnie `CandidateGrid` pokazuje komunikat “Wszystkie kandydaci zostali odrzuceni.” także gdy BE zwróci 0 kandydatów.
  - rekomendacja: przekazać do `CandidateGrid` dodatkowy kontekst (np. `generatedCandidatesCount` z DTO) i zmienić komunikat na:
    - “Brak słów spełniających kryteria w tekście.” (dla 0 wygenerowanych)
    - “Wszyscy kandydaci zostali odrzuceni.” (dla 0 widocznych po odrzuceniu)

## 5. Typy

### Frontend (TypeScript)
W `frontend/src/lib/ai/aiTypes.ts` dodać/zmienić:
- **`AIGenerationMode`** (new):
  - unia stringów, np.:
    - `"KNOWLEDGE_ASSIMILATION"`
    - `"LANGUAGE_A1" | "LANGUAGE_A2" | "LANGUAGE_B1" | "LANGUAGE_B2" | "LANGUAGE_C1" | "LANGUAGE_C2"`
- **`AIGenerationModeOptionVm`** (new):
  - `value: AIGenerationMode`
  - `label: string` (UI labels po polsku)
- **`AIGenerateFormVm`** (update):
  - dodać `mode: AIGenerationMode`
- **`AIGenerateFormErrorsVm`** (update):
  - dodać `mode?: string`
- **`AIGenerateNavigationState`** (update):
  - dodać `mode: AIGenerationMode`
- **`GenerateFlashcardsRequestDto`** (update):
  - dodać `mode: AIGenerationMode`

W `frontend/src/lib/ai/validateGenerate.ts`:
- walidować `mode` jako wymagany i należący do allow-list (analogicznie do modelu).

### Backend (Java)
Wprowadzić nowe typy/zmiany:
- **`AIGenerationMode` enum** (new, np. `pl.olesek._xcards.ai.model`):
  - `KNOWLEDGE_ASSIMILATION`
  - `LANGUAGE_A1 ... LANGUAGE_C2`
- **`GenerateFlashcardsRequest`** (update):
  - dodać pole `AIGenerationMode mode` (opcjonalne z defaultem `KNOWLEDGE_ASSIMILATION`)
  - walidacja: jeśli nie podane → default; jeśli podane → musi być jednym z enumów
  - uwaga: trybu **nie utrwalamy** w encji/historii (wymaganie: nie pokazujemy trybu w historii generowań)

## 6. Zarządzanie stanem
Bez custom hooków (wzorzec jak obecnie):
- `AIGenerateView` trzyma `form: AIGenerateFormVm` i `errors: AIGenerateFormErrorsVm`
- dodać handler `handleModeChange(mode)` analogicznie do `handleModelChange`
- `mode` przechodzi przez `AIGenerateNavigationState` do `AILoadingView`

Opcjonalnie: jeśli pole count ma być ukrywane w trybach językowych, to `AIGenerateForm` może warunkowo renderować Input count na podstawie `form.mode`.

## 7. Integracja API

### `POST /api/ai/generate`
- **Request (FE DTO)**: `GenerateFlashcardsRequestDto`
  - `deckId: string (UUID)`
  - `sourceText: string (trim, 500–10000)`
  - `requestedCandidatesCount: number (1–100)` *(patrz pytania o wariant “wszystkie słowa”)*
  - `model: AIModelId`
  - **NEW** `mode: AIGenerationMode`
- **Response (DTO)**: `AIGenerationResponseDto`
  - bez zmian funkcjonalnych

### `GET /api/ai/generations` i `GET /api/ai/generations/{id}`
- Bez zmian wymaganych dla samej funkcji trybu, ale rekomendowane jest propagowanie `mode` w odpowiedzi, aby historia generowań mogła to prezentować i żeby łatwiej diagnozować jakość wyników.

## 8. Interakcje użytkownika
- **Wybór trybu**:
  - użytkownik wybiera tryb z listy (domyślnie “Przyswajanie wiedzy”)
  - po najechaniu na ikonkę info widzi opis różnic
- **Generowanie**:
  - klik “Generuj” wysyła wybrany tryb w request do backendu
  - po sukcesie przejście do `/ai/review/:generationId`
- **Brak wyników**:
  - w przeglądzie kandydatów lista może być pusta; UI pokazuje empty state (patrz rekomendacja w sekcji 4 dla poprawnego komunikatu)

## 9. Warunki i walidacja

### Walidacja frontend (przed nawigacją i w `AILoadingView`)
- **deckId**: wymagane
- **model**: wymagane + allow-list (`AI_MODEL_IDS`)
- **mode**: wymagane + allow-list (`AIGenerationMode` enum/Set)
- **sourceText**: trim; 500–10000 znaków
- **requestedCandidatesCount**:
  - wymagane 1–100 zawsze (jako limit maksymalny liczby wygenerowanych kandydatów)

### Walidacja backend (Bean Validation + logika serwisu)
- `deckId`: `@NotNull`
- `sourceText`: `@NotNull`, `@Size(500..10000)`
- `requestedCandidatesCount`: `@Min(1)`, `@Max(100)`
- `model`: enum allow-list (`AIModel`)
- **mode**: enum allow-list (`AIGenerationMode`), default `KNOWLEDGE_ASSIMILATION`

## 10. Obsługa błędów
- **400**: niepoprawne dane wejściowe (w tym `mode` spoza allow-list)
- **401**: brak/wygaśnięty token (już obsługiwane)
- **403**: brak dostępu do talii lub przekroczony limit miesięczny (już obsługiwane)
- **404**: brak talii (już obsługiwane)
- **429**: rate-limit (już obsługiwane)
- **503**: niedostępność AI / błędny format odpowiedzi modelu
  - w trybach językowych prompt musi wymuszać zwracanie **zawsze** JSON array (w tym `[]`), aby nie powodować błędów parsowania.

## 11. Kroki implementacji
### 11.1. Backend (Spring Boot)
1. Dodać enum `AIGenerationMode`.
2. Rozszerzyć `GenerateFlashcardsRequest` o `mode` (z defaultem `KNOWLEDGE_ASSIMILATION`).
3. Dodać wybór promptu w `AIClientService`:
   - `KNOWLEDGE_ASSIMILATION` → istniejący prompt (**Przyswajanie wiedzy**)
   - `LANGUAGE_*` → nowy prompt z parametrem progu CEFR
4. Zaktualizować konfigurację promptów (`application.properties` → osobne properties, np. `app.ai.prompt-template.analysis`, `app.ai.prompt-template.language`).
5. Dodać/rozszerzyć testy:
   - testy walidacji request (mode allow-list)
   - testy budowania promptu (placeholdery, wymuszanie JSON, zachowanie dla `[]`)

### 11.2. Frontend (React + TS)
1. Dodać typy `AIGenerationMode` i opcje do `aiTypes.ts` (oraz stałą listę opcji do UI).
2. Zaktualizować `AIGenerateFormVm`, `AIGenerateNavigationState`, `GenerateFlashcardsRequestDto`, walidację `validateGenerateForm`.
3. Dodać komponent `AIGenerationModeSelect` oraz `ModeInfoTooltip` i wpiąć do `AIGenerateForm`.
4. Zaktualizować `AIGenerateView`:
   - domyślny `mode`
   - handler `handleModeChange`
   - przekazanie do `AIGenerateForm`
   - przekazanie do `navigate("/ai/loading", { state })`
5. Zaktualizować `AILoadingView`:
   - walidacja state zawierającego `mode`
   - wysyłka `mode` do `generateFlashcards()`
6. (Zalecane) Poprawić empty state w `CandidateGrid`, aby komunikat był poprawny przy 0 wygenerowanych wyników.
7. Dodać testy FE:
   - `validateGenerateForm` dla `mode`
   - snapshot/DOM test dla `ModeInfoTooltip` (czy renderuje treść na hover – jeśli implementacja CSS, test może być ograniczony)

### 11.3. QA / UAT (checklista)
- Generowanie w trybie “Przyswajanie wiedzy” działa identycznie jak wcześniej.
- Generowanie w trybach A1–C2 wysyła poprawne `mode`.
- Backend zwraca `[]` bez błędu parsowania, jeśli brak słów.
- UI poprawnie renderuje pustą listę kandydatów i nie wymusza zapisu.
- Tooltip działa na hover i jest czytelny na desktopie.

