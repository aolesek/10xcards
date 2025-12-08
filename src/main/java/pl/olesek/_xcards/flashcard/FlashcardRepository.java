package pl.olesek._xcards.flashcard;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FlashcardRepository extends JpaRepository<FlashcardEntity, UUID> {

    List<FlashcardEntity> findByDeckIdOrderByCreatedAtDesc(UUID deckId);

    @Query("SELECT f FROM FlashcardEntity f WHERE f.deck.id = :deckId ORDER BY FUNCTION('RANDOM')")
    List<FlashcardEntity> findByDeckIdInRandomOrder(@Param("deckId") UUID deckId);

    long countByDeckId(UUID deckId);

    @Query("SELECT f.deck.id as deckId, COUNT(f) as count FROM FlashcardEntity f WHERE f.deck.id IN :deckIds GROUP BY f.deck.id")
    List<FlashcardCountProjection> countByDeckIdIn(@Param("deckIds") List<UUID> deckIds);

    List<FlashcardEntity> findByGenerationId(UUID generationId);

    interface FlashcardCountProjection {
        UUID getDeckId();

        Long getCount();
    }
}

