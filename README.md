# CampusHub – Dockerized Microservices Application

## Project Overview
CampusHub is a 9-service application containerized using Docker and Docker Compose.

## Services

| Service | Purpose |
|---|---|
| Gateway | Nginx reverse proxy |
| Frontend | React + Vite application |
| API | Node.js + Express backend |
| Worker | Background email processing |
| Database | PostgreSQL |
| Redis | Caching |
| RabbitMQ | Message queue |
| MinIO-compatible storage | Image storage |
| MailHog | Email testing |

## Architecture

- Gateway routes frontend, API and storage requests.
- Frontend communicates through the gateway.
- API connects to PostgreSQL, Redis, RabbitMQ and object storage.
- Worker consumes registration email jobs from RabbitMQ.
- MailHog captures outgoing emails for testing.

## Run the Project

### Requirements
- Docker Desktop
- Docker Compose

### Setup

1. Clone the repository.
2. Create `.env` from `.env.example`.
3. Start the application:

```bash
docker compose up -d --build --wait
```

4. Open the application:

`http://localhost:8080`

5. Check running services:

```bash
docker compose ps
```

6. Stop services:

```bash
docker compose down
```

## Environment Variables

Application configuration is stored in `.env`.

Do not commit `.env` or real passwords and tokens. Use `.env.example` for placeholders.

## Design Decisions

1. **Multi-stage frontend build:** Builds React assets separately and serves static files through an unprivileged Nginx image, reducing runtime image size.

2. **Service separation:** API and worker use the same Docker image but run different commands. This separates HTTP requests from background email processing.

3. **Private networks and persistent volumes:** Services communicate through dedicated Docker networks. PostgreSQL and object-storage data use named volumes for persistence.

## Security and Optimization

- Non-root users for application containers.
- Docker images use versioned tags.
- `.dockerignore` excludes unnecessary files.
- Resource limits and restart policies are configured.
- Only the gateway is publicly exposed; management interfaces are restricted to localhost where configured.

## Verification

The application was tested for:
- Frontend and API access
- PostgreSQL initialization and seeded events
- Redis cache MISS and HIT
- RabbitMQ connectivity
- Registration and email delivery
- Image upload and retrieval
- Data persistence after restart
- Non-root container execution

## Storage Note

The object-storage service uses the S3-compatible `pgsty/silo` image in this configuration.

