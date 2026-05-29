---
title: Explorer AI
emoji: 🧭
colorFrom: teal
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# 🧭 Explorer AI — Visual Socratic Knowledge Graph

Explorer AI is an AI-powered visual exploration platform where users discover how ideas, concepts, events, people, technologies, philosophies, and theories connect together. The app transforms learning and curiosity into an interactive journey instead of a traditional search experience.

## 🛠️ Main Features
- **Dynamic Visual Graph Canvas**: Drag, pan, zoom, and expand branches endlessly powered by React Flow 12 and Framer Motion animations.
- **Socratic Conversational AI Assistant**: Rich, deep, and highly accurate tutoring discussions with Gemini 1.5 Flash contextually synchronized with whichever node you select on the graph.
- **Dynamic YouTube 'Watch & Learn' Attachment**: Interactive horizontal carousels displaying 3 relevant educational YouTube videos directly underneath the assistant's message responses.
- **Enterprise Regulatory Safety Guardrails**: Backend keyword/regex pre-screening for Self-Harm, Weapons, Cyberattacks, and Controlled Substances. It blocks dangerous queries instantly (protecting Gemini API quotas) and triggers supportive glassmorphic Warning block screens.

## 🚀 Technical Architecture
- **Frontend**: Next.js 15+ (App Router), Tailwind CSS, TypeScript, `@xyflow/react`, Framer Motion, Axios.
- **Backend**: Spring Boot 3.4.1 (Java 17, Maven, JPA, PostgreSQL, Gemini REST API).
- **Deployment**: Multi-stage JRE Jars containerized Dockerfile optimized for Hugging Face Spaces.
