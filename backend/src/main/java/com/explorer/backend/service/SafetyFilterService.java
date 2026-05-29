package com.explorer.backend.service;

import org.springframework.stereotype.Service;
import java.util.regex.Pattern;

@Service
public class SafetyFilterService {

    // Pre-compiled regex patterns for maximum efficiency and security
    private final Pattern selfHarmPattern = Pattern.compile(
        "\\b(suicide|suicidal|kill myself|end my life|self[ -]harm|cut myself|hang myself|slit wrist|overdose on)\\b",
        Pattern.CASE_INSENSITIVE
    );

    private final Pattern weaponsPattern = Pattern.compile(
        "\\b(build a bomb|make a bomb|craft a bomb|how to hack a bomb|build an explosive|make explosives|make gunpowder|craft firearm|homemade gun|synthesize chemical weapon|synthesize sarin|dirty bomb)\\b",
        Pattern.CASE_INSENSITIVE
    );

    private final Pattern drugsPattern = Pattern.compile(
        "\\b(synthesize meth|make meth|synthesize fentanyl|make fentanyl|make heroin|synthesize cocaine|buy illegal drugs|buy narcotics|drug smuggling|manufacturing speed|cook meth)\\b",
        Pattern.CASE_INSENSITIVE
    );

    private final Pattern cyberPattern = Pattern.compile(
        "\\b(how to hack|exploit vulnerability|ransomware builder|sql injection cheat|make malware|create Trojan|distributed denial of service|ddos tool|phishing script|brute force tool)\\b",
        Pattern.CASE_INSENSITIVE
    );

    public static class SafetyResult {
        private final boolean blocked;
        private final String category;
        private final String explanation;

        public SafetyResult(boolean blocked, String category, String explanation) {
            this.blocked = blocked;
            this.category = category;
            this.explanation = explanation;
        }

        public boolean isBlocked() { return blocked; }
        public String getCategory() { return category; }
        public String getExplanation() { return explanation; }
    }

    public SafetyResult checkSafety(String query) {
        if (query == null || query.trim().isEmpty()) {
            return new SafetyResult(false, null, null);
        }

        String cleanQuery = query.toLowerCase().trim();

        // 1. Self-Harm & Suicide Prevention Check
        if (selfHarmPattern.matcher(cleanQuery).find()) {
            return new SafetyResult(true, "Self-Harm & Suicide", 
                "Your request contains terms related to self-harm or suicide. If you are experiencing emotional distress, please know that support is available immediately. Call or text 988 to connect with the Suicide & Crisis Lifeline. Compassionate professionals are ready to help you 24/7.");
        }

        // 2. Weapons & Explosives Check
        if (weaponsPattern.matcher(cleanQuery).find()) {
            return new SafetyResult(true, "Weapons & Explosives", 
                "This concept is restricted under safety and weapons non-proliferation standards. Detailed educational exploration of weapon blueprints, explosive crafting, or ammunition assembly is restricted.");
        }

        // 3. Narcotics & Banned Substances Check
        if (drugsPattern.matcher(cleanQuery).find()) {
            return new SafetyResult(true, "Illegal Substances", 
                "This concept is restricted under chemical control and narcotics enforcement regulations. Explanations regarding the active chemical synthesis or trafficking pipelines of controlled narcotics are blocked.");
        }

        // 4. Cyber Attacks & System Exploits Check
        if (cyberPattern.matcher(cleanQuery).find()) {
            return new SafetyResult(true, "Cyber Exploits", 
                "This concept is restricted under cybersecurity and digital exploit safety guidelines. Requesting executable scripts, exploit payloads, or malicious targeting coordinates is restricted.");
        }

        return new SafetyResult(false, null, null);
    }
}
