# CampusHub – Dockerized 9-Service Application

CampusHub is a containerized event management application built using Docker and Docker Compose. It uses a 9-service architecture with isolated networks, persistent storage, health checks and non-root application containers.

## 1. Architecture

```text
                   HOST
                     |
               Port 8080
                     |
               NGINX GATEWAY
                /     |     \
               /      |      \
          FRONTEND    API    MINIO
                      |        |
              +-------+--------+
              |       |        |
           POSTGRES  REDIS  RABBITMQ
                               |
                             WORKER
                               |
                            MAILHOG
```

## 2. Services

| Service | Purpose | Internal Port |
|---|---|---|
| Gateway | Public entry point and reverse proxy | 8080 |
| Frontend | React application served through Nginx | 8080 |
| API | Backend REST API | 3000 |
| Worker | Processes registration email jobs | - |
| PostgreSQL | Persistent relational database | 5432 |
| Redis | API response caching | 6379 |
| RabbitMQ | Asynchronous message queue | 5672 |
| MinIO | Object/image storage | 9000 |
| MailHog | Email testing SMTP server | 1025 |

Only the Gateway is publicly exposed. MailHog UI is available on localhost port 8025.

## 3. Prerequisites

- Docker Desktop
- Docker Compose
- Git

## 4. Setup and Run

Clone the repository:

```bash
git clone https://github.com/tyagiarpit2024-droid/MSE-2-mock-SSED.git
cd MSE-2-mock-SSED
```

Create the environment file:

```bash
cp .env.example .env
```

Update the passwords and credentials in `.env` before starting the application.

Build and start all services:

```bash
docker compose up -d --build --wait
```

Check service status:

```bash
docker compose ps
```

Stop the application:

```bash
docker compose down
```

Persistent volumes are retained when using `docker compose down`. To remove volumes as well:

```bash
docker compose down -v
```

## 5. Application Access

| Component | URL |
|---|---|
| CampusHub Frontend | http://localhost:8080 |
| API Health | http://localhost:8080/api/health |
| Events API | http://localhost:8080/api/events |
| MailHog UI | http://localhost:8025 |

## 6. Gateway Routing

The Nginx Gateway provides a single entry point:

- `/` → React Frontend
- `/api/` → Backend API
- `/storage/` → MinIO object storage

Image uploads are limited to 4 MB.

## 7. Important Design Decisions

### 1. Multi-Stage Docker Builds

The frontend uses a multi-stage Docker build. React is built using Node.js, while the final image uses unprivileged Nginx to serve static files.

The API uses a lightweight Distroless Node.js runtime to reduce image size and exclude unnecessary runtime tools.

### 2. Service Isolation and Security

Three Docker bridge networks are used:

- Frontend network
- Backend network
- Data network

Application containers run as non-root users. Only the Gateway is exposed on the public host interface. Environment variables are used for credentials instead of hardcoding secrets in the Compose file.

### 3. Persistent Storage and Asynchronous Processing

PostgreSQL and MinIO use named Docker volumes to preserve data across container restarts.

RabbitMQ handles registration email jobs asynchronously. The Worker processes queued jobs and sends emails through MailHog.

Redis caches the events API response for 30 seconds to reduce repeated database queries.

## 8. Health Checks and Resource Limits

Docker health checks are configured for:

- Gateway
- Frontend
- API
- Worker
- PostgreSQL
- Redis
- RabbitMQ
- MinIO

CPU and memory limits are configured for all nine services. Restart policies are also configured to improve service recovery.

## 9. Environment and Security

- `.env.example` contains placeholder configuration.
- `.env` contains local credentials and must not be committed.
- `.gitignore` excludes environment secrets.
- `.dockerignore` files exclude unnecessary files from Docker build contexts.
- API and Worker reuse the same Docker image.

## 10. Image Size

The optimized API image is approximately **226.2 MiB**, below the required 250 MiB limit.