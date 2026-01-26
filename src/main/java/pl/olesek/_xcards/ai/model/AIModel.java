package pl.olesek._xcards.ai.model;

import com.fasterxml.jackson.annotation.JsonValue;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Enum representing allowed AI models for flashcard generation.
 * Provides a single source of truth for model validation on the backend.
 */
@Getter
@RequiredArgsConstructor
public enum AIModel {
    
    GPT_4O_MINI("openai/gpt-4o-mini"),
    GPT_5_MINI("openai/gpt-5-mini"),
    GEMINI_2_5_FLASH("google/gemini-2.5-flash"),
    GROK_4_1_FAST("x-ai/grok-4.1-fast"),
    CLAUDE_SONNET_4_5("anthropic/claude-sonnet-4.5"),
    DEEPSEEK_V3_2("deepseek/deepseek-v3.2");

    @JsonValue
    private final String id;

    /**
     * Default AI model.
     */
    public static final AIModel DEFAULT = GPT_4O_MINI;

    /**
     * Parses a string to AIModel enum. Returns null if not found.
     * 
     * @param id the model ID string
     * @return the matching AIModel or null
     */
    public static AIModel fromId(String id) {
        if (id == null) {
            return null;
        }
        
        for (AIModel model : values()) {
            if (model.id.equals(id)) {
                return model;
            }
        }
        
        return null;
    }
}
