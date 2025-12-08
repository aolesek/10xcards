package pl.olesek._xcards.deck.mapper;

import org.springframework.data.domain.Page;
import org.springframework.stereotype.Component;

import pl.olesek._xcards.deck.DeckEntity;
import pl.olesek._xcards.deck.dto.DeckResponse;
import pl.olesek._xcards.deck.dto.PageInfo;
import pl.olesek._xcards.deck.dto.PagedDeckResponse;
import pl.olesek._xcards.flashcard.FlashcardRepository.FlashcardCountProjection;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class DeckMapper {

    public DeckResponse toResponse(DeckEntity entity, int flashcardCount) {
        return new DeckResponse(entity.getId(), entity.getName(), flashcardCount,
                entity.getCreatedAt(), entity.getUpdatedAt());
    }

    public PagedDeckResponse toPagedResponse(Page<DeckEntity> page,
            List<FlashcardCountProjection> flashcardCounts) {

        Map<UUID, Integer> countMap = new HashMap<>();
        for (FlashcardCountProjection projection : flashcardCounts) {
            countMap.put(projection.getDeckId(), projection.getCount().intValue());
        }

        List<DeckResponse> content = page.getContent().stream()
                .map(entity -> toResponse(entity, countMap.getOrDefault(entity.getId(), 0)))
                .toList();

        PageInfo pageInfo = new PageInfo(page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());

        return new PagedDeckResponse(content, pageInfo);
    }
}

