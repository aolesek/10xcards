package pl.olesek._xcards.ai.model;

import com.fasterxml.jackson.annotation.JsonValue;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Enum representing AI generation modes for flashcard generation. Defines different strategies for
 * generating flashcards from source text.
 */
@Getter
@RequiredArgsConstructor
public enum AIGenerationMode {

    /**
     * Knowledge assimilation mode - generates flashcards from entire text (default).
     */
    KNOWLEDGE_ASSIMILATION("KNOWLEDGE_ASSIMILATION"),

    /**
     * Language learning A1 - generates flashcards for words above CEFR A1 level.
     */
    LANGUAGE_A1("LANGUAGE_A1"),

    /**
     * Language learning A2 - generates flashcards for words above CEFR A2 level.
     */
    LANGUAGE_A2("LANGUAGE_A2"),

    /**
     * Language learning B1 - generates flashcards for words above CEFR B1 level.
     */
    LANGUAGE_B1("LANGUAGE_B1"),

    /**
     * Language learning B2 - generates flashcards for words above CEFR B2 level.
     */
    LANGUAGE_B2("LANGUAGE_B2"),

    /**
     * Language learning C1 - generates flashcards for words above CEFR C1 level.
     */
    LANGUAGE_C1("LANGUAGE_C1"),

    /**
     * Language learning C2 - generates flashcards for words above CEFR C2 level.
     */
    LANGUAGE_C2("LANGUAGE_C2");

    @JsonValue
    private final String value;

    /**
     * Default generation mode.
     */
    public static final AIGenerationMode DEFAULT = KNOWLEDGE_ASSIMILATION;

    /**
     * Parses a string to AIGenerationMode enum. Returns null if not found.
     * 
     * @param value the mode value string
     * @return the matching AIGenerationMode or null
     */
    public static AIGenerationMode fromValue(String value) {
        if (value == null) {
            return null;
        }

        for (AIGenerationMode mode : values()) {
            if (mode.value.equals(value)) {
                return mode;
            }
        }

        return null;
    }

    /**
     * Returns the CEFR level suffix for language modes, or null for knowledge assimilation.
     * 
     * @return CEFR level string (e.g., "A1", "B2") or null
     */
    public String getCefrLevel() {
        if (this == KNOWLEDGE_ASSIMILATION) {
            return null;
        }
        // Extract level from enum name (e.g., LANGUAGE_A1 -> A1)
        return this.name().substring("LANGUAGE_".length());
    }

    /**
     * Checks if this is a language learning mode.
     * 
     * @return true if language mode, false if knowledge assimilation
     */
    public boolean isLanguageMode() {
        return this != KNOWLEDGE_ASSIMILATION;
    }
}
