package com.explorer.backend.repository;

import com.explorer.backend.entity.ExplorationPath;
import com.explorer.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ExplorationPathRepository extends JpaRepository<ExplorationPath, UUID> {
    List<ExplorationPath> findByUserOrderByCreatedAtDesc(User user);
    List<ExplorationPath> findByUserIsNullOrderByCreatedAtDesc();
    long countByUser(User user);
    long countByUserIsNull();
}
