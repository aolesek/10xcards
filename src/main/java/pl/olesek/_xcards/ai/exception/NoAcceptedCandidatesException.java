package pl.olesek._xcards.ai.exception;

/**
 * Exception thrown when attempting to save flashcards but no candidates are accepted or edited.
 */
public class NoAcceptedCandidatesException extends RuntimeException {

    public NoAcceptedCandidatesException(String message) {
        super(message);
    }
}
