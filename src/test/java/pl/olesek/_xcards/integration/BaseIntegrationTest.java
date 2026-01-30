package pl.olesek._xcards.integration;

import lombok.extern.slf4j.Slf4j;

import org.junit.jupiter.api.AfterEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

import pl.olesek._xcards.ai.AIGenerationRepository;
import pl.olesek._xcards.deck.DeckRepository;
import pl.olesek._xcards.flashcard.FlashcardRepository;
import pl.olesek._xcards.security.service.TokenBlacklistService;
import pl.olesek._xcards.user.UserRepository;

import java.lang.reflect.Field;
import java.util.Map;

/**
 * Base class for integration tests using Testcontainers. All integration tests should extend this
 * class to get: - Full Spring context - PostgreSQL container (singleton) - MockMvc for API testing
 * - Database cleanup after each test (since @Transactional doesn't work with HTTP tests)
 *
 * <p>
 * Note: This class uses a singleton PostgreSQL container to ensure only ONE container is started
 * across all test classes, even when Spring creates multiple Application Contexts (e.g., for tests
 * with different configurations like @WireMockTest).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Slf4j
public abstract class BaseIntegrationTest {

    private static final PostgreSQLContainer<?> postgresContainer =
            PostgreSQLTestContainer.getInstance();

    @Autowired
    private FlashcardRepository flashcardRepository;

    @Autowired
    private AIGenerationRepository aiGenerationRepository;

    @Autowired
    private DeckRepository deckRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TokenBlacklistService tokenBlacklistService;

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgresContainer::getJdbcUrl);
        registry.add("spring.datasource.username", postgresContainer::getUsername);
        registry.add("spring.datasource.password", postgresContainer::getPassword);
        registry.add("spring.liquibase.enabled", () -> "true");
    }

    /**
     * Cleans up the entire database after each test. This is necessary because @Transactional doesn't
     * work with HTTP-based integration tests (RestAssured).
     *
     * <p>
     * Deletion order is important due to foreign key constraints: 1. flashcards (references decks and
     * ai_generations) 2. ai_generations (references users and decks) 3. decks (references users) 4.
     * users (no dependencies)
     */
    @AfterEach
    void cleanupDatabase() {
        log.debug("Starting database cleanup...");

        // Delete all flashcards first (they reference decks and ai_generations)
        flashcardRepository.deleteAll();
        log.debug("Deleted all flashcards");

        // Delete all AI generations (they reference users and decks)
        aiGenerationRepository.deleteAll();
        log.debug("Deleted all AI generations");

        // Delete all decks (they reference users)
        deckRepository.deleteAll();
        log.debug("Deleted all decks");

        // Delete all users (no dependencies)
        userRepository.deleteAll();
        log.debug("Deleted all users");

        // Clear the in-memory token blacklist using reflection
        clearTokenBlacklist();
        log.debug("Cleared token blacklist");

        log.debug("Database cleanup completed");
    }

    /**
     * Clears the in-memory token blacklist using reflection. This is necessary to ensure clean state
     * between tests.
     */
    @SuppressWarnings("unchecked")
    private void clearTokenBlacklist() {
        try {
            Field blacklistedTokensField =
                    TokenBlacklistService.class.getDeclaredField("blacklistedTokens");
            blacklistedTokensField.setAccessible(true);
            Map<String, ?> blacklistedTokens = (Map<String, ?>) blacklistedTokensField.get(tokenBlacklistService);
            blacklistedTokens.clear();
        } catch (Exception e) {
            log.warn("Failed to clear token blacklist: {}", e.getMessage());
        }
    }
}
