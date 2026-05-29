package com.explorer.backend.repository;

import com.explorer.backend.entity.Concept;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface ConceptRepository extends JpaRepository<Concept, UUID> {
    Optional<Concept> findByNameIgnoreCase(String name);
}
