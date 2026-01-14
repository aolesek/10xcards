package pl.olesek._xcards.ai;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AIGenerationRepository extends JpaRepository<AIGenerationEntity, UUID> {

    List<AIGenerationEntity> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Page<AIGenerationEntity> findByUserId(UUID userId, Pageable pageable);

    Optional<AIGenerationEntity> findByIdAndUserId(UUID id, UUID userId);

    List<AIGenerationEntity> findBySourceTextHash(String sourceTextHash);
}

