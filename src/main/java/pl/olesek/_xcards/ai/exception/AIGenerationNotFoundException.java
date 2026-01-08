package pl.olesek._xcards.ai.exception;

/**
 * Exception thrown when an AI generation session is not found.
 */
public class AIGenerationNotFoundException extends RuntimeException {

    public AIGenerationNotFoundException(String message) {
        super(message);
    }
}
