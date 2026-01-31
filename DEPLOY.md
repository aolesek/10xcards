# Deployment Guide

## Prerequisites

### GitHub Secrets
Configure the following secrets in your GitHub repository (Settings → Secrets and variables → Actions):

- `VPS_HOST` - IP address or hostname of your VPS
- `VPS_USERNAME` - SSH username for VPS access
- `VPS_SSH_KEY` - Private SSH key for authentication
- `VPS_DEPLOY_PATH` - Path on VPS where docker-compose.prod.yml is located (e.g., `/opt/10xcards`)

### VPS Setup

1. Install Docker and Docker Compose on your VPS:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

2. Create deployment directory:
```bash
mkdir -p /opt/10xcards
cd /opt/10xcards
```

3. Copy `docker-compose.prod.yml` to VPS deployment directory

4. Create `.env` file based on `.env.example`:
```bash
cp .env.example .env
# Edit .env with production values
nano .env
```

5. Log in to GitHub Container Registry:
```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

## Deployment Process

### Automatic Deployment
Push a tag to trigger deployment:
```bash
git tag v1.0.0
git push origin v1.0.0
```

The GitHub Action will:
1. Build multi-stage Docker image (frontend + backend)
2. Push image to GHCR
3. SSH to VPS
4. Pull new image
5. Restart containers

### Manual Deployment
On VPS:
```bash
cd /opt/10xcards
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## Health Checks
- Application: http://your-domain:8080/actuator/health
- Database: Check container status with `docker ps`

## Logs
```bash
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f postgres
```

## Rollback
```bash
# Use specific version tag
docker compose -f docker-compose.prod.yml down
IMAGE_TAG=v1.0.0 docker compose -f docker-compose.prod.yml up -d
```
