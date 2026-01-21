# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

### Backend (Java/Spring Boot)
```sh
mvn clean install                    # Build and run all tests
mvn spring-boot:run                  # Run the application
mvn test                             # Run all tests
mvn test -Dtest=ClassName            # Run a single test class
mvn test -Dtest=ClassName#methodName # Run a single test method
mvn spotless:apply                   # Format code (required before commit)
mvn spotless:check                   # Check formatting
```

### Frontend (React/Vite)
```sh
cd frontend
npm install                          # Install dependencies
npm run dev                          # Start dev server (port 5173)
npm run build                        # Build for production
npm run lint                         # Run ESLint
npm run test                         # Run tests in watch mode
npm run test:run                     # Run tests once
```

### Database (Docker)
```sh
docker-compose up -d postgres        # Start PostgreSQL
docker-compose --profile tools up -d # Start PostgreSQL + pgAdmin (port 5050)
docker-compose down -v               # Reset DB (deletes data)
```

## Architecture Overview

### Backend Structure
- **Package**: `pl.olesek._xcards` (note: underscore prefix due to numeric package name restriction)
- **Framework**: Spring Boot 3.5 with Spring Security, Spring Data JPA
- **Database**: PostgreSQL with Liquibase migrations (`src/main/resources/db/changelog/`)
- **Auth**: Stateless JWT authentication (access + refresh tokens)

**Domain Modules** (each has entity, repository, service, controller, DTOs, exceptions):
- `auth/` - Registration, login, password reset, token refresh
- `user/` - User profile management
- `deck/` - Flashcard deck CRUD operations
- `flashcard/` - Individual flashcard CRUD within decks
- `ai/` - AI-powered flashcard generation via OpenRouter API

**Cross-cutting**:
- `security/` - JWT filter, security config, token blacklist
- `common/` - Shared DTOs, exceptions, global exception handler
- `ratelimit/` - Rate limiting with Bucket4j
- `email/` - Email service for password reset

### Frontend Structure
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS 4 + shadcn/ui components
- **Routing**: react-router-dom v7

**Key Directories**:
- `src/views/` - Page-level components (routes)
- `src/components/` - Reusable UI components (auth/, decks/, flashcards/, ui/)
- `src/lib/api/` - API client (`httpClient.ts`) and endpoint functions
- `src/lib/auth/` - Auth context, token storage, hooks
- `src/lib/*/` - Domain-specific types and utilities

### API Patterns
- All authenticated endpoints require `Authorization: Bearer <token>` header
- Public endpoints: `/api/auth/**`, `/swagger-ui/**`, `/actuator/health`
- Backend runs on port 8080, frontend dev server on port 5173
- CORS configured for localhost:3000 and localhost:5173

### Testing
- **Backend**: JUnit 5 + Testcontainers for integration tests
- Integration tests extend `AbstractIntegrationTest` which provides PostgreSQL container
- **Frontend**: Vitest for unit tests

### Code Formatting
- Backend uses Spotless with Eclipse formatter (`spotless/code-style.xml`)
- `mvn spotless:apply` must pass before commits (checked in validate phase)
