package pl.olesek._xcards.flashcard;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import pl.olesek._xcards.ai.AIGenerationEntity;
import pl.olesek._xcards.deck.DeckEntity;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "flashcards")
@Getter
@Setter
@NoArgsConstructor
public class FlashcardEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "deck_id", nullable = false, foreignKey = @ForeignKey(name = "fk_flashcards_deck_id"))
    private DeckEntity deck;

    @Column(name = "front", nullable = false, length = 500)
    private String front;

    @Column(name = "back", nullable = false, length = 500)
    private String back;

    @Convert(converter = FlashcardSourceConverter.class)
    @Column(name = "source", nullable = false, length = 20)
    private FlashcardSource source;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "generation_id", foreignKey = @ForeignKey(name = "fk_flashcards_generation_id"))
    private AIGenerationEntity generation;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}

