# Docker Test Commands

## Option 1: Using the script (recommended)

```bash
# 1. Edit docker-test.sh and fill in your values
nano docker-test.sh

# 2. Run the script
./docker-test.sh
```

## Option 2: Manual commands

### Step 1: Build the image

```bash
docker build -t 10xcards-java:test .
```

### Step 2: Run the container

```bash
docker run -d \
  --name 10xcards-test \
  -p 8080:8080 \
  -e SPRING_DATASOURCE_URL="jdbc:postgresql://host.docker.internal:5432/10xcards" \
  -e DB_USERNAME="YOUR_DB_USERNAME" \
  -e DB_PASSWORD="YOUR_DB_PASSWORD" \
  -e JWT_SECRET="YOUR_JWT_SECRET_AT_LEAST_256_BITS" \
  -e MAIL_HOST="smtp.gmail.com" \
  -e MAIL_PORT="587" \
  -e MAIL_USERNAME="YOUR_EMAIL" \
  -e MAIL_PASSWORD="YOUR_EMAIL_PASSWORD" \
  -e OPENROUTER_API_KEY="YOUR_OPENROUTER_KEY" \
  -e FRONTEND_URL="http://localhost:8080" \
  10xcards-java:test
```

**Note:** Replace `YOUR_*` placeholders with actual values.

### Step 3: Check logs

```bash
# Follow logs
docker logs -f 10xcards-test

# Or just view recent logs
docker logs 10xcards-test
```

### Step 4: Check health

```bash
# Wait ~30 seconds for startup, then:
curl http://localhost:8080/actuator/health

# Or open in browser:
# http://localhost:8080
```

## Useful commands

```bash
# Stop container
docker stop 10xcards-test

# Start stopped container
docker start 10xcards-test

# Remove container
docker rm 10xcards-test

# Remove container forcefully (if running)
docker rm -f 10xcards-test

# Shell access to running container
docker exec -it 10xcards-test sh

# View container resource usage
docker stats 10xcards-test

# Inspect container
docker inspect 10xcards-test
```

## Testing with local database

If you have PostgreSQL running locally (via docker-compose.yml):

```bash
# 1. Start local database
docker compose up -d postgres

# 2. Build and run app container
docker build -t 10xcards-java:test .

docker run -d \
  --name 10xcards-test \
  --network 10xcards-java_10xcards-network \
  -p 8080:8080 \
  -e SPRING_DATASOURCE_URL="jdbc:postgresql://10xcards-postgres:5432/10xcards" \
  -e DB_USERNAME="postgres" \
  -e DB_PASSWORD="postgres" \
  -e JWT_SECRET="test-secret-key-at-least-256-bits-long" \
  -e FRONTEND_URL="http://localhost:8080" \
  10xcards-java:test
```

## Cleanup

```bash
# Remove test container and image
docker rm -f 10xcards-test
docker rmi 10xcards-java:test

# Remove all unused images
docker image prune -a
```
