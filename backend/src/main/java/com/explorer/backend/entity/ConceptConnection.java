package com.explorer.backend.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "concept_connections")
public class ConceptConnection {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "source_name", nullable = false)
    private String sourceName;

    @Column(name = "target_name", nullable = false)
    private String targetName;

    @Column(name = "relationship_type", nullable = false)
    private String relationshipType;

    public ConceptConnection() {}

    public ConceptConnection(String sourceName, String targetName, String relationshipType) {
        this.sourceName = sourceName;
        this.targetName = targetName;
        this.relationshipType = relationshipType;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getSourceName() { return sourceName; }
    public void setSourceName(String sourceName) { this.sourceName = sourceName; }

    public String getTargetName() { return targetName; }
    public void setTargetName(String targetName) { this.targetName = targetName; }

    public String getRelationshipType() { return relationshipType; }
    public void setRelationshipType(String relationshipType) { this.relationshipType = relationshipType; }
}
