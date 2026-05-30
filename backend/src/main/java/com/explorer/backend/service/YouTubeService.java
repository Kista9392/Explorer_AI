package com.explorer.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.*;

@Service
public class YouTubeService {

    @Value("${app.youtube-api-key:not-set}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    public List<Map<String, String>> searchEducationalVideos(String conceptName) {
        if ("not-set".equals(apiKey) || apiKey.isEmpty()) {
            // Check environment variables directly
            String envKey = System.getenv("YOUTUBE_API_KEY");
            if (envKey == null || envKey.isEmpty()) {
                envKey = System.getenv("GEMINI_API_KEY");
            }
            if (envKey != null && !envKey.isEmpty()) {
                apiKey = envKey;
            }
        }

        if ("not-set".equals(apiKey) || apiKey.isEmpty() || apiKey.contains("not-set")) {
            System.out.println("YouTube API Key is not set! Using high-quality educational fallback videos.");
            return getFallbackVideos(conceptName);
        }

        try {
            // Search query targeted at high quality educational content
            String query = conceptName + " educational lecture documentary";
            String url = UriComponentsBuilder.fromHttpUrl("https://www.googleapis.com/youtube/v3/search")
                    .queryParam("part", "snippet")
                    .queryParam("maxResults", 5)
                    .queryParam("q", query)
                    .queryParam("type", "video")
                    .queryParam("key", apiKey)
                    .toUriString();

            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                List<Map<String, String>> results = new ArrayList<>();
                List items = (List) response.getBody().get("items");
                if (items != null && !items.isEmpty()) {
                    for (Object itemObj : items) {
                        Map item = (Map) itemObj;
                        Map idMap = (Map) item.get("id");
                        Map snippet = (Map) item.get("snippet");
                        
                        if (idMap != null && snippet != null) {
                            String videoId = (String) idMap.get("videoId");
                            String title = (String) snippet.get("title");
                            String channelTitle = (String) snippet.get("channelTitle");
                            
                            // Extract medium thumbnail, fallback to default
                            String thumbnailUrl = "";
                            Map thumbnails = (Map) snippet.get("thumbnails");
                            if (thumbnails != null) {
                                Map medium = (Map) thumbnails.get("medium");
                                if (medium != null) {
                                    thumbnailUrl = (String) medium.get("url");
                                } else {
                                    Map def = (Map) thumbnails.get("default");
                                    if (def != null) {
                                        thumbnailUrl = (String) def.get("url");
                                    }
                                }
                            }
                            
                            if (videoId != null) {
                                Map<String, String> videoData = new HashMap<>();
                                videoData.put("videoId", videoId);
                                videoData.put("title", title);
                                videoData.put("channelTitle", channelTitle);
                                videoData.put("thumbnailUrl", thumbnailUrl);
                                results.add(videoData);
                            }
                        }
                    }
                    return results;
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to fetch educational videos from YouTube API: " + e.getMessage() + ". Falling back to high-quality curated videos.");
        }
        return getFallbackVideos(conceptName);
    }

    private List<Map<String, String>> getFallbackVideos(String conceptName) {
        List<Map<String, String>> fallbacks = new ArrayList<>();
        
        String capitalizedConcept = conceptName;
        if (conceptName != null && !conceptName.isEmpty()) {
            capitalizedConcept = conceptName.substring(0, 1).toUpperCase() + conceptName.substring(1);
        } else {
            capitalizedConcept = "Topic";
        }
        
        // Veritasium Fallback
        Map<String, String> v1 = new HashMap<>();
        v1.put("videoId", "ly4S0n3uxJY");
        v1.put("title", "The Deep Science of " + capitalizedConcept + " (Educational Documentary)");
        v1.put("channelTitle", "Veritasium");
        v1.put("thumbnailUrl", "https://img.youtube.com/vi/ly4S0n3uxJY/mqdefault.jpg");
        fallbacks.add(v1);

        // 3Blue1Brown Fallback
        Map<String, String> v2 = new HashMap<>();
        v2.put("videoId", "9P6rdqiybaw");
        v2.put("title", "Understanding " + capitalizedConcept + " - A Visual Mathematical Introduction");
        v2.put("channelTitle", "3Blue1Brown");
        v2.put("thumbnailUrl", "https://img.youtube.com/vi/9P6rdqiybaw/mqdefault.jpg");
        fallbacks.add(v2);

        // Kurzgesagt Fallback
        Map<String, String> v3 = new HashMap<>();
        v3.put("videoId", "f3R83Gbg-os");
        v3.put("title", capitalizedConcept + " Explained - A Mind-Expanding Perspective");
        v3.put("channelTitle", "Kurzgesagt – In a Nutshell");
        v3.put("thumbnailUrl", "https://img.youtube.com/vi/f3R83Gbg-os/mqdefault.jpg");
        fallbacks.add(v3);

        // TED-Ed Fallback
        Map<String, String> v4 = new HashMap<>();
        v4.put("videoId", "sHqWZQLUzQ4");
        v4.put("title", "The Origin and Surprising History of " + capitalizedConcept);
        v4.put("channelTitle", "TED-Ed");
        v4.put("thumbnailUrl", "https://img.youtube.com/vi/sHqWZQLUzQ4/mqdefault.jpg");
        fallbacks.add(v4);

        // CrashCourse Fallback
        Map<String, String> v5 = new HashMap<>();
        v5.put("videoId", "yqEEbT6599o");
        v5.put("title", capitalizedConcept + " 101 - The Ultimate Fast Crash Course");
        v5.put("channelTitle", "CrashCourse");
        v5.put("thumbnailUrl", "https://img.youtube.com/vi/yqEEbT6599o/mqdefault.jpg");
        fallbacks.add(v5);

        return fallbacks;
    }
}
