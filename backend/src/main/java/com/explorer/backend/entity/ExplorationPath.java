package com.explorer.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "exploration_paths")
public class ExplorationPath {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(name = "path_data", nullable = false, columnDefinition = "TEXT")
    private String pathData;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public ExplorationPath() {}

    public ExplorationPath(String title, String pathData) {
        this.title = title;
        this.pathData = pathData;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getPathData() { return pathData; }
    public void setPathData(String pathData) { this.pathData = pathData; }

    public LocalDateTime getCreatedAt() { return createdAt; }
}
