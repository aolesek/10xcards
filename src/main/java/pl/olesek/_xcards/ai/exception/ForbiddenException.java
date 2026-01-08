package pl.olesek._xcards.ai.exception;

/**
 * Exception thrown when user attempts to access a resource they don't own.
 */
public class ForbiddenException extends RuntimeException {

    public ForbiddenException(String message) {
        super(message);
    }
}
