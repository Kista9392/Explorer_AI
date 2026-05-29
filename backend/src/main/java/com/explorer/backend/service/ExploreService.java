package com.explorer.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.explorer.backend.dto.*;
import com.explorer.backend.entity.*;
import com.explorer.backend.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class ExploreService {

    private final ConceptRepository conceptRepository;
    private final ConceptConnectionRepository connectionRepository;
    private final ExplorationPathRepository pathRepository;
    private final GeminiService geminiService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ExploreService(ConceptRepository conceptRepository,
                          ConceptConnectionRepository connectionRepository,
                          ExplorationPathRepository pathRepository,
                          GeminiService geminiService) {
        this.conceptRepository = conceptRepository;
        this.connectionRepository = connectionRepository;
        this.pathRepository = pathRepository;
        this.geminiService = geminiService;
    }

    @Transactional
    public ExploreResponse searchConcept(String conceptName) {
        String normalizedQuery = conceptName.trim();
        Optional<Concept> cachedConcept = conceptRepository.findByNameIgnoreCase(normalizedQuery);

        Concept mainConcept;
        List<ConceptConnection> connections = new ArrayList<>();

        if (cachedConcept.isEmpty()) {
            // Call Gemini to generate concept details and connections
            String rawJson = geminiService.generateConceptConnections(normalizedQuery);
            mainConcept = parseAndSaveConcept(rawJson, normalizedQuery);
            connections = connectionRepository.findBySourceNameIgnoreCase(mainConcept.getName());
        } else {
            mainConcept = cachedConcept.get();
            connections = connectionRepository.findBySourceNameIgnoreCase(mainConcept.getName());
            
            // If connection cache is empty, regenerate
            if (connections.isEmpty()) {
                String rawJson = geminiService.generateConceptConnections(mainConcept.getName());
                mainConcept = parseAndSaveConcept(rawJson, mainConcept.getName());
                connections = connectionRepository.findBySourceNameIgnoreCase(mainConcept.getName());
            }
        }

        // Build Graph representation DTOs
        List<NodeDTO> nodes = new ArrayList<>();
        List<EdgeDTO> edges = new ArrayList<>();

        // 1. Center node (source)
        String sourceId = mainConcept.getName().toLowerCase().replace(" ", "-");
        nodes.add(new NodeDTO(sourceId, mainConcept.getName(), mainConcept.getSummary(), 0, 0));

        // 2. Circular layout for connections
        double radius = 280;
        int numNodes = connections.size();
        for (int i = 0; i < numNodes; i++) {
            ConceptConnection conn = connections.get(i);
            String targetId = conn.getTargetName().toLowerCase().replace(" ", "-");
            
            // Fetch target summary if exists, else provide premium placeholder
            String targetSummary = conceptRepository.findByNameIgnoreCase(conn.getTargetName())
                    .map(Concept::getSummary)
                    .orElse("Click to expand and travel deeper down the rabbit hole to explore the interconnected path of " + conn.getTargetName() + ".");

            // Calculate circular coordinate position
            double angle = (2 * Math.PI * i) / numNodes;
            double x = radius * Math.cos(angle);
            double y = radius * Math.sin(angle);

            nodes.add(new NodeDTO(targetId, conn.getTargetName(), targetSummary, x, y));
            
            String edgeId = sourceId + "-to-" + targetId;
            edges.add(new EdgeDTO(edgeId, sourceId, targetId, conn.getRelationshipType()));
        }

        return new ExploreResponse(nodes, edges);
    }

    @Transactional
    public ExploreResponse expandConcept(String conceptName, double parentX, double parentY) {
        // Safe, clean expansion reusing searchConcept but offsetting positioning
        ExploreResponse baseResult = searchConcept(conceptName);
        
        // Offset expanded circular nodes centered around parent's current coordinate
        List<NodeDTO> nodes = baseResult.getNodes();
        for (NodeDTO node : nodes) {
            // Keep expanded center exactly on parent coordinates
            if (node.getId().equals(conceptName.toLowerCase().replace(" ", "-"))) {
                node.setX(parentX);
                node.setY(parentY);
            } else {
                node.setX(node.getX() + parentX);
                node.setY(node.getY() + parentY);
            }
        }
        
        return baseResult;
    }

    private Concept parseAndSaveConcept(String jsonString, String fallbackName) {
        try {
            JsonNode root = objectMapper.readTree(jsonString);
            
            String name = root.has("name") ? root.get("name").asText() : fallbackName;
            String summary = root.has("summary") ? root.get("summary").asText() : "No summary available.";

            // Save or update center concept node in cache
            Concept mainConcept = conceptRepository.findByNameIgnoreCase(name)
                    .orElse(new Concept(name, summary));
            mainConcept.setSummary(summary);
            mainConcept = conceptRepository.save(mainConcept);

            // Parse and save connection links
            if (root.has("connections") && root.get("connections").isArray()) {
                for (JsonNode connNode : root.get("connections")) {
                    String targetName = connNode.has("name") ? connNode.get("name").asText() : null;
                    String relation = connNode.has("relationship") ? connNode.get("relationship").asText() : "Related concept";

                    if (targetName != null && !targetName.isEmpty()) {
                        // Check if relationship already exists
                        String sourceName = mainConcept.getName();
                        List<ConceptConnection> existing = connectionRepository.findBySourceNameIgnoreCase(sourceName);
                        boolean exists = existing.stream().anyMatch(c -> c.getTargetName().equalsIgnoreCase(targetName));

                        if (!exists) {
                            ConceptConnection connection = new ConceptConnection(sourceName, targetName, relation);
                            connectionRepository.save(connection);
                        }
                    }
                }
            }

            return mainConcept;
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse or save AI Concept connections: " + e.getMessage(), e);
        }
    }

    // Path History Save / Load
    public List<ExplorationPath> getAllPaths() {
        return pathRepository.findAll();
    }

    public ExplorationPath savePath(String title, String pathData) {
        ExplorationPath path = new ExplorationPath(title.trim(), pathData.trim());
        return pathRepository.save(path);
    }

    public String chatWithConcept(String message, String conceptContext) {
        return geminiService.chatWithConcept(message, conceptContext);
    }
}

