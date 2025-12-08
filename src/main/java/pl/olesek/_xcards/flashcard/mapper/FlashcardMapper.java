package pl.olesek._xcards.flashcard.mapper;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Component;
import pl.olesek._xcards.deck.dto.PageInfo;
import pl.olesek._xcards.flashcard.FlashcardEntity;
import pl.olesek._xcards.flashcard.dto.FlashcardResponse;
import pl.olesek._xcards.flashcard.dto.PagedFlashcardResponse;

@Component
@RequiredArgsConstructor
public class FlashcardMapper {

    public FlashcardResponse toResponse(FlashcardEntity entity) {
        return new FlashcardResponse(
                entity.getId(),
                entity.getDeck().getId(),
                entity.getFront(),
                entity.getBack(),
                entity.getSource().getDatabaseValue(),
                entity.getGeneration() != null ? entity.getGeneration().getId() : null,
                entity.getCreatedAt(),
                entity.getUpdatedAt());
    }

    public PagedFlashcardResponse toPagedResponse(Page<FlashcardEntity> page) {
        var content = page.getContent().stream()
                .map(this::toResponse)
                .toList();

        var pageInfo = new PageInfo(
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages());

        return new PagedFlashcardResponse(content, pageInfo);
    }
}

