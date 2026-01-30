package pl.olesek._xcards.integration;

import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Singleton PostgreSQL container for all integration tests. This ensures that only ONE container is
 * started regardless of how many Spring Application Contexts are created during testing.
 *
 * <p>
 * This pattern is necessary because Spring Boot creates separate contexts for tests with different
 * configurations (e.g., tests with @WireMockTest vs. without).
 */
public class PostgreSQLTestContainer {

    private static final String DOCKER_IMAGE = "postgres:16-alpine";

    private static PostgreSQLContainer<?> container;

    /**
     * Get or create the singleton PostgreSQL container.
     *
     * @return The PostgreSQL container instance
     */
    @SuppressWarnings("resource") // Container is intentionally kept alive for all tests
    public static PostgreSQLContainer<?> getInstance() {
        if (container == null) {
            container = new PostgreSQLContainer<>(DOCKER_IMAGE)
                    .withDatabaseName("testdb")
                    .withUsername("test")
                    .withPassword("test")
                    .withReuse(true);
            container.start();
        }
        return container;
    }

    /**
     * Private constructor to prevent instantiation.
     */
    private PostgreSQLTestContainer() {}
}
