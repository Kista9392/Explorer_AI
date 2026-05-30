package com.explorer.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.explorer.backend.dto.*;
import com.explorer.backend.repository.UserRepository;
import com.explorer.backend.entity.*;
import com.explorer.backend.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;
import java.time.LocalDateTime;

import java.util.*;

@Service
public class ExploreService {

    private final ConceptRepository conceptRepository;
    private final ConceptConnectionRepository connectionRepository;
    private final ExplorationPathRepository pathRepository;
    private final ChatSessionRepository chatRepository;
    private final UserRepository userRepository;
    @Value("${chat.retention.days:30}")
    private int chatRetentionDays;
    private final GeminiService geminiService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ExploreService(ConceptRepository conceptRepository,
                          ConceptConnectionRepository connectionRepository,
                          ExplorationPathRepository pathRepository,
                          ChatSessionRepository chatRepository,
                          GeminiService geminiService,
                          UserRepository userRepository) {
        this.conceptRepository = conceptRepository;
        this.connectionRepository = connectionRepository;
        this.pathRepository = pathRepository;
        this.chatRepository = chatRepository;
        this.geminiService = geminiService;
        this.userRepository = userRepository;
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
    public List<ExplorationPath> getAllPaths(User user) {
        if (user != null) {
            // Return the user's personal paths + all public/anonymous paths
            List<ExplorationPath> personalPaths = pathRepository.findByUserOrderByCreatedAtDesc(user);
            List<ExplorationPath> publicPaths = pathRepository.findByUserIsNullOrderByCreatedAtDesc();
            List<ExplorationPath> combined = new java.util.ArrayList<>(personalPaths);
            combined.addAll(publicPaths);
            return combined;
        }
        return pathRepository.findByUserIsNullOrderByCreatedAtDesc();
    }

    public ExplorationPath savePath(String title, String pathData, User user) {
        ExplorationPath path = new ExplorationPath(title.trim(), pathData.trim(), user);
        return pathRepository.save(path);
    }

    public String chatWithConcept(String message, String conceptContext) {
        return geminiService.chatWithConcept(message, conceptContext);
    }

    @Transactional
    public Concept getOrCreateConceptProfile(String conceptName) {
        String normalizedQuery = conceptName.trim();
        Concept concept = conceptRepository.findByNameIgnoreCase(normalizedQuery)
                .orElseGet(() -> conceptRepository.save(new Concept(normalizedQuery, "A fascinating concept within the visual knowledge map.")));

        boolean isPlaceholder = (concept.getHistoricalContext() != null && concept.getHistoricalContext().contains("Historically, this concept evolved")) ||
                                (concept.getRealWorldImpact() != null && concept.getRealWorldImpact().contains("In the real world, this concept")) ||
                                (concept.getAcademicSignificance() != null && concept.getAcademicSignificance().contains("Academically, this node")) ||
                                (concept.getFunFact() != null && concept.getFunFact().contains("fascinating milestone"));

        // If any of the rich detailed fields or fun fact are not set (or are a generic placeholder), fetch them dynamically using Gemini and save
        if (concept.getHistoricalContext() == null || concept.getHistoricalContext().isEmpty() ||
            concept.getFunFact() == null || concept.getFunFact().isEmpty() ||
            isPlaceholder) {
            try {
                String rawJson = geminiService.generateConceptProfile(normalizedQuery);
                JsonNode root = objectMapper.readTree(rawJson);
                
                if (root.has("historicalContext")) {
                    concept.setHistoricalContext(root.get("historicalContext").asText());
                }
                if (root.has("realWorldImpact")) {
                    concept.setRealWorldImpact(root.get("realWorldImpact").asText());
                }
                if (root.has("academicSignificance")) {
                    concept.setAcademicSignificance(root.get("academicSignificance").asText());
                }
                if (root.has("funFact")) {
                    concept.setFunFact(root.get("funFact").asText());
                }
                concept = conceptRepository.save(concept);
            } catch (Exception e) {
                // Graceful fallback values
                concept.setHistoricalContext("Historically, this concept evolved as a key pillar in its scientific field, driving major academic transitions.");
                concept.setRealWorldImpact("In the real world, this concept acts as a catalyst for advanced technological systems and research frameworks.");
                concept.setAcademicSignificance("Academically, this node holds major educational significance, clarifying critical interdisciplinary ideas.");
                concept.setFunFact("This node represents a fascinating milestone on your visual curiosity map!");
                concept = conceptRepository.save(concept);
            }
        }
        return concept;
    }

    // Chat Sessions Save / Load
    public List<ChatSession> getAllChats(User user) {
        if (user != null) {
            List<ChatSession> personalChats = chatRepository.findByUserOrderByCreatedAtDesc(user);
            List<ChatSession> publicChats = chatRepository.findByUserIsNullOrderByCreatedAtDesc();
            List<ChatSession> combined = new java.util.ArrayList<>(personalChats);
            combined.addAll(publicChats);
            return combined;
        }
        return chatRepository.findByUserIsNullOrderByCreatedAtDesc();
    }

    /** Retrieve chats older than retention period for a given user */
    public List<ChatSession> getUserOldChats(User user) {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(chatRetentionDays);
        return chatRepository.findByUserAndCreatedAtBefore(user, cutoff);
    }

    /** Record that the old‑chat prompt was shown (or dismissed) */
    public void recordPromptShown(User user) {
        user.setLastOldChatPromptAt(LocalDateTime.now());
        userRepository.save(user);
    }

    /** Dismiss the prompt without deleting */
    public void dismissPrompt(User user) {
        user.setLastOldChatPromptAt(LocalDateTime.now());
        userRepository.save(user);
    }

    @Transactional
    public ChatSession saveChat(String idStr, String title, String chatData, User user) {
        ChatSession session;
        if (idStr != null && !idStr.trim().isEmpty()) {
            try {
                UUID uuid = UUID.fromString(idStr.trim());
                Optional<ChatSession> existing = chatRepository.findById(uuid);
                if (existing.isPresent()) {
                    session = existing.get();
                    session.setTitle(title.trim());
                    session.setChatData(chatData.trim());
                    return chatRepository.save(session);
                }
            } catch (IllegalArgumentException e) {
                // Ignore invalid UUID and proceed to create new session
            }
        }
        session = new ChatSession(title.trim(), chatData.trim(), user);
        return chatRepository.save(session);
    }

    // Delete chat by ID (used for profile old chat deletion)
    @Transactional
    public void deleteChat(String idStr, String title, String chatData, User user) {
        if (idStr == null || idStr.trim().isEmpty()) {
            return; // nothing to delete
        }
        try {
            UUID uuid = UUID.fromString(idStr.trim());
            chatRepository.deleteById(uuid);
        } catch (IllegalArgumentException e) {
            // invalid UUID, ignore
        }
    }

    // User Profile Stats Card Helper
    public Map<String, Long> getUserStats(User user) {
        long pathCount = 0;
        long chatCount = 0;
        if (user != null) {
            pathCount = pathRepository.countByUser(user);
            chatCount = chatRepository.countByUser(user);
        } else {
            pathCount = pathRepository.countByUserIsNull();
            chatCount = chatRepository.countByUserIsNull();
        }
        long nodeCount = conceptRepository.count();

        return Map.of(
            "savedPaths", pathCount,
            "savedChats", chatCount,
            "discoveredNodes", nodeCount
        );
    }
}

