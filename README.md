# CampusHub - Microservices Docker Deployment

CampusHub is a full-stack campus event management platform containerized with Docker and orchestrated using Docker Compose.

---

## Architecture Overview

The system consists of 9 microservices communicating over three isolated Docker networks (`frontend`, `backend`, `data`):

```
                       [ Host / Client ]
                               |
                               | (Port 8080)
                               v
                     +-------------------+
                     |      Gateway      | (Nginx Unprivileged)
                     +-------------------+
                       /       |       \
        / (Port 8080) /        |        \ /storage/ (Port 9000)
                     v         |         v
            +----------+       |       +----------+
            | Frontend |       |       |  MinIO   | (S3 Storage)
            +----------+       |       +----------+
                               | /api/ (Port 3000)
                               v
                         +-----------+
                         |    API    | (Node.js Express)
                         +-----------+
                          /    |    \
                         /     |     \
                        v      v      v
              +------------+ +-------+ +----------+
              | PostgreSQL | | Redis | | RabbitMQ | (AMQP Broker)
              +------------+ +-------+ +----------+
                                            |
                                            | (async job queue)
                                            v
                                      +------------+
                                      |   Worker   | (Background Worker)
                                      +------------+
                                            |
                                            | (SMTP Port 1025)
                                            v
                                      +------------+
                                      |  MailHog   | (Email Testing)
                                      +------------+
```

### Services Summary

| Service | Base Image / Build Context | Internal Port | Description & Role |
|---|---|---|---|
| **gateway** | `nginxinc/nginx-unprivileged:1.27-alpine` | `8080` (Published to host) | Reverse proxy & single public entry point (`/`, `/api/`, `/storage/`) |
| **frontend** | Multi-stage build (`node:20.18-alpine` -> `nginx-unprivileged`) | `8080` | Production React SPA served via Nginx |
| **api** | `node:20.18-alpine` (`./app/api`) | `3000` | Core REST API (auto-migrates & seeds database on start) |
| **worker** | Shared image `campushub-api` | N/A | Consumes registration events from RabbitMQ and sends emails via SMTP |
| **db** | `postgres:16-alpine` | `5432` | Relational storage for events and registrations (named volume `db_data`) |
| **redis** | `redis:7-alpine` | `6379` | Response caching for `/api/events` with password protection |
| **rabbitmq** | `rabbitmq:3-management-alpine` | `5672`, `15672` (loopback only) | Reliable AMQP message queue for background tasks |
| **minio** | `cleanstart/minio:latest` | `9000`, `9001` (loopback only) | S3-compatible object storage for event images (named volume `minio_data`) |
| **mailhog** | `mailhog/mailhog:v1.0.1` | `1025`, `8025` (loopback only) | Mock SMTP server and testing inbox UI |

---

## Getting Started

### Prerequisites

- [Docker Engine](https://docs.docker.com/engine/) (v24.0+)
- [Docker Compose](https://docs.docker.com/compose/) (v2.20+)

### 1. Environment Configuration

Copy the example environment file:
```bash
cp .env.example .env
```

Ensure `.env` remains ignored by git (configured in `.gitignore`).

### 2. Build and Start the Stack

Run the stack in detached mode, building images and waiting for all health checks:
```bash
docker compose up -d --build --wait
```

### 3. Verify Container Status

Check that all 9 containers are running and healthy:
```bash
docker compose ps
```

### 4. Access the Application

- **Frontend & Gateway**: [http://localhost:8080/](http://localhost:8080/)
- **API Health Endpoint**: [http://localhost:8080/api/health](http://localhost:8080/api/health)
- **MailHog Inbox UI**: [http://127.0.0.1:8025/](http://127.0.0.1:8025/)
- **RabbitMQ Management**: [http://127.0.0.1:15672/](http://127.0.0.1:15672/) (Username/Password from `.env`)
- **MinIO Console**: [http://127.0.0.1:9001/](http://127.0.0.1:9001/) (Access/Secret keys from `.env`)

### 5. Automated Verification

Execute the test suite to verify all 18 grading criteria:
```bash
DC="docker compose" ENV_FILE=.env ./grade.sh
```

### 6. Stopping the Stack

Stop containers while keeping database and object storage volumes intact:
```bash
docker compose down
```

To stop and wipe all volumes:
```bash
docker compose down -v
```

---

## Architectural & Design Decisions

### 1. Multi-Stage Build & Distroless-Style Image for Frontend
- **Decision**: The frontend uses a multi-stage Dockerfile where `node:20.18-alpine` compiles the Vite React application, and `nginxinc/nginx-unprivileged:1.27-alpine` serves only the static assets in the final stage.
- **Rationale**: This eliminates Node.js, `npm`, and `node_modules` (~150MB+ of build tooling and potential dependencies) from the runtime container. It drastically shrinks the attack surface, minimizes image size down to ~25MB, and ensures production security.

### 2. Single Shared Image with Role-Specific Command & Health Check for API & Worker
- **Decision**: The API and background worker build from a single Dockerfile (`campushub-api`). The API runs `npm start` (which executes migrations, seeding, and server startup), while the worker overrides the command to `node src/worker.js` and overrides the inherited HTTP healthcheck with a process-level check (`pgrep -f 'worker.js'`).
- **Rationale**: Reusing the image eliminates duplicate builds, maximizes layer caching, saves disk space, and prevents code divergence between API and worker while avoiding unsuitable HTTP health checks on a worker that exposes no HTTP port.

### 3. Least Privilege & Principle of Network Isolation
- **Decision**: 
  - Containers run as non-root users (`node` with UID 1000 for API/worker, `nginx` with UID 101 for Gateway/Frontend).
  - Services are separated into three isolated bridge networks: `frontend`, `backend`, and `data`.
  - Only the Gateway binds port `8080` to all host interfaces (`0.0.0.0`). Supporting developer UIs (MailHog, RabbitMQ, MinIO) bind strictly to loopback (`127.0.0.1`).
- **Rationale**: Network segmentation guarantees that public traffic cannot directly query the database, cache, or message broker. Running as unprivileged users mitigates container breakout vulnerabilities.
