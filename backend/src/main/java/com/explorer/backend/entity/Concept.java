package com.explorer.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "concepts")
public class Concept {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String name;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String summary;

    @Column(name = "historical_context", columnDefinition = "TEXT")
    private String historicalContext;

    @Column(name = "real_world_impact", columnDefinition = "TEXT")
    private String realWorldImpact;

    @Column(name = "academic_significance", columnDefinition = "TEXT")
    private String academicSignificance;

    @Column(name = "fun_fact", columnDefinition = "TEXT")
    private String funFact;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public Concept() {}

    public Concept(String name, String summary) {
        this.name = name;
        this.summary = summary;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public String getHistoricalContext() { return historicalContext; }
    public void setHistoricalContext(String historicalContext) { this.historicalContext = historicalContext; }

    public String getRealWorldImpact() { return realWorldImpact; }
    public void setRealWorldImpact(String realWorldImpact) { this.realWorldImpact = realWorldImpact; }

    public String getAcademicSignificance() { return academicSignificance; }
    public void setAcademicSignificance(String academicSignificance) { this.academicSignificance = academicSignificance; }

    public String getFunFact() { return funFact; }
    public void setFunFact(String funFact) { this.funFact = funFact; }

    public LocalDateTime getCreatedAt() { return createdAt; }
}
