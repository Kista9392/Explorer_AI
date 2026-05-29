package com.explorer.backend.controller;

import com.explorer.backend.dto.ExploreResponse;
import com.explorer.backend.entity.ExplorationPath;
import com.explorer.backend.service.ExploreService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/explore")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class ExploreController {

    private final ExploreService exploreService;

    public ExploreController(ExploreService exploreService) {
        this.exploreService = exploreService;
    }

    @PostMapping("/search")
    public ResponseEntity<ExploreResponse> searchTopic(@RequestBody Map<String, String> request) {
        String query = request.get("query");
        if (query == null || query.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(exploreService.searchConcept(query));
    }

    @PostMapping("/expand")
    public ResponseEntity<ExploreResponse> expandTopic(@RequestBody Map<String, Object> request) {
        String concept = (String) request.get("concept");
        Number x = (Number) request.getOrDefault("x", 0);
        Number y = (Number) request.getOrDefault("y", 0);

        if (concept == null || concept.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(exploreService.expandConcept(concept, x.doubleValue(), y.doubleValue()));
    }

    @GetMapping("/paths")
    public ResponseEntity<List<ExplorationPath>> getSavedPaths() {
        return ResponseEntity.ok(exploreService.getAllPaths());
    }

    @PostMapping("/paths")
    public ResponseEntity<ExplorationPath> savePath(@RequestBody Map<String, String> request) {
        String title = request.get("title");
        String pathData = request.get("pathData");

        if (title == null || title.trim().isEmpty() || pathData == null || pathData.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(exploreService.savePath(title, pathData));
    }

    @PostMapping("/chat")
    public ResponseEntity<Map<String, String>> chatWithAssistant(@RequestBody Map<String, String> request) {
        String message = request.get("message");
        String conceptContext = request.get("conceptContext");

        if (message == null || message.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        String responseText = exploreService.chatWithConcept(message, conceptContext);
        return ResponseEntity.ok(Map.of("response", responseText));
    }
}

