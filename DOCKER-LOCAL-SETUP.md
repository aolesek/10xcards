# Local Docker Setup

## Quick Start

```bash
# 1. Optional: Create .env file (if you need custom config)
cp .env.local.example .env
# Edit .env with your values if needed

# 2. Build and start all services (app + postgres)
docker compose up --build

# Or run in background
docker compose up -d --build
```

Application will be available at: **http://localhost:8080**

## Commands

### Start services
```bash
# Start with build
docker compose up --build

# Start in background
docker compose up -d

# Start only specific services
docker compose up postgres app
```

### View logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f app
docker compose logs -f postgres
```

### Stop services
```bash
# Stop all
docker compose down

# Stop and remove volumes (clean database)
docker compose down -v
```

### Rebuild
```bash
# Rebuild app image
docker compose build app

# Force rebuild (no cache)
docker compose build --no-cache app

# Rebuild and restart
docker compose up -d --build
```

### Database management
```bash
# Start pgAdmin (optional tool)
docker compose --profile tools up -d pgadmin

# Access pgAdmin at http://localhost:5050
# Email: admin@10xcards.local
# Password: admin
```

## Troubleshooting

### Port already in use
```bash
# Check what's using port 8080
lsof -i :8080

# Or change port in docker-compose.yml
# ports:
#   - "8081:8080"  # Use 8081 instead
```

### Database connection issues
```bash
# Check postgres is healthy
docker compose ps

# View postgres logs
docker compose logs postgres

# Reset database
docker compose down -v
docker compose up -d
```

### App won't start
```bash
# Check app logs
docker compose logs app

# Rebuild from scratch
docker compose down
docker compose build --no-cache app
docker compose up
```

### Clean everything
```bash
# Remove all containers, networks, volumes
docker compose down -v

# Remove images
docker rmi 10xcards-java-app

# Full cleanup
docker system prune -a
```

## Development Workflow

```bash
# 1. Make code changes

# 2. Rebuild and restart app
docker compose up -d --build app

# 3. View logs
docker compose logs -f app

# 4. Access running container
docker compose exec app sh
```

## Environment Variables

Default values work out of the box. To customize:

1. Create `.env` file from `.env.local.example`
2. Set your values
3. Restart: `docker compose up -d`

Required for full functionality:
- `OPENROUTER_API_KEY` - for AI flashcard generation
- `MAIL_*` - for password reset emails

## Architecture

```
┌─────────────────────┐
│   localhost:8080    │
│  (Frontend + API)   │
└──────────┬──────────┘
           │
    ┌──────▼──────┐
    │     app     │
    │  (Backend)  │
    └──────┬──────┘
           │
    ┌──────▼──────┐
    │  postgres   │
    │  (Database) │
    └─────────────┘
```

The app container includes both frontend (built with Vite) and backend (Spring Boot).
