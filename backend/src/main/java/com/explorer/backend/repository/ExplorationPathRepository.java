package com.explorer.backend.repository;

import com.explorer.backend.entity.ExplorationPath;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface ExplorationPathRepository extends JpaRepository<ExplorationPath, UUID> {
}
