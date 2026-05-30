package com.explorer.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class GeminiService {

    @Value("${app.gemini-api-key:not-set}")
    private String geminiApiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    public String generateConceptConnections(String conceptName) {
        if ("not-set".equals(geminiApiKey) || geminiApiKey.isEmpty()) {
            // Check fallback environment variable directly
            String envKey = System.getenv("GEMINI_API_KEY");
            if (envKey != null && !envKey.isEmpty()) {
                geminiApiKey = envKey;
            } else {
                throw new RuntimeException("Google Gemini API Key is not set! Please configure GEMINI_API_KEY environment variable.");
            }
        }

        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + geminiApiKey;

        // Structured prompt mapping the desired visual JSON schema
        String prompt = "You are the Explorer AI, a visual knowledge graph generator. When a user requests a concept, you return a concise visual summary and exactly 5 to 7 logical, interdisciplinary related concepts that naturally branch out.\n" +
                "Generate related concepts for: \"" + conceptName + "\".\n" +
                "You MUST return a valid JSON object matching the following structure:\n" +
                "{\n" +
                "  \"name\": \"Concept Name\",\n" +
                "  \"summary\": \"A highly intelligent, 3-sentence summary of the concept covering its core meaning, historical/philosophical context, and real-world impact.\",\n" +
                "  \"connections\": [\n" +
                "    {\n" +
                "      \"name\": \"Related Concept 1\",\n" +
                "      \"relationship\": \"A brief 1-sentence description of how this concept connects to the main topic.\"\n" +
                "    }\n" +
                "  ]\n" +
                "}\n" +
                "Do NOT include any markdown code blocks, backticks, or text outside the JSON. Return only the raw JSON string.";

        // Prepare request body
        Map<String, Object> textPart = Map.of("text", prompt);
        Map<String, Object> parts = Map.of("parts", List.of(textPart));
        Map<String, Object> contents = Map.of("contents", List.of(parts));
        
        // Force JSON response MimeType
        Map<String, Object> generationConfig = Map.of("responseMimeType", "application/json");
        
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("contents", List.of(parts));
        requestBody.put("generationConfig", generationConfig);

        // Prepare headers
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                // Parse the Gemini nested response structure
                List candidates = (List) response.getBody().get("candidates");
                if (candidates != null && !candidates.isEmpty()) {
                    Map candidate = (Map) candidates.get(0);
                    Map content = (Map) candidate.get("content");
                    if (content != null) {
                        List partsList = (List) content.get("parts");
                        if (partsList != null && !partsList.isEmpty()) {
                            Map part = (Map) partsList.get(0);
                            return (String) part.get("text");
                        }
                    }
                }
            }
            throw new RuntimeException("Invalid response format received from Google Gemini API");
        } catch (Exception e) {
            throw new RuntimeException("Failed to call Google Gemini API: " + e.getMessage(), e);
        }
    }

    public String chatWithConcept(String message, String conceptContext) {
        if ("not-set".equals(geminiApiKey) || geminiApiKey.isEmpty()) {
            String envKey = System.getenv("GEMINI_API_KEY");
            if (envKey != null && !envKey.isEmpty()) {
                geminiApiKey = envKey;
            } else {
                throw new RuntimeException("Google Gemini API Key is not set! Please configure GEMINI_API_KEY environment variable.");
            }
        }

        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + geminiApiKey;

        String systemInstruction = "You are the Explorer AI Chat Assistant, a highly intelligent, visual knowledge explorer and friendly learning tutor. "
                + "You help curiosity-driven users explore connections, theories, sciences, and ideas.\n";
        
        if (conceptContext != null && !conceptContext.trim().isEmpty()) {
            systemInstruction += "The user is currently focused on the concept: \"" + conceptContext + "\" on their interactive knowledge graph. "
                    + "Tailor your explanations, answers, and examples directly to this concept when answering their queries.\n";
        } else {
            systemInstruction += "No specific concept is selected right now. Guide the user broadly, suggest interesting topics to search, or answer general conceptual questions.\n";
        }

        systemInstruction += "Rules for your response:\n"
                + "1. Adapt your explanation length dynamically based on the complexity of the user's message. For simple queries, greetings, or short requests, keep it highly concise and direct (1-2 brief paragraphs). For deep conceptual questions, theoretical topics, or complex academic concepts, deliver a medium-length structured answer (3-4 concise paragraphs with clean bullet highlights). Never output massive walls of text—be engaging, crisp, and conversational.\n"
                + "2. Keep the formatting clean and engaging. Feel free to use markdown bullets or bold words to highlight key terms.\n"
                + "3. At the very end of your response, you MUST always pose a deeply engaging, thought-provoking Socratic question relevant to the chat topic that encourages the user to dive deeper, followed by an invitation to watch top educational YouTube videos or documentaries to explore this question in action.\n"
                + "4. Do NOT output raw HTML or JSON. Return only the formatted markdown conversational response.";

        String fullPrompt = systemInstruction + "\n\nUser Message: \"" + message + "\"\nAssistant:";

        // Prepare request body
        Map<String, Object> textPart = Map.of("text", fullPrompt);
        Map<String, Object> parts = Map.of("parts", List.of(textPart));
        Map<String, Object> contents = Map.of("contents", List.of(parts));
        
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("contents", List.of(parts));

        // Prepare headers
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                List candidates = (List) response.getBody().get("candidates");
                if (candidates != null && !candidates.isEmpty()) {
                    Map candidate = (Map) candidates.get(0);
                    Map content = (Map) candidate.get("content");
                    if (content != null) {
                        List partsList = (List) content.get("parts");
                        if (partsList != null && !partsList.isEmpty()) {
                            Map part = (Map) partsList.get(0);
                            return (String) part.get("text");
                        }
                    }
                }
            }
            throw new RuntimeException("Invalid response format from Gemini Chat API");
        } catch (Exception e) {
            throw new RuntimeException("Failed to chat with Gemini: " + e.getMessage(), e);
        }
    }

    public String generateConceptProfile(String conceptName) {
        if ("not-set".equals(geminiApiKey) || geminiApiKey.isEmpty()) {
            String envKey = System.getenv("GEMINI_API_KEY");
            if (envKey != null && !envKey.isEmpty()) {
                geminiApiKey = envKey;
            } else {
                throw new RuntimeException("Google Gemini API Key is not set! Please configure GEMINI_API_KEY environment variable.");
            }
        }

        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + geminiApiKey;

        String prompt = "You are the Explorer AI detailed analyst. Generate a highly detailed, node-specific academic context profile for the concept: \"" + conceptName + "\".\n" +
                "You MUST return a valid JSON object matching the following structure:\n" +
                "{\n" +
                "  \"summary\": \"A highly intelligent, complete 3-sentence summary of the concept covering its core meaning, context, and impact without truncation.\",\n" +
                "  \"historicalContext\": \"A rich 1-paragraph summary (3-4 sentences) outlining the historical origin, initial discovery, key pioneers, or intellectual birth of this concept.\",\n" +
                "  \"realWorldImpact\": \"A rich 1-paragraph summary (3-4 sentences) outlining how this concept is used in real-world technology, industries, modern architectures, or daily life.\",\n" +
                "  \"academicSignificance\": \"A rich 1-paragraph summary (3-4 sentences) explaining its core theoretical or educational significance in human knowledge, science, or philosophy.\",\n" +
                "  \"funFact\": \"An amazing, surprising, and mind-expanding fact or thought-experiment about this concept that sparks curiosity.\"\n" +
                "}\n" +
                "Do NOT include any markdown code blocks, backticks, or text outside the JSON. Return only the raw JSON string.";

        // Prepare request body
        Map<String, Object> textPart = Map.of("text", prompt);
        Map<String, Object> parts = Map.of("parts", List.of(textPart));
        
        // Force JSON response MimeType
        Map<String, Object> generationConfig = Map.of("responseMimeType", "application/json");
        
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("contents", List.of(parts));
        requestBody.put("generationConfig", generationConfig);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                List candidates = (List) response.getBody().get("candidates");
                if (candidates != null && !candidates.isEmpty()) {
                    Map candidate = (Map) candidates.get(0);
                    Map content = (Map) candidate.get("content");
                    if (content != null) {
                        List partsList = (List) content.get("parts");
                        if (partsList != null && !partsList.isEmpty()) {
                            Map part = (Map) partsList.get(0);
                            return (String) part.get("text");
                        }
                    }
                }
            }
            throw new RuntimeException("Invalid response format received from Google Gemini API");
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate concept profile: " + e.getMessage(), e);
        }
    }
}

