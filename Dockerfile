# ==========================================
# Stage 1: Build the backend using Maven
# ==========================================
FROM maven:3.8.8-eclipse-temurin-17 AS builder
WORKDIR /app

# Copy Maven descriptor and source code for the backend
COPY backend/pom.xml ./backend/
COPY backend/src ./backend/src/
COPY backend/mvnw ./backend/
COPY backend/.mvn ./backend/.mvn/

# Build and package the Spring Boot application jar
WORKDIR /app/backend
RUN mvn clean package -DskipTests

# ==========================================
# Stage 2: Create a secure, lightweight runtime image
# ==========================================
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

# Create a non-root user (essential for Hugging Face Spaces and security best practices)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# Copy the built jar from the builder stage
COPY --from=builder /app/backend/target/backend-0.0.1-SNAPSHOT.jar app.jar

# Expose port 7860 (Hugging Face Space and backend default)
EXPOSE 7860

# Run the Spring Boot application
ENTRYPOINT ["java", "-jar", "app.jar"]
