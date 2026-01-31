# Multi-stage Dockerfile for 10xCards application
# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build frontend
RUN npm run build

# Stage 2: Build backend
FROM maven:3.9-eclipse-temurin-21-alpine AS backend-builder

WORKDIR /app

# Copy Maven configuration
COPY pom.xml ./
COPY mvnw ./
COPY .mvn .mvn
COPY spotless/ spotless/

# Download dependencies (cached layer)
RUN mvn dependency:go-offline -B

# Copy source code
COPY src/ src/

# Copy frontend build to Spring Boot static resources
COPY --from=frontend-builder /frontend/dist src/main/resources/static/

# Build application (skip tests for faster build)
RUN mvn clean package -DskipTests -B

# Stage 3: Runtime
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Copy built jar from backend-builder
COPY --from=backend-builder /app/target/*.jar app.jar

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

# Run application
ENTRYPOINT ["java", "-jar", "app.jar"]
