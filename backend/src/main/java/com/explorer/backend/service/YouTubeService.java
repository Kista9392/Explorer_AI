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
            } else {
                System.err.println("YouTube API Key is not set! Skipping video search.");
                return Collections.emptyList();
            }
        }

        try {
            // Search query targeted at high quality educational content
            String query = conceptName + " educational lecture documentary";
            String url = UriComponentsBuilder.fromHttpUrl("https://www.googleapis.com/youtube/v3/search")
                    .queryParam("part", "snippet")
                    .queryParam("maxResults", 3)
                    .queryParam("q", query)
                    .queryParam("type", "video")
                    .queryParam("key", apiKey)
                    .toUriString();

            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                List<Map<String, String>> results = new ArrayList<>();
                List items = (List) response.getBody().get("items");
                if (items != null) {
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
                }
                return results;
            }
        } catch (Exception e) {
            System.err.println("Failed to fetch educational videos from YouTube API: " + e.getMessage());
        }
        return Collections.emptyList();
    }
}
