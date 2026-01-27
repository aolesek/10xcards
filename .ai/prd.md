# Dokument wymagań produktu (PRD) - 10xCards

## 1. Przegląd produktu

10xCards to aplikacja internetowa zaprojektowana w celu usprawnienia procesu tworzenia fiszek edukacyjnych poprzez wykorzystanie sztucznej inteligencji. Aplikacja umożliwia użytkownikom automatyczne generowanie fiszek na podstawie dostarczonego tekstu, a także ręczne tworzenie i zarządzanie nimi. Produkt skierowany jest przede wszystkim do studentów i uczniów, ale jest również otwarty na profesjonalistów i osoby uczące się przez całe życie, które chcą zoptymalizować swój proces nauki. Celem MVP jest dostarczenie podstawowych narzędzi do szybkiego tworzenia i organizowania fiszek, zintegrowanych z prostym trybem nauki, aby ułatwić użytkownikom korzystanie z metody powtórek w interwałach (spaced repetition).

## 2. Problem użytkownika

Głównym problemem, który rozwiązuje 10xCards, jest czasochłonność i wysiłek związany z manualnym tworzeniem wysokiej jakości fiszek edukacyjnych. Wielu uczniów i studentów rezygnuje z tej efektywnej metody nauki, ponieważ przygotowanie zestawu fiszek z obszernych materiałów, takich jak notatki z wykładów czy artykuły, jest postrzegane jako zbyt pracochłonne. Proces ten odciąga ich od samego procesu uczenia się. 10xCards ma na celu zautomatyzowanie i znaczne przyspieszenie tego etapu przygotowawczego, umożliwiając użytkownikom skupienie się na nauce, a nie na tworzeniu narzędzi.

## 3. Wymagania funkcjonalne

### 3.1. Zarządzanie kontem użytkownika
- Rejestracja nowego użytkownika za pomocą adresu e-mail i hasła.
- Logowanie do istniejącego konta.
- Mechanizm odzyskiwania zapomnianego hasła.
- Utrzymywanie sesji użytkownika przy użyciu tokenów JWT.

### 3.2. Zarządzanie taliami (Decks)
- Tworzenie nowej talii z unikalną nazwą (limit 100 znaków, treść trimowana).
- Wyświetlanie listy wszystkich talii użytkownika wraz z liczbą fiszek w każdej z nich.
- Możliwość edycji nazwy istniejącej talii.
- Możliwość usunięcia talii, co skutkuje kaskadowym usunięciem wszystkich przypisanych do niej fiszek.

### 3.3. Zarządzanie fiszkami (Flashcards)
- Manualne tworzenie nowej fiszki w ramach wybranej talii, zawierającej przód (awers) i tył (rewers).
- Limit znaków dla awersu i rewersu wynosi 500 znaków; treść jest trimowana.
- Edycja treści istniejącej fiszki.
- Usuwanie pojedynczej fiszki.
- Wyświetlanie wszystkich fiszek należących do wybranej talii.
- Każda fiszka posiada atrybut `source` o wartościach: `manual`, `ai`, `ai-edited`.

### 3.4. Generowanie fiszek przez AI
- Dedykowany interfejs do wklejania tekstu (od 500 do 10 000 znaków) w celu wygenerowania fiszek.
- Przed rozpoczęciem generowania użytkownik musi wybrać istniejącą talię lub utworzyć nową.
- Użytkownik wybiera tryb generacji:
  - **Przyswajanie wiedzy** (domyślny): AI tworzy fiszki na podstawie całego tekstu źródłowego.
  - **Nauka języka (A1–C2)**: AI identyfikuje słowa trudniejsze niż wskazany poziom CEFR i tworzy fiszki typu: słowo → definicja słownikowa (w języku słowa) + tłumaczenie na polski. Tryb zaprojektowany głównie pod język angielski, ale może działać z innymi językami (nie-PL).
- Użytkownik wybiera model AI z predefiniowanej listy (domyślnie `openai/gpt-4o-mini`; backend waliduje allow-listę).
- Użytkownik podaje oczekiwaną liczbę fiszek do wygenerowania (domyślnie 10, maksymalnie 100). W trybie "Przyswajanie wiedzy" jest to liczba kandydatów generowanych z całego tekstu. W trybach językowych jest to maksymalny limit fiszek – jeśli słów spełniających kryteria jest więcej, AI wybiera najważniejsze/najczęstsze.
- Synchroniczny proces po stronie backendu, który na podstawie tekstu zwraca listę fiszek-kandydatów (może być pusta jeśli nie znaleziono słów spełniających kryteria).
- Sesja przeglądu wygenerowanych kandydatów jest utrwalana na backendzie, co pozwala na powrót do niej np. po odświeżeniu strony.
- Asynchroniczna obsługa na frontendzie, aby nie blokować interfejsu użytkownika podczas generowania.
- Prezentacja wygenerowanych kandydatów w formie siatki.
- Każdy kandydat posiada opcje: "Akceptuj", "Odrzuć", "Edytuj".
- Edycja kandydata odbywa się w oknie modalnym.
- Możliwość wsadowego zapisu wszystkich zaakceptowanych i edytowanych fiszek do wybranej talii za pomocą jednego żądania.
- Wprowadzenie miesięcznego limitu na liczbę generacji fiszek przez AI dla każdego użytkownika.
- Dostępny jest widok „Historia generowań AI" (read-only, paginowany) pokazujący wykonane generowania bieżącego użytkownika (m.in. data, model, hash i długość tekstu, liczby wygenerowanych oraz zaakceptowanych/edytowanych).

### 3.5. Tryb nauki
- Prosty interfejs do przeglądania fiszek z wybranej talii w losowej kolejności.
- Domyślnie wyświetlany jest awers fiszki.
- Użytkownik ma możliwość odsłonięcia rewersu.
- Możliwość nawigacji do następnej i poprzedniej fiszki.
- Po przejrzeniu wszystkich fiszek w talii wyświetlany jest ekran podsumowujący.

## 4. Granice produktu

### 4.1. Funkcjonalności w ramach MVP
- Generowanie fiszek przez AI na podstawie tekstu wklejonego przez użytkownika (z wyborem modelu oraz oczekiwanej liczby fiszek).
- Manualne tworzenie, edycja i usuwanie fiszek.
- Podstawowy system kont użytkowników (rejestracja, logowanie, odzyskiwanie hasła) do przechowywania fiszek.
- Organizacja fiszek w talie.
- Prosty tryb nauki oparty na losowym przeglądaniu fiszek.
- Historia generowań AI (read-only, informacyjna).

### 4.2. Funkcjonalności poza zakresem MVP
- Implementacja zaawansowanego algorytmu powtórek (np. SM-2).
- Import plików w formatach takich jak PDF, DOCX, itp.
- Współdzielenie talii fiszek między użytkownikami.
- Integracje z zewnętrznymi platformami edukacyjnymi (np. Moodle, Google Classroom).
- Dedykowane aplikacje mobilne (iOS, Android).

## 5. Historyjki użytkowników

### ID: US-001
- Tytuł: Rejestracja nowego użytkownika
- Opis: Jako nowy użytkownik, chcę móc założyć konto za pomocą mojego adresu e-mail i hasła, abym mógł przechowywać swoje fiszki.
- Kryteria akceptacji:
    - Formularz rejestracji zawiera pola na adres e-mail i hasło.
    - Walidacja po stronie klienta i serwera sprawdza poprawność formatu e-maila.
    - Hasło musi spełniać minimalne wymagania bezpieczeństwa.
    - System uniemożliwia rejestrację na już istniejący adres e-mail.
    - Po pomyślnej rejestracji jestem automatycznie zalogowany i przekierowany do głównego panelu.

### ID: US-002
- Tytuł: Logowanie użytkownika
- Opis: Jako zarejestrowany użytkownik, chcę móc zalogować się na swoje konto, aby uzyskać dostęp do moich talii i fiszek.
- Kryteria akceptacji:
    - Formularz logowania zawiera pola na adres e-mail i hasło.
    - Po poprawnym wprowadzeniu danych jestem zalogowany i przekierowany do głównego panelu.
    - W przypadku podania błędnych danych wyświetlany jest stosowny komunikat o błędzie.
    - Zaimplementowany jest podstawowy rate limiting na próby logowania.

### ID: US-003
- Tytuł: Odzyskiwanie hasła
- Opis: Jako użytkownik, który zapomniał hasła, chcę mieć możliwość jego zresetowania, abym mógł odzyskać dostęp do konta.
- Kryteria akceptacji:
    - Na stronie logowania znajduje się link "Zapomniałem hasła".
    - Po jego kliknięciu jestem proszony o podanie adresu e-mail powiązanego z kontem.
    - Na podany adres e-mail wysyłany jest link z unikalnym tokenem do resetowania hasła.
    - Link prowadzi do formularza, gdzie mogę ustawić nowe hasło.

### ID: US-004
- Tytuł: Wylogowanie użytkownika
- Opis: Jako zalogowany użytkownik, chcę móc się wylogować, aby bezpiecznie zakończyć sesję.
- Kryteria akceptacji:
    - W interfejsie aplikacji znajduje się widoczny przycisk "Wyloguj".
    - Po kliknięciu przycisku moja sesja zostaje zakończona, a ja jestem przekierowany na stronę główną.

### ID: US-005
- Tytuł: Tworzenie nowej talii
- Opis: Jako użytkownik, chcę móc tworzyć nowe talie, aby organizować moje fiszki tematycznie.
- Kryteria akceptacji:
    - W głównym panelu znajduje się przycisk do tworzenia nowej talii.
    - Po kliknięciu jestem proszony o podanie nazwy dla nowej talii (max 100 znaków).
    - Po zatwierdzeniu nowa, pusta talia pojawia się na mojej liście talii.

### ID: US-006
- Tytuł: Wyświetlanie listy talii
- Opis: Jako użytkownik, chcę widzieć listę wszystkich moich talii, abym miał szybki przegląd moich materiałów do nauki.
- Kryteria akceptacji:
    - Główny panel aplikacji domyślnie wyświetla listę wszystkich moich talii.
    - Przy każdej talii widoczna jest jej nazwa oraz liczba zawartych w niej fiszek.
    - Jeśli nie mam żadnych talii, wyświetlany jest "empty state" z zachętą do stworzenia pierwszej talii.

### ID: US-007
- Tytuł: Edycja nazwy talii
- Opis: Jako użytkownik, chcę mieć możliwość zmiany nazwy istniejącej talii, jeśli popełnię błąd lub zmieni się jej zawartość.
- Kryteria akceptacji:
    - Na liście talii każda pozycja ma opcję edycji nazwy.
    - Po wybraniu edycji mogę wprowadzić nową nazwę i ją zapisać.
    - Zmiana jest natychmiast widoczna na liście talii.

### ID: US-008
- Tytuł: Usuwanie talii
- Opis: Jako użytkownik, chcę móc usunąć talię, której już nie potrzebuję, aby utrzymać porządek na moim koncie.
- Kryteria akceptacji:
    - Na liście talii każda pozycja ma opcję usunięcia.
    - Przed ostatecznym usunięciem wyświetlane jest okno z prośbą o potwierdzenie.
    - Potwierdzenie powoduje nieodwracalne usunięcie talii oraz wszystkich fiszek, które do niej należały.

### ID: US-009
- Tytuł: Ręczne tworzenie fiszki
- Opis: Jako użytkownik, chcę mieć możliwość ręcznego dodania nowej fiszki do wybranej talii, abym mógł tworzyć własne, precyzyjne materiały.
- Kryteria akceptacji:
    - W widoku talii znajduje się przycisk "Dodaj fiszkę".
    - Formularz dodawania fiszki zawiera pola na awers i rewers (max 500 znaków na pole).
    - Po zapisaniu nowa fiszka jest widoczna na liście fiszek w danej talii, a jej `source` to `manual`.

### ID: US-010
- Tytuł: Generowanie fiszek z tekstu
- Opis: Jako student, chcę wkleić fragment moich notatek i automatycznie wygenerować z nich fiszki, aby zaoszczędzić czas.
- Kryteria akceptacji:
    - W aplikacji dostępna jest dedykowana sekcja do generowania fiszek.
    - Pole tekstowe akceptuje tekst o długości od 500 do 10 000 znaków.
    - Przed rozpoczęciem generowania muszę wybrać istniejącą talię lub utworzyć nową, do której zostaną przypisane fiszki.
    - Mogę wybrać tryb generacji: "Przyswajanie wiedzy" (domyślny) lub jeden z trybów językowych A1–C2.
    - Mogę wybrać model AI z listy (domyślnie `openai/gpt-4o-mini`).
    - Mogę ustawić oczekiwaną liczbę fiszek (domyślnie 10, maksymalnie 100) jako maksymalny limit kandydatów.
    - Po wklejeniu tekstu i kliknięciu "Generuj" rozpoczyna się proces, a UI nie jest blokowane.
    - Po zakończeniu procesu jestem przekierowywany do widoku przeglądu fiszek-kandydatów (lista może być pusta jeśli nie znaleziono słów spełniających kryteria w trybach językowych).

### ID: US-011
- Tytuł: Przegląd i edycja wygenerowanych fiszek
- Opis: Jako użytkownik, chcę przejrzeć wygenerowane przez AI fiszki, odrzucić niepoprawne i edytować te, które wymagają poprawek, aby mieć pełną kontrolę nad materiałem.
- Kryteria akceptacji:
    - Wygenerowane fiszki są wyświetlane w siatce.
    - Każda fiszka-kandydat ma opcje "Akceptuj" (domyślnie zaznaczone), "Odrzuć" i "Edytuj".
    - Odrzucenie fiszki usuwa ją z listy kandydatów.
    - Kliknięcie "Edytuj" otwiera modal, w którym mogę zmienić treść awersu i rewersu.
    - Sesja przeglądu jest zapisywana, dzięki czemu mogę opuścić widok i wrócić do niego później, nie tracąc postępów w akceptacji/edycji fiszek.

### ID: US-012
- Tytuł: Zapisywanie wygenerowanych fiszek
- Opis: Jako użytkownik, po przejrzeniu kandydatów, chcę zapisać wszystkie zaakceptowane i edytowane fiszki w talii wybranej przed generowaniem.
- Kryteria akceptacji:
    - Przycisk "Zapisz" wysyła jedno żądanie do backendu ze wszystkimi zaakceptowanymi i edytowanymi fiszkami, które mają zostać zapisane.
    - Fiszki zaakceptowane bez zmian mają `source` ustawiony na `ai`.
    - Fiszki, które edytowałem, mają `source` ustawiony na `ai-edited`.
    - Po zapisaniu jestem przekierowany do widoku talii, w której zapisano fiszki.

### ID: US-013
- Tytuł: Edycja istniejącej fiszki
- Opis: Jako użytkownik, chcę móc edytować fiszkę, którą już zapisałem, aby poprawić błędy lub zaktualizować informacje.
- Kryteria akceptacji:
    - W widoku listy fiszek w talii każda fiszka ma opcję "Edytuj".
    - Edycja odbywa się w tym samym formularzu co tworzenie fiszki, z wypełnionymi aktualnymi danymi.
    - Zmiany są zapisywane po zatwierdzeniu.
    - Edycja fiszki stworzonej manualnie nie zmienia jej `source`. Edycja fiszki z `source` `ai`  zmienia `source` na `ai-edited`.

### ID: US-014
- Tytuł: Usuwanie fiszki
- Opis: Jako użytkownik, chcę mieć możliwość usunięcia pojedynczej fiszki z talii.
- Kryteria akceptacji:
    - W widoku listy fiszek w talii każda fiszka ma opcję "Usuń".
    - Przed usunięciem wyświetlane jest okno z prośbą o potwierdzenie.
    - Po potwierdzeniu fiszka jest trwale usuwana z talii.

### ID: US-015
- Tytuł: Prosty tryb nauki
- Opis: Jako użytkownik, chcę w prosty sposób przeglądać fiszki z wybranej talii, aby móc utrwalać swoją wiedzę.
- Kryteria akceptacji:
    - W widoku talii znajduje się przycisk "Ucz się".
    - Po jego kliknięciu przechodzę do interfejsu nauki, gdzie fiszki z danej talii wyświetlane są w losowej kolejności.
    - Domyślnie widoczny jest tylko awers. Kliknięcie na fiszkę odsłania rewers.
    - Przyciski nawigacyjne pozwalają przechodzić do następnej i poprzedniej fiszki.
    - Po przejrzeniu ostatniej fiszki pojawia się ekran podsumowania.

### ID: US-016
- Tytuł: Obsługa limitu generacji AI
- Opis: Jako użytkownik, powinienem zostać poinformowany, gdy przekroczę mój miesięczny limit generowania fiszek.
- Kryteria akceptacji:
    - Każdy użytkownik ma zdefiniowany w systemie miesięczny limit generacji.
    - Próba wykonania generacji po przekroczeniu limitu skutkuje wyświetleniem komunikatu o błędzie.
    - W ramach MVP UI nie informuje proaktywnie o zbliżającym się limicie.

### ID: US-017
- Tytuł: Historia generowań AI
- Opis: Jako użytkownik, chcę móc zobaczyć listę moich dotychczasowych generowań AI, aby mieć wgląd w historię użycia i parametry generacji.
- Kryteria akceptacji:
    - Dostępny jest widok historii generowań dostępny tylko dla zalogowanego użytkownika.
    - Widok wyświetla paginowaną listę generowań bieżącego użytkownika.
    - Dla każdego wpisu widoczne są podstawowe informacje: data, model AI, hash i długość tekstu, liczba wygenerowanych oraz zaakceptowanych/edytowanych kandydatów.
    - Kliknięcie na wiersz w tabeli przekierowuje do widoku przeglądu danej generacji (AI Review).

## 6. Metryki sukcesu

### 6.1. Wskaźnik akceptacji fiszek AI
- Cel: 75% fiszek wygenerowanych przez AI jest akceptowanych przez użytkownika (status `ai` lub `ai-edited`).
- Sposób pomiaru: Pomiar będzie dokonywany manualnie na podstawie danych z bazy. Tabela `generations` będzie przechowywać informację o liczbie wygenerowanych kandydatów (`generated_count`) dla każdej operacji. Tabela `flashcards` będzie zawierać referencję do `generation_id`. Wskaźnik będzie obliczany przez porównanie liczby fiszek zapisanych z danym `generation_id` do wartości `generated_count`.

### 6.2. Udział AI w tworzeniu fiszek
- Cel: 75% wszystkich tworzonych przez użytkowników fiszek powstaje z wykorzystaniem AI (źródło `ai` lub `ai-edited`).
- Sposób pomiaru: Analiza pola `source` w tabeli `flashcards` w celu określenia proporcji fiszek tworzonych manualnie do tych generowanych przez AI. Analiza będzie przeprowadzana okresowo na danych z bazy.
