package pl.olesek._xcards.flashcard;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class FlashcardSourceConverter implements AttributeConverter<FlashcardSource, String> {

    @Override
    public String convertToDatabaseColumn(FlashcardSource source) {
        if (source == null) {
            return null;
        }
        return source.getDatabaseValue();
    }

    @Override
    public FlashcardSource convertToEntityAttribute(String dbData) {
        if (dbData == null) {
            return null;
        }

        for (FlashcardSource source : FlashcardSource.values()) {
            if (source.getDatabaseValue().equals(dbData)) {
                return source;
            }
        }

        throw new IllegalArgumentException("Unknown database value: " + dbData);
    }
}

