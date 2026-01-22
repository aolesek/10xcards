# Plan implementacji widoku Przegląd fiszek (AI Review)

## 1. Przegląd
Widok **Przegląd fiszek (AI Review)** pozwala użytkownikowi przejrzeć kandydatów wygenerowanych przez AI, dla każdego kandydata wykonać akcję **Akceptuj / Odrzuć / Edytuj**, a następnie **zapisać wsadowo** wszystkie zaakceptowane i edytowane kandydaty jako fiszki w docelowej talii.  
Kluczowe wymaganie z PRD: **postęp przeglądu musi być utrwalany na backendzie**, tak aby odświeżenie strony lub opuszczenie widoku nie powodowało utraty akceptacji/odrzuceń/edycji.

## 2. Routing widoku
- **Ścieżka**: `/ai/review/:generationId`
- **Dostęp**: tylko dla zalogowanych (analogicznie jak inne widoki) – widok powinien być opakowany w `ProtectedRoute` na poziomie komponentu widoku.
- **Parametry**:
  - `generationId` (string, UUID) – identyfikator sesji generacji.
- **Zmiany w routerze**: dodać nową trasę do `frontend/src/routes/router.tsx` mapującą na `AIReviewView`.

## 3. Struktura komponentów
Rekomendowana struktura (komponenty nowe + istniejące):

```
AIReviewView (view)
└─ ProtectedRoute
   └─ Container (layout)
      ├─ UserMenu (istniejący)
      ├─ HeaderSection
      │  └─ AIGenerationHeader (nowy)
      ├─ ContentSection
      │  ├─ LoadingState (wewnętrzny / nowy)
      │  ├─ ErrorState (wewnętrzny / nowy, używa InlineError)
      │  └─ CandidateGrid (nowy)
      │     └─ CandidateCard[] (nowy)
      │        └─ EditCandidateDialog (nowy, uruchamiany z karty)
      └─ SaveBar (opcjonalny w MVP; nowy) / Banner stanu zapisów
```

## 4. Szczegóły komponentów

### AIReviewView
- **Opis komponentu**: główny widok. Odpowiada za pobranie sesji generacji, renderowanie listy kandydatów, obsługę akcji na kandydatach (PATCH), oraz zapis (POST save) i nawigację po sukcesie.
- **Główne elementy**:
  - kontener (`div.container ...`) spójny ze stylem innych widoków (`AIGenerateView`, `AILoadingView`)
  - nagłówek (`h1`) + opis
  - sekcja headera (`AIGenerationHeader`)
  - siatka kandydatów (`CandidateGrid`)
  - stany: loading / error / empty (np. gdy wszystkie odrzucone)
- **Obsługiwane zdarzenia**:
  - `useEffect` na mount: `GET /api/ai/generations/{generationId}`
  - akcje na kandydatach:
    - akceptacja: `PATCH /api/ai/generations/{generationId}/candidates`
    - odrzucenie: `PATCH ...`
    - edycja: otwarcie dialogu + submit `PATCH ...`
  - zapis do talii: `POST /api/ai/generations/{generationId}/save`
  - retry: ponowne `GET` (oraz ewentualnie ponowienie ostatniego PATCH/POST w zależności od UX)
- **Warunki walidacji (frontend)**:
  - `generationId` musi istnieć w URL; jeśli brak → redirect do `/ai/generate`.
  - przed `POST save`: co najmniej 1 kandydat o statusie `accepted` lub `edited` (guard w UI, zanim backend zwróci 400).
  - przy `PATCH` z `status="edited"`: `editedFront` i `editedBack` muszą być:
    - po `trim()` niepuste
    - długość \(\le 500\)
- **Typy (DTO i ViewModel)**:
  - DTO: `AIGenerationResponseDto`, `UpdateCandidatesRequestDto`, `UpdateCandidatesResponseDto`, `SaveCandidatesResponseDto`
  - VM: `AIReviewVm`, `CandidateVm`, `EditCandidateFormVm`
- **Propsy**: brak (to view).

### AIGenerationHeader
- **Opis komponentu**: pasek nagłówkowy nad siatką; pokazuje metryki postępu i CTA „Zapisz do talii”.
- **Główne elementy**:
  - licznik kandydatów (np. „Kandydaci: 10”)
  - licznik zaakceptowanych/edytowanych/odrzuconych (zależnie od przyjętej polityki UI)
  - przycisk `Button` „Zapisz do talii”
  - opcjonalny opis talia docelowa (np. `deckId` – jeśli nie ma nazwy talii)
- **Obsługiwane zdarzenia**:
  - `onSaveClick`
- **Warunki walidacji**:
  - przycisk „Zapisz” disabled, jeśli:
    - `isSaving === true`, albo
    - `acceptedOrEditedCount === 0`, albo
    - `deckId` jest `null` (deck usunięty na backendzie – backend zwróci 404 przy save).
- **Typy**:
  - VM: `AIGenerationHeaderVm`
- **Propsy**:
  - `total: number`
  - `acceptedCount: number`
  - `editedCount: number`
  - `rejectedCount: number` (opcjonalnie)
  - `deckId: string | null`
  - `isSaving: boolean`
  - `onSave: () => void`

### CandidateGrid
- **Opis komponentu**: renderuje siatkę kart kandydatów; przy odrzuceniu usuwa kandydata z listy UI (zgodnie z US-011), ale nadal utrzymuje jego status na backendzie.
- **Główne elementy**:
  - `div` z gridem Tailwind (`grid gap-4 sm:grid-cols-2` itd.)
  - mapowanie `candidates.map(...)` do `CandidateCard`
- **Obsługiwane zdarzenia**: deleguje do `CandidateCard` przez callbacki.
- **Warunki walidacji**: brak (poza sensowną obsługą pustej listy).
- **Typy**:
  - `CandidateVm[]`
- **Propsy**:
  - `candidates: CandidateVm[]` (w praktyce już przefiltrowane o `status !== "rejected"` jeśli tak przyjmie UI)
  - `isUpdatingIds: Set<string>` (lub `Record<string, boolean>`)
  - `onAccept(id: string): void`
  - `onReject(id: string): void`
  - `onEditRequest(candidate: CandidateVm): void`

### CandidateCard
- **Opis komponentu**: pojedyncza karta kandydata z treścią awers/rewers i akcjami.
- **Główne elementy**:
  - `Card` (shadcn/ui) / `div` stylowany Tailwind
  - sekcje: „Przód” i „Tył” (dla `edited` pokazać wersję edytowaną jako primary, a oryginał jako secondary/tooltip)
  - przyciski:
    - `Button` „Akceptuj”
    - `Button` „Odrzuć”
    - `Button` „Edytuj”
  - znacznik statusu (badge): pending/accepted/edited
- **Obsługiwane zdarzenia**:
  - `onAcceptClick` → `PATCH status=accepted`
  - `onRejectClick` → `PATCH status=rejected` + usunięcie z UI listy
  - `onEditClick` → otwarcie `EditCandidateDialog`
- **Warunki walidacji**:
  - przyciski disabled, gdy `isUpdating === true` dla tego `id`
  - `status` wysyłany do PATCH: tylko `accepted | rejected | edited`
- **Typy**:
  - `CandidateVm`
- **Propsy**:
  - `candidate: CandidateVm`
  - `isUpdating: boolean`
  - `onAccept(id: string): void`
  - `onReject(id: string): void`
  - `onEdit(candidate: CandidateVm): void`

### EditCandidateDialog
- **Opis komponentu**: modal edycji awersu/rewersu kandydata. Po zatwierdzeniu robi `PATCH status=edited` z `editedFront` i `editedBack`.
- **Główne elementy**:
  - `Dialog` (shadcn/ui)
  - `Textarea` / `Input` dla `front` i `back` + licznik znaków (opcjonalnie)
  - `InlineError` per pole lub tekst pomocniczy
  - przyciski: „Anuluj”, „Zapisz zmiany”
- **Obsługiwane zdarzenia**:
  - `onOpenChange(false)` – zamknięcie
  - `onSubmit` – walidacja + `PATCH`
- **Warunki walidacji (frontend, zgodne z backendem)**:
  - `editedFront.trim().length` w zakresie `[1..500]`
  - `editedBack.trim().length` w zakresie `[1..500]`
  - w request wysyłać **trimowane** wartości (spójnie z `GenerateFlashcardsRequest` na backendzie i walidacją `trim().isEmpty()` w serwisie)
- **Typy**:
  - VM: `EditCandidateFormVm`
  - DTO request: `CandidateUpdateDto` ze `status="edited"`
- **Propsy**:
  - `open: boolean`
  - `candidate: CandidateVm | null`
  - `isSubmitting: boolean`
  - `onOpenChange(open: boolean): void`
  - `onSubmit(candidateId: string, editedFront: string, editedBack: string): void`

### SaveBar (opcjonalnie w MVP)
- **Opis komponentu**: dolny pasek/badge informujący o stanie zapisów (np. „Wszystkie zmiany zapisane” / „Zapisywanie…” / „Błąd zapisu zmian”).  
W MVP można ograniczyć się do prostego komunikatu pod headerem, bo każda akcja wykonuje PATCH natychmiast.
- **Główne elementy**:
  - `Alert`/`div` z komunikatem
- **Obsługiwane zdarzenia**:
  - opcjonalnie `onRetryLastPatch`
- **Warunki walidacji**: brak
- **Propsy**:
  - `status: "idle" | "saving" | "saved" | "error"`
  - `message?: string`

## 5. Typy

### DTO (API Contracts)
Wykorzystać istniejące typy w `frontend/src/lib/ai/aiTypes.ts` oraz dodać brakujące:

- `AIGenerationResponseDto` (już istnieje)
- `AIGenerationCandidateDto` (już istnieje)
- `CandidateStatusDto` (już istnieje: `"pending" | "accepted" | "rejected" | "edited"`)

Nowe DTO do dodania (proponowana lokalizacja: `frontend/src/lib/ai/aiTypes.ts`):
- `CandidateUpdateDto`:
  - `id: string` (UUID)
  - `status: "accepted" | "rejected" | "edited"` (uwaga: backend nie przyjmuje `pending` w PATCH)
  - `editedFront?: string` (w praktyce: `string | null`)
  - `editedBack?: string` (w praktyce: `string | null`)
- `UpdateCandidatesRequestDto`:
  - `candidates: CandidateUpdateDto[]` (niepusta tablica)
- `UpdateCandidatesResponseDto`:
  - `id: string`
  - `updatedCandidatesCount: number`
  - `updatedAt: string` (ISO)
- `SaveCandidatesResponseDto`:
  - `savedCount: number`
  - `flashcardIds: string[]`

### ViewModel (UI State)
Proponowane VM (dopisanie do `aiTypes.ts`):
- `CandidateVm`:
  - `id: string`
  - `front: string`
  - `back: string`
  - `status: CandidateStatusDto`
  - `editedFront: string | null`
  - `editedBack: string | null`
  - `displayFront: string` (pochodna: `editedFront ?? front` gdy status `edited`)
  - `displayBack: string` (pochodna)
- `AIReviewVm`:
  - `generationId: string`
  - `deckId: string | null`
  - `aiModel: string`
  - `candidates: CandidateVm[]`
  - `createdAt: string`
  - `updatedAt: string`
- `EditCandidateFormVm`:
  - `editedFront: string`
  - `editedBack: string`
  - `errors?: { editedFront?: string; editedBack?: string; formError?: string }`

## 6. Zarządzanie stanem
Stan rekomendowany w `AIReviewView`:
- `mode: "loading" | "ready" | "error"`
- `error: string | null`
- `generation: AIReviewVm | null`
- `isSaving: boolean` (dla `POST save`)
- `updatingCandidateIds: Set<string>` (blokowanie akcji na pojedynczych kartach podczas PATCH)
- `editDialogOpen: boolean`
- `editingCandidate: CandidateVm | null`
- `editForm: EditCandidateFormVm`

Custom hook (opcjonalnie, ale rekomendowany dla czytelności):
- `useAIGenerationReview(generationId: string)`:
  - odpowiedzialny za `GET` + mapowanie DTO→VM
  - udostępnia `refresh()`
  - udostępnia `applyCandidateUpdate(update: CandidateUpdateDto)` wykonujące:
    - optimistic update w stanie (dla UX)
    - `PATCH` (z obsługą 401/403/404/400)
    - w razie błędu: rollback albo `refresh()`

W MVP dopuszczalne jest trzymanie logiki bez hooka w samym widoku, ale hook ograniczy duplikację (por. `AIGenerateView` / `AILoadingView`).

## 7. Integracja API

### Wymagane wywołania API
1) **Pobranie sesji generacji**  
- `GET /api/ai/generations/{generationId}`  
- FE akcja: pobierz i zrenderuj kandydatów (odporność na refresh).
- Typ odpowiedzi: `AIGenerationResponseDto`.

2) **Aktualizacja statusu/edycji kandydatów**  
- `PATCH /api/ai/generations/{generationId}/candidates`
- Request: `UpdateCandidatesRequestDto`
  - `candidates` niepuste
  - element:
    - `status: accepted | rejected | edited`
    - jeśli `edited`: `editedFront` i `editedBack` muszą być niepuste po trim i \(\le 500\)
- Response: `UpdateCandidatesResponseDto`
- FE akcja: utrwalić stan na backendzie po każdej interakcji użytkownika.

3) **Zapis zaakceptowanych/edytowanych do talii**  
- `POST /api/ai/generations/{generationId}/save`
- Response: `SaveCandidatesResponseDto`
- FE akcja: po sukcesie przekierować do `/decks/:deckId` (deckId z `AIGenerationResponseDto.deckId`).

### Implementacja klienta API (frontend)
Plik: `frontend/src/lib/api/aiApi.ts`
- dopisać:
  - `getAIGeneration(accessToken, generationId, signal?)`
  - `updateAICandidates(accessToken, generationId, dto, signal?)`
  - `saveAICandidates(accessToken, generationId, signal?)`
Wszystkie używają istniejącego wrappera `fetchJson` i rzucają `ApiError`.

### Obsługa auth i 401
Zgodnie z obecnymi wzorcami:
- jeśli `ApiError.status === 401`: pokazać komunikat „Sesja wygasła…”, wykonać `logout()` i przerwać dalsze akcje.

## 8. Interakcje użytkownika
- **Wejście na widok**: automatyczny fetch generacji; pokazanie spinnera.
- **Akceptuj**:
  - UI: zmiana statusu na `accepted`, badge/kolor, natychmiastowy zapis PATCH.
  - Oczekiwany wynik: po odświeżeniu strony kandydat pozostaje zaakceptowany.
- **Odrzuć**:
  - UI: zapis PATCH `status=rejected` + usunięcie karty z siatki (US-011).
  - Oczekiwany wynik: kandydat nie jest widoczny w gridzie; po refresh nadal odrzucony.
- **Edytuj**:
  - UI: modal z polami front/back (prefill: jeśli kandydat już `edited`, wypełnić `editedFront/editedBack`, inaczej `front/back`).
  - Submit: walidacja 1–500 po trim; PATCH `status=edited` z polami.
- **Zapisz do talii**:
  - UI: disabled jeśli brak `accepted/edited`.
  - Submit: `POST save`; po sukcesie redirect do `/decks/:deckId`.
- **Retry**:
  - przy błędzie GET: przycisk „Spróbuj ponownie” (ponawia GET).
- **Nawigacja awaryjna**:
  - przy 404 generacji / deck usunięty: CTA do `/ai/generate` lub `/decks`.

## 9. Warunki i walidacja
Warunki wymagane przez API oraz ich weryfikacja w UI:
- **GET generation**:
  - 403, jeśli generacja nie należy do usera → komunikat + CTA do `/decks`
  - 404, jeśli generacja nie istnieje → komunikat + CTA do `/ai/generate`
- **PATCH candidates**:
  - `status` musi być jednym z: `accepted | rejected | edited` (backend nie przyjmuje `pending`)
  - jeśli `edited`:
    - `editedFront.trim()` niepuste, długość \(\le 500\)
    - `editedBack.trim()` niepuste, długość \(\le 500\)
  - UI powinno uniemożliwić wysłanie błędnych danych (walidacja przed request).
- **POST save**:
  - UI powinno sprawdzić, że jest co najmniej 1 kandydat `accepted` lub `edited`, inaczej:
    - zablokować przycisk
    - pokazać hint „Zaakceptuj lub edytuj przynajmniej jedną fiszkę”
  - Jeśli `deckId === null` (deck usunięty): blokada CTA i komunikat.

## 10. Obsługa błędów
Scenariusze + rekomendowana reakcja:
- **401 (GET/PATCH/POST)**: „Sesja wygasła…” + `logout()` + przekierowanie zgodnie z istniejącą logiką.
- **403 (GET/PATCH/POST)**: „Brak dostępu do tej generacji” + CTA do `/decks`.
- **404 (GET)**: „Nie znaleziono sesji generowania” + CTA do `/ai/generate`.
- **404 (POST save)**: „Talia została usunięta – nie można zapisać fiszek” + CTA do `/decks`.
- **400 (PATCH)**:
  - jeśli dotyczy edycji (brak pól/za długie): pokazać błędy walidacji w modalu (frontend waliduje wcześniej, ale to fallback).
  - dla innych przypadków: globalny błąd + `refresh()` aby zsynchronizować stan.
- **400 (POST save)**: „Brak zaakceptowanych/edytowanych kandydatów” + wskazówka.
- **Błędy sieciowe (`ApiError.status === 0`)**: komunikat „Problem z połączeniem…” + retry.

## 11. Kroki implementacji
1. **Dodać routing**:
   - utworzyć `frontend/src/views/ai/AIReviewView.tsx`
   - dodać trasę `/ai/review/:generationId` w `frontend/src/routes/router.tsx`
2. **Rozszerzyć klienta API** (`frontend/src/lib/api/aiApi.ts`):
   - dodać `getAIGeneration`, `updateAICandidates`, `saveAICandidates`
3. **Dodać brakujące typy DTO**:
   - w `frontend/src/lib/ai/aiTypes.ts` dopisać request/response typy dla PATCH i POST save
4. **Zaimplementować UI Review**:
   - minimalny MVP: w `AIReviewView` wyrenderować header, grid, obsługę akcji
   - dodać komponenty w `frontend/src/components/ai/`:
     - `AIGenerationHeader.tsx`
     - `CandidateGrid.tsx`
     - `CandidateCard.tsx`
     - `EditCandidateDialog.tsx`
5. **Stan i UX**:
   - optimistic update + blokowanie przycisków podczas PATCH
   - usuwanie odrzuconych z listy UI
   - guard na `POST save` (disabled + hint)
6. **Obsługa błędów**:
   - spójnie z `AILoadingView`: 401→logout; reszta → `InlineError` + retry
7. **Nawigacja po sukcesie save**:
   - po `POST save` redirect do `/decks/:deckId`
8. **Dopieszczanie** (opcjonalnie, jeśli czas pozwoli):
   - banner stanu zapisów / komunikat „Zapisano” po PATCH
   - toggle „Pokaż odrzucone” (nie wymagane w US, ale ułatwia cofnięcie)

