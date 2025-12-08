package pl.olesek._xcards.flashcard.exception;

import java.util.UUID;

public class FlashcardNotFoundException extends RuntimeException {

    public FlashcardNotFoundException(UUID flashcardId) {
        super("Flashcard not found with id: " + flashcardId);
    }
}

