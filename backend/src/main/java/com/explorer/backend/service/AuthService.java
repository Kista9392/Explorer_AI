package com.explorer.backend.service;

import com.explorer.backend.entity.User;
import com.explorer.backend.repository.UserRepository;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Optional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final GoogleIdTokenVerifier verifier;

    public AuthService(UserRepository userRepository,
                       @Value("${app.google-client-id}") String googleClientId) {
        this.userRepository = userRepository;
        this.verifier = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(Collections.singletonList(googleClientId))
                .build();
    }

    /**
     * Verifies the Google ID Token (JWT) and returns or creates a local User.
     * Returns empty if the token is invalid or expired.
     */
    public Optional<User> verifyGoogleToken(String idTokenString) {
        try {
            GoogleIdToken idToken = verifier.verify(idTokenString);
            if (idToken == null) {
                return Optional.empty();
            }

            GoogleIdToken.Payload payload = idToken.getPayload();
            String email = payload.getEmail();
            String name = (String) payload.get("name");
            String pictureUrl = (String) payload.get("picture");

            if (email == null || email.isBlank()) {
                return Optional.empty();
            }

            // Find existing user or create a new one
            User user = userRepository.findByEmailIgnoreCase(email)
                    .orElseGet(() -> {
                        User newUser = new User(email, 
                                name != null ? name : email.split("@")[0], 
                                pictureUrl);
                        return userRepository.save(newUser);
                    });

            // Update name and picture if changed on Google's side
            boolean updated = false;
            if (name != null && !name.equals(user.getName())) {
                user.setName(name);
                updated = true;
            }
            if (pictureUrl != null && !pictureUrl.equals(user.getPictureUrl())) {
                user.setPictureUrl(pictureUrl);
                updated = true;
            }
            if (updated) {
                user = userRepository.save(user);
            }

            return Optional.of(user);
        } catch (Exception e) {
            System.err.println("Google token verification failed: " + e.getMessage());
            return Optional.empty();
        }
    }
}
