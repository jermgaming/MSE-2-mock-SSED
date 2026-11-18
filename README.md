# CampusHub - Dockerized Multi-Service Architecture

## 1. Project Overview

CampusHub is a full-stack, event management platform containerized with Docker and orchestrated using Docker Compose. It allows students and campus staff to browse campus events, register for sessions with automated email confirmation via asynchronous background workers, and upload event banners stored in S3-compatible object storage with Redis caching.

## 2. Architecture & Service Contract

The architecture consists of 9 isolated, interconnected services organized into 3 security tiers:

| Service | Image / Build | Internal Port | Host Port | Role & Details |
|---|---|---|---|---|
| **gateway** | `nginxinc/nginx-unprivileged:1.27-alpine` | 8080 | `8080` (public) | Single public ingress reverse proxy, routes `/`, `/api/`, `/storage/` |
| **frontend** | Multi-stage build (`app/frontend`) | 8080 | None | React SPA built via Vite, served with unprivileged Nginx |
| **api** | `campushub-api:local` (`app/api`) | 3000 | None | Express.js API, executes database migrations & seeds on startup |
| **worker** | Same image (`campushub-api:local`) | None | None | Consumes RabbitMQ `registration_emails` queue & dispatches emails |
| **db** | `postgres:16-alpine` | 5432 | None | Primary relational database for events and registrations |
| **redis** | `redis:7-alpine` | 6379 | None | High-speed cache for event lists (`/api/events`) with 30s TTL |
| **rabbitmq** | `rabbitmq:3-management-alpine` | 5672, 15672 | `127.0.0.1:15672` | Message broker for resilient asynchronous email delivery |
| **minio** | `pgsty/silo:RELEASE.2026-09-16T00-00-00Z` | 9000, 9001 | `127.0.0.1:9001` | S3-compatible object storage for event promotional images |
| **mailhog** | `mailhog/mailhog:v1.0.1` | 1025, 8025 | `127.0.0.1:8025` | Local SMTP test server and web inbox UI |

### Network Segmentation
- **`frontend` network**: Connects `gateway` to `frontend`.
- **`backend` network**: Connects `gateway` to `api`, `minio`, and allows backend communication with `worker`.
- **`data` network**: Isolates databases, message queues, and internal caches (`db`, `redis`, `rabbitmq`, `minio`, `mailhog`) so they are unreachable from the frontend tier.

### Storage Volumes
- `postgres_data`: Persistent volume mounted to `/var/lib/postgresql/data`.
- `minio_data`: Persistent volume mounted to `/data`.

## 3. Design Decisions

1. **Multi-Stage Build & Attack Surface Minimization**:
   - The React frontend uses a two-stage build. Node.js, npm, dependencies, and build tools remain strictly in the builder stage. Only the compiled HTML/JS/CSS assets are copied into a clean `nginxinc/nginx-unprivileged` runtime image.
   - The API uses `node:20-alpine` with `--omit=dev` and cache cleanup, keeping the production image size under 250 MB.

2. **Principle of Least Privilege (Non-Root Execution)**:
   - All services handling client traffic or application code (`frontend`, `api`, `worker`, `gateway`) execute as dedicated unprivileged non-root users (`USER 101` / `USER node`).
   - Only the Nginx gateway is bound to `0.0.0.0:8080`. Management consoles (RabbitMQ, MinIO, MailHog) are bound exclusively to `127.0.0.1` loopback for developer debugging.

3. **Strict Secret Management & Health-Gated Startup**:
   - Zero credentials or passwords are hardcoded into Dockerfiles or `docker-compose.yml`. All variables are supplied via `.env` with `.gitignore` and `.dockerignore` enforcement.
   - Service dependencies use `condition: service_healthy` so the API only starts after PostgreSQL, Redis, RabbitMQ, and MinIO report healthy state.

## 4. How to Run & Test

### Setup Environment
```bash
cp .env.example .env
```

### Start the Stack
```bash
docker compose up -d --build --wait
```

### Verify Running Containers
```bash
docker compose ps
```

### Execute Test Suite (Automated Grading)
```bash
DC="docker compose" ENV_FILE=.env ./grade.sh
```

### Stop the Stack
```bash
# Keep persistent data
docker compose down

# Or wipe all volumes
docker compose down -v
```
