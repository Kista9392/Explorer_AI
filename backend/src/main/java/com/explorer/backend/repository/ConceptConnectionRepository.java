package com.explorer.backend.repository;

import com.explorer.backend.entity.ConceptConnection;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ConceptConnectionRepository extends JpaRepository<ConceptConnection, UUID> {
    List<ConceptConnection> findBySourceNameIgnoreCase(String sourceName);
    List<ConceptConnection> findByTargetNameIgnoreCase(String targetName);
}
