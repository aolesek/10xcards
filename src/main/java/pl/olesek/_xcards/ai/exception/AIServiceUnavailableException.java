package pl.olesek._xcards.ai.exception;

/**
 * Exception thrown when the external AI service (OpenRouter) is unavailable.
 */
public class AIServiceUnavailableException extends RuntimeException {

    public AIServiceUnavailableException(String message) {
        super(message);
    }

    public AIServiceUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
