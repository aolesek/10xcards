#!/bin/bash

# Test script for building and running Docker image locally

# Configuration - Fill in your values
IMAGE_NAME="10xcards-java"
IMAGE_TAG="test"
CONTAINER_NAME="10xcards-test"

# Environment variables - Update these values
DB_HOST="host.docker.internal"  # Use this for localhost DB from Docker
DB_PORT="5432"
POSTGRES_DB="10xcards"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="postgres"

JWT_SECRET="test-jwt-secret-key-at-least-256-bits-long-for-testing-purposes"

# Optional: Email configuration
MAIL_HOST="smtp.gmail.com"
MAIL_PORT="587"
MAIL_USERNAME=""
MAIL_PASSWORD=""

# Optional: AI configuration
OPENROUTER_API_KEY=""

# Frontend URL
FRONTEND_URL="http://localhost:8080"

echo "=== Building Docker image ==="
docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .

if [ $? -ne 0 ]; then
    echo "Build failed!"
    exit 1
fi

echo ""
echo "=== Build successful ==="
echo ""
echo "=== Running container ==="

docker run -d \
  --name ${CONTAINER_NAME} \
  -p 8080:8080 \
  -e SPRING_DATASOURCE_URL="jdbc:postgresql://${DB_HOST}:${DB_PORT}/${POSTGRES_DB}" \
  -e DB_USERNAME="${POSTGRES_USER}" \
  -e DB_PASSWORD="${POSTGRES_PASSWORD}" \
  -e JWT_SECRET="${JWT_SECRET}" \
  -e MAIL_HOST="${MAIL_HOST}" \
  -e MAIL_PORT="${MAIL_PORT}" \
  -e MAIL_USERNAME="${MAIL_USERNAME}" \
  -e MAIL_PASSWORD="${MAIL_PASSWORD}" \
  -e OPENROUTER_API_KEY="${OPENROUTER_API_KEY}" \
  -e FRONTEND_URL="${FRONTEND_URL}" \
  ${IMAGE_NAME}:${IMAGE_TAG}

if [ $? -ne 0 ]; then
    echo "Failed to start container!"
    exit 1
fi

echo ""
echo "=== Container started ==="
echo "Container name: ${CONTAINER_NAME}"
echo "Application URL: http://localhost:8080"
echo "Health check: http://localhost:8080/actuator/health"
echo ""
echo "Useful commands:"
echo "  View logs:    docker logs -f ${CONTAINER_NAME}"
echo "  Stop:         docker stop ${CONTAINER_NAME}"
echo "  Remove:       docker rm ${CONTAINER_NAME}"
echo "  Shell access: docker exec -it ${CONTAINER_NAME} sh"
echo ""
echo "Tailing logs (Ctrl+C to exit)..."
docker logs -f ${CONTAINER_NAME}
