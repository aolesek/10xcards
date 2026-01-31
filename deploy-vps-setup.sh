#!/bin/bash
set -e

# VPS Initial Setup Script for 10xCards Deployment

echo "=== 10xCards VPS Setup ==="

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root or with sudo"
    exit 1
fi

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo "Docker installed successfully"
else
    echo "Docker already installed"
fi

# Install Docker Compose if not present
if ! command -v docker compose &> /dev/null; then
    echo "Docker Compose plugin should be installed with Docker"
fi

# Create deployment directory
DEPLOY_PATH="/opt/10xcards"
echo "Creating deployment directory: $DEPLOY_PATH"
mkdir -p $DEPLOY_PATH

# Set proper permissions
echo "Setting permissions..."
chown -R $SUDO_USER:$SUDO_USER $DEPLOY_PATH

echo ""
echo "=== Setup Complete ==="
echo "Next steps:"
echo "1. Copy docker-compose.prod.yml to $DEPLOY_PATH"
echo "2. Create .env file in $DEPLOY_PATH (use .env.example as template)"
echo "3. Configure GitHub secrets for CI/CD:"
echo "   - VPS_HOST"
echo "   - VPS_USERNAME"
echo "   - VPS_SSH_KEY"
echo "   - VPS_DEPLOY_PATH=$DEPLOY_PATH"
echo "4. Push a tag to trigger deployment: git tag v1.0.0 && git push origin v1.0.0"
