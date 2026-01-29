# 10xCards

[![Build Status](https://github.com/aolesek/10xcards-java/actions/workflows/main.yml/badge.svg)](https://github.com/aolesek/10xcards-java/actions/workflows/main.yml)

AI-powered flashcard app for students and lifelong learners.

## Tech Stack

**Backend:** Java 21, Spring Boot 3.5.7, Spring Data JPA, Spring Security, PostgreSQL, Liquibase, Lombok, Maven  
**AI:** Openrouter.ai (OpenAI, Anthropic, Google models)  
**Deployment:** Docker, GitHub Actions, DigitalOcean  
**Testing:** JUnit 5, Mockito, AssertJ, RestAssured, Testcontainers, WireMock, Spring Cloud Contract, ArchUnit, JaCoCo; Frontend: Vitest, Testing Library, Playwright  
**Frontend (Planned):** React 19, TypeScript, Tailwind CSS 4, Shadcn/ui

## Quick Setup

```sh
# Clone and setup
git clone https://github.com/aolesek/10xcards-java.git
cd 10xcards-java

# Start PostgreSQL
docker-compose up -d postgres

# Set API key (optional, for AI features)
export OPENROUTER_API_KEY="your-api-key"           # bash/zsh
$env:OPENROUTER_API_KEY="your-api-key"             # PowerShell

# Build and run (Liquibase migrations run automatically)
mvn clean install
mvn spring-boot:run
```

App: `http://localhost:8080` | DB: `localhost:5432/10xcards` (postgres/postgres)

## Useful Commands

```sh
# Maven
mvn spring-boot:run                    # Run app
mvn spotless:apply                     # Format code

# Docker
docker-compose up -d postgres          # Start DB
docker-compose --profile tools up -d   # Start DB + pgAdmin (localhost:5050)
docker-compose down -v                 # Reset DB (deletes data)

# Database
docker-compose exec postgres psql -U postgres -d 10xcards
docker-compose exec postgres pg_dump -U postgres 10xcards > backup.sql
```

## License

MIT
