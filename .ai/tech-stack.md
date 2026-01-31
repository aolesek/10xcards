Frontend - React dla komponentów interaktywnych:
- React 19
- TypeScript 5 dla statycznego typowania kodu i lepszego wsparcia IDE
- Tailwind 4 pozwala na wygodne stylowanie aplikacji
- Shadcn/ui zapewnia bibliotekę dostępnych komponentów React, na których oprzemy UI
- React na FE będzie serwowany przez Spring Boota - powstanie jedna aplikacja
- vitest

Backend:
- Java 21
- Spring Boot 3
- PostgreSQL, JPA i Hibernate
- Spring Security dla autentykacji i autoryzacji
- Liquibase do zarządzania migracjami bazy danych
- OpenAPI do generowania dokumentacji API
- Do opisania API użyj OpenAPI
- junit
- assertj
- spotless

Testy:
- Unit (backend): JUnit 5, Mockito, AssertJ
- Integracyjne API + security (backend): RestAssured
- Integracja DB (backend): Testcontainers (PostgreSQL) + Liquibase
- Integracja z OpenRouter (backend): WireMock
- Kontrakty API (backend + frontend): Spring Cloud Contract (testy producenta + stuby dla konsumenta)
- Testy architektury (backend): ArchUnit
- Pokrycie (backend): JaCoCo
- Unit (frontend): Vitest
- Testy komponentów (frontend): Testing Library (React)
- E2E (UI): Playwright

AI - Komunikacja z modelami przez usługę Openrouter.ai:
- Dostęp do szerokiej gamy modeli (OpenAI, Anthropic, Google i wiele innych), które pozwolą nam znaleźć rozwiązanie zapewniające wysoką efektywność i niskie koszta
- Pozwala na ustawianie limitów finansowych na klucze API

CI/CD i Hosting:
- Github Actions do tworzenia pipeline’ów CI/CD
- Docelowo (na ten moment): hosting na własnym VPS + deploy bezpośrednio z GitHub Actions przez GHCR (aplikacja wymaga FE + BE + Postgresa, VPSa już mam więc mocno zredukuje koszty względem początkowo zakładanego DigitalOcean)