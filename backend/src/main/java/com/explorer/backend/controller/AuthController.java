package com.explorer.backend.controller;

import com.explorer.backend.entity.User;
import com.explorer.backend.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/auth")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * POST /api/v1/auth/google
     * Accepts { "idToken": "..." } from the frontend after Google Sign-In,
     * verifies it, and returns the authenticated user profile.
     */
    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(@RequestBody Map<String, String> request) {
        String idToken = request.get("idToken");
        if (idToken == null || idToken.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "MissingToken",
                "message", "Google ID Token is required."
            ));
        }

        Optional<User> userOpt = authService.verifyGoogleToken(idToken);

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of(
                "error", "InvalidToken",
                "message", "Google authentication failed. The token may be expired or invalid."
            ));
        }

        User user = userOpt.get();
        return ResponseEntity.ok(Map.of(
            "id", user.getId().toString(),
            "email", user.getEmail(),
            "name", user.getName(),
            "pictureUrl", user.getPictureUrl() != null ? user.getPictureUrl() : "",
            "createdAt", user.getCreatedAt().toString()
        ));
    }
}
