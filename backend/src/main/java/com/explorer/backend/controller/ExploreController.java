package com.explorer.backend.controller;

import com.explorer.backend.dto.ExploreResponse;
import com.explorer.backend.entity.ExplorationPath;
import com.explorer.backend.entity.User;
import com.explorer.backend.entity.ChatSession;
import com.explorer.backend.service.AuthService;
import com.explorer.backend.service.ExploreService;
import com.explorer.backend.service.YouTubeService;
import com.explorer.backend.service.SafetyFilterService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/explore")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class ExploreController {

    private final ExploreService exploreService;
    private final YouTubeService youtubeService;
    private final SafetyFilterService safetyFilterService;
    private final AuthService authService;

    public ExploreController(ExploreService exploreService, 
                             YouTubeService youtubeService, 
                             SafetyFilterService safetyFilterService,
                             AuthService authService) {
        this.exploreService = exploreService;
        this.youtubeService = youtubeService;
        this.safetyFilterService = safetyFilterService;
        this.authService = authService;
    }

    /**
     * Resolves the authenticated user from the Authorization Bearer token header.
     * Returns null if no token is provided or the token is invalid.
     */
    private User resolveUser(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return null;
        }
        String token = authHeader.substring(7);
        Optional<User> userOpt = authService.verifyGoogleToken(token);
        return userOpt.orElse(null);
    }

    @PostMapping("/search")
    public ResponseEntity<?> searchTopic(@RequestBody Map<String, String> request) {
        String query = request.get("query");
        if (query == null || query.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        SafetyFilterService.SafetyResult safety = safetyFilterService.checkSafety(query);
        if (safety.isBlocked()) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "SafetyViolation",
                "category", safety.getCategory(),
                "message", safety.getExplanation()
            ));
        }

        return ResponseEntity.ok(exploreService.searchConcept(query));
    }

    @PostMapping("/expand")
    public ResponseEntity<?> expandTopic(@RequestBody Map<String, Object> request) {
        String concept = (String) request.get("concept");
        Number x = (Number) request.getOrDefault("x", 0);
        Number y = (Number) request.getOrDefault("y", 0);

        if (concept == null || concept.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        SafetyFilterService.SafetyResult safety = safetyFilterService.checkSafety(concept);
        if (safety.isBlocked()) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "SafetyViolation",
                "category", safety.getCategory(),
                "message", safety.getExplanation()
            ));
        }

        return ResponseEntity.ok(exploreService.expandConcept(concept, x.doubleValue(), y.doubleValue()));
    }

    @GetMapping("/paths")
    public ResponseEntity<List<ExplorationPath>> getSavedPaths(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = resolveUser(authHeader);
        return ResponseEntity.ok(exploreService.getAllPaths(user));
    }

    @PostMapping("/paths")
    public ResponseEntity<ExplorationPath> savePath(
            @RequestBody Map<String, String> request,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String title = request.get("title");
        String pathData = request.get("pathData");

        if (title == null || title.trim().isEmpty() || pathData == null || pathData.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        User user = resolveUser(authHeader);
        return ResponseEntity.ok(exploreService.savePath(title, pathData, user));
    }

    @PostMapping("/chat")
    public ResponseEntity<?> chatWithAssistant(@RequestBody Map<String, String> request) {
        String message = request.get("message");
        String conceptContext = request.get("conceptContext");

        if (message == null || message.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        // Pre-screen the chat message for safety
        SafetyFilterService.SafetyResult messageSafety = safetyFilterService.checkSafety(message);
        if (messageSafety.isBlocked()) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "SafetyViolation",
                "category", messageSafety.getCategory(),
                "message", messageSafety.getExplanation()
            ));
        }

        // If context is present, also screen the context
        if (conceptContext != null && !conceptContext.trim().isEmpty()) {
            SafetyFilterService.SafetyResult contextSafety = safetyFilterService.checkSafety(conceptContext);
            if (contextSafety.isBlocked()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "SafetyViolation",
                    "category", contextSafety.getCategory(),
                    "message", contextSafety.getExplanation()
                ));
            }
        }

        String responseText = exploreService.chatWithConcept(message, conceptContext);
        return ResponseEntity.ok(Map.of("response", responseText));
    }

    @GetMapping("/videos")
    public ResponseEntity<List<Map<String, String>>> getEducationalVideos(@RequestParam String query) {
        if (query == null || query.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(youtubeService.searchEducationalVideos(query));
    }

    @GetMapping("/concept")
    public ResponseEntity<?> getConceptProfile(@RequestParam String name) {
        if (name == null || name.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(exploreService.getOrCreateConceptProfile(name));
    }

    @GetMapping("/chats")
    public ResponseEntity<List<ChatSession>> getSavedChats(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = resolveUser(authHeader);
        return ResponseEntity.ok(exploreService.getAllChats(user));
    }

    @PostMapping("/chats")
    public ResponseEntity<ChatSession> saveChat(
            @RequestBody Map<String, String> request,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String id = request.get("id");
        String title = request.get("title");
        String chatData = request.get("chatData");

        if (title == null || title.trim().isEmpty() || chatData == null || chatData.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        User user = resolveUser(authHeader);
        return ResponseEntity.ok(exploreService.saveChat(id, title, chatData, user));
    }

    @GetMapping("/profile/stats")
    public ResponseEntity<Map<String, Long>> getProfileStats(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = resolveUser(authHeader);
        return ResponseEntity.ok(exploreService.getUserStats(user));
    }

    // --- Old Chat Management (Profile Section) ---
    @GetMapping("/profile/old-chats")
    public ResponseEntity<List<ChatSession>> getOldChats(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = resolveUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        // Record that we have shown the prompt now
        exploreService.recordPromptShown(user);
        List<ChatSession> old = exploreService.getUserOldChats(user);
        return ResponseEntity.ok(old);
    }

    @PostMapping("/profile/old-chats/dismiss")
    public ResponseEntity<Void> dismissOldChatPrompt(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = resolveUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        exploreService.dismissPrompt(user);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/profile/chats/{id}")
    public ResponseEntity<Void> deleteChatFromProfile(@PathVariable UUID id,
                                                       @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = resolveUser(authHeader);
        // Allow deletion of user's own chats or public chats
        exploreService.deleteChat(id.toString(), null, null, user);
        return ResponseEntity.noContent().build();
    }
}
