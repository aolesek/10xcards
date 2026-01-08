package pl.olesek._xcards.ai.exception;

/**
 * Exception thrown when user exceeds monthly AI generation limit.
 */
public class MonthlyAILimitExceededException extends RuntimeException {

    public MonthlyAILimitExceededException(String message) {
        super(message);
    }
}
