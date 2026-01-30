#!/bin/bash

# Script to run E2E tests with both backend and frontend

set -e

echo "🚀 Starting E2E Test Environment..."

# Check if backend is already running
if curl -s http://localhost:8080/actuator/health > /dev/null 2>&1; then
    echo "✓ Backend is already running on port 8080"
    BACKEND_RUNNING=true
else
    echo "⚠ Backend is not running. Starting backend..."
    BACKEND_RUNNING=false
    
    # Start backend in background
    cd ..
    mvn spring-boot:run > /tmp/backend.log 2>&1 &
    BACKEND_PID=$!
    cd frontend
    
    echo "Waiting for backend to be ready..."
    timeout=120
    elapsed=0
    while ! curl -s http://localhost:8080/actuator/health > /dev/null 2>&1; do
        if [ $elapsed -ge $timeout ]; then
            echo "❌ Backend failed to start within ${timeout}s"
            kill $BACKEND_PID 2>/dev/null || true
            exit 1
        fi
        sleep 2
        elapsed=$((elapsed + 2))
        echo "  Waiting... ${elapsed}s"
    done
    
    echo "✓ Backend is ready!"
fi

# Run E2E tests (Playwright will start frontend automatically)
echo "🧪 Running E2E tests..."
npm run test:e2e

# Cleanup if we started the backend
if [ "$BACKEND_RUNNING" = false ]; then
    echo "🧹 Stopping backend..."
    kill $BACKEND_PID 2>/dev/null || true
fi

echo "✅ E2E tests completed!"
