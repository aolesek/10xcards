package pl.olesek._xcards.flashcard;

public enum FlashcardSource {
    MANUAL("manual"),
    AI("ai"),
    AI_EDITED("ai-edited");

    private final String databaseValue;

    FlashcardSource(String databaseValue) {
        this.databaseValue = databaseValue;
    }

    public String getDatabaseValue() {
        return databaseValue;
    }
}

