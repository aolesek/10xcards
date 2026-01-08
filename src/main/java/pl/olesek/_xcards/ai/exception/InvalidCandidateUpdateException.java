package pl.olesek._xcards.ai.exception;

/**
 * Exception thrown when candidate update request contains invalid data.
 */
public class InvalidCandidateUpdateException extends RuntimeException {

    public InvalidCandidateUpdateException(String message) {
        super(message);
    }
}
