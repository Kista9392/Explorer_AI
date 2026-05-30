package com.explorer.backend.repository;

import com.explorer.backend.entity.ChatSession;
import com.explorer.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ChatSessionRepository extends JpaRepository<ChatSession, UUID> {
    List<ChatSession> findByUserAndCreatedAtBefore(User user, java.time.LocalDateTime cutoff);
    List<ChatSession> findByUserOrderByCreatedAtDesc(User user);
    List<ChatSession> findByUserIsNullOrderByCreatedAtDesc();
    long countByUser(User user);
    long countByUserIsNull();
}
