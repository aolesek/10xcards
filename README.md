# 10xCards

[![Build Status](https://github.com/aolesek/10xcards-java/actions/workflows/main.yml/badge.svg)](https://github.com/aolesek/10xcards-java/actions/workflows/main.yml)

An AI-powered web application to streamline the creation of educational flashcards.

## Table of Contents
- [10xCards](#10xcards)
  - [Table of Contents](#table-of-contents)
  - [Project Description](#project-description)
  - [Tech Stack](#tech-stack)
    - [Backend](#backend)
    - [AI Services](#ai-services)
    - [CI/CD \& Hosting](#cicd--hosting)
    - [Frontend (Planned)](#frontend-planned)
  - [Getting Started Locally](#getting-started-locally)
    - [Prerequisites](#prerequisites)
    - [Configuration](#configuration)
    - [Running the Application](#running-the-application)
  - [Available Scripts](#available-scripts)
  - [Project Scope](#project-scope)
    - [Key Features (MVP)](#key-features-mvp)
    - [Future Features (Post-MVP)](#future-features-post-mvp)
  - [Project Status](#project-status)
  - [License](#license)

## Project Description

10xCards is a web application designed to address the time-consuming process of creating high-quality educational flashcards. By leveraging AI, the application allows users to automatically generate flashcards from text, in addition to creating them manually. The primary goal is to help students, professionals, and lifelong learners optimize their study process by focusing on learning rather than on tool creation.

The MVP (Minimum Viable Product) focuses on providing the core tools for quickly creating, organizing, and reviewing flashcards using a simple, effective interface.

## Tech Stack

### Backend
| Technology | Version | Description |
|---|---|---|
| Java | 21 | Core programming language for the backend. |
| Spring Boot | 3.5.7 | Framework for creating stand-alone, production-grade Spring based Applications. |
| Spring Data JPA | | For data access and management with a PostgreSQL database. |
| Spring Security | | Handles authentication and authorization. |
| PostgreSQL | | The relational database for storing all application data. |
| Liquibase | | For tracking, managing, and applying database schema changes. |
| Lombok | | Reduces boilerplate code for model and data objects. |
| Maven | | Build automation and dependency management tool. |

### AI Services
| Service | Description |
|---|---|
| Openrouter.ai | Provides access to a wide range of AI models (from OpenAI, Anthropic, Google) for generating flashcards. |

### CI/CD & Hosting
| Service | Description |
|---|---|
| GitHub Actions | For continuous integration and delivery pipelines. |
| Docker | The application will be containerized for deployment. |
| DigitalOcean | Cloud platform for hosting the application. |

### Frontend (Planned)
The frontend is not yet implemented but is planned to be a single-page application served by Spring Boot, using the following technologies:
- **React 19** with **TypeScript**
- **Tailwind CSS 4**
- **Shadcn/ui** component library

## Getting Started Locally

### Prerequisites
- [JDK 21](https://www.oracle.com/java/technologies/downloads/#jdk21)
- [Apache Maven](https://maven.apache.org/download.cgi)
- [PostgreSQL](https://www.postgresql.org/download/)
- An IDE (e.g., IntelliJ IDEA, VSCode)

### Configuration

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/aolesek/10xcards-java.git
    cd 10xcards-java
    ```

2.  **Set up the database:**
    - Create a new PostgreSQL database.
    - Update the `src/main/resources/application.properties` file with your database credentials. A template is provided in `application.properties.example`.

    ```properties
    # src/main/resources/application.properties
    spring.datasource.url=jdbc:postgresql://localhost:5432/your-db-name
    spring.datasource.username=your-username
    spring.datasource.password=your-password
    
    spring.jpa.hibernate.ddl-auto=validate
    ```

3.  **Set up Environment Variables:**
    - For AI features, you need an API key from [Openrouter.ai](https://openrouter.ai/).
    - Set the key as an environment variable in your system or IDE:
    ```sh
    OPENROUTER_API_KEY="your-api-key"
    ```

### Running the Application
1.  **Build the project:**
    This command will download dependencies, compile the code, and run tests.
    ```sh
    mvn clean install
    ```

2.  **Run the application:**
    ```sh
    mvn spring-boot:run
    ```
    The application will start on `http://localhost:8080`.

## Available Scripts

- `mvn clean install` - Builds the project, runs tests, and packages the application.
- `mvn spring-boot:run` - Runs the application locally.
- `mvn spotless:check` - Checks if the code formatting follows the project's style guide.
- `mvn spotless:apply` - Automatically formats the code to match the project's style guide.

## Project Scope

### Key Features (MVP)
- **User Accounts:** Secure registration, login, and password management.
- **Deck Management:** Create, view, edit, and delete flashcard decks.
- **Manual Flashcards:** Manually add, edit, and delete flashcards within a deck.
- **AI-Powered Generation:** Generate flashcard candidates from user-provided text.
- **AI Review Workflow:** A dedicated interface to accept, edit, or reject AI-generated suggestions before saving them.
- **Simple Study Mode:** Review flashcards from a deck in a randomized order.

### Future Features (Post-MVP)
- Implementation of an advanced spaced repetition algorithm (e.g., SM-2).
- Import flashcards from files (PDF, DOCX).
- Share decks with other users.
- Integration with external educational platforms (e.g., Moodle).
- Dedicated mobile applications for iOS and Android.

## Project Status

**In Development**

This project is currently under active development. The initial backend structure is being set up, and features for the MVP are in progress.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
