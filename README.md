# CampusHub – Dockerized Microservices Application

CampusHub is a 9-service campus event management platform containerized with Docker and orchestrated using Docker Compose.

---

## Architecture Overview

```
                          [ Client Browser ]
                                  │
                       :8080 (Single Public Port)
                                  ▼
                     ┌────────────────────────┐
                     │   Gateway (Nginx)      │
                     └───────┬───────┬────────┘
             /               │       │             /storage/
     ┌───────┴──────┐        │       └───────┐
     ▼              ▼        ▼               ▼
┌──────────┐   ┌─────────────────┐     ┌───────────┐
│ Frontend │   │ API (Express)   │     │ MinIO S3  │
│  (React) │   └────┬───┬───┬────┘     │  Storage  │
└──────────┘        │   │   │          └─────┬─────┘
                    │   │   │                │
            ┌───────┘   │   └────────┐       │
            ▼           ▼            ▼       ▼
       ┌──────────┐ ┌───────┐ ┌───────────────┐
       │ PostgreSQL│ │ Redis │ │   RabbitMQ    │
       │    (DB)  │ │ (Cache│ └───────┬───────┘
       └──────────┘ └───────┘         │
                                      ▼
                              ┌───────────────┐
                              │ Worker (Node) │
                              └───────┬───────┘
                                      │ SMTP
                                      ▼
                              ┌───────────────┐
                              │ MailHog (Sink)│
                              └───────────────┘
```

### Services Summary

| Service | Technology / Image | Internal Port | Description |
|---|---|---|---|
| **gateway** | `nginxinc/nginx-unprivileged:alpine` | 8080 (published) | Reverse proxy & single public entry point (`/` -> frontend, `/api/` -> api, `/storage/` -> minio). |
| **frontend**| Multi-stage `node:20-alpine` + `nginx-unprivileged` | 8080 | React + Vite client serving compiled static assets. |
| **api** | `node:20-alpine` (custom) | 3000 | Express REST API; runs database migrations & seeds on startup. |
| **worker** | `campushub-api:latest` | Background | Asynchronous consumer; processes `registration_emails` from RabbitMQ. |
| **db** | `postgres:16-alpine` | 5432 | Primary relational database with persistent named volume. |
| **redis** | `redis:7-alpine` | 6379 | In-memory cache for events (supports cache HITs with 30s TTL). |
| **rabbitmq** | `rabbitmq:3-management-alpine` | 5672 (15672 UI) | AMQP message broker for asynchronous job queuing. |
| **minio** | `pgsty/silo:RELEASE.2026-11-12T00-00-00Z` | 9000 (9001 UI) | S3-compatible object storage for event promotional images. |
| **mailhog** | `mailhog/mailhog:v1.0.1` | 1025 (8025 UI) | Development SMTP server & webmail viewer for registration emails. |

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows / macOS / Linux)
- Docker Compose v2+
- Git

---

## Quickstart

### 1. Environment Configuration
Copy the provided `.env.example` file to `.env`:
```bash
cp .env.example .env
```
> **Security Notice:** `.env` contains local environment secrets and is excluded from source control via `.gitignore` and `.dockerignore`.

### 2. Build and Launch Stack
Start all 9 services with health check verification:
```bash
docker compose up -d --build --wait
```

### 3. Verify Running Services
Inspect container states:
```bash
docker compose ps
```
All containers should report `Up (healthy)` or `Up`.

### 4. Access Application Endpoints
- **CampusHub Web Application:** [http://localhost:8080/](http://localhost:8080/)
- **API Health Check:** [http://localhost:8080/api/health](http://localhost:8080/api/health)
- **Events Endpoint:** [http://localhost:8080/api/events](http://localhost:8080/api/events)
- **MailHog Webmail UI:** [http://127.0.0.1:8025/](http://127.0.0.1:8025/)
- **RabbitMQ Management Dashboard:** [http://127.0.0.1:15672/](http://127.0.0.1:15672/) (credentials from `.env`)
- **MinIO Console:** [http://127.0.0.1:9001/](http://127.0.0.1:9001/)

### 5. Stop the Stack
To stop the services while preserving database and object storage volumes:
```bash
docker compose down
```
To stop the stack and delete persistent volumes:
```bash
docker compose down -v
```

---

## Key Design Decisions & Rationale

1. **Multi-Stage Build for Frontend:**
   - *Rationale:* The React application requires Node.js, Vite, and build tools solely during compilation. Using a multi-stage Dockerfile allows us to discard the heavy Node.js runtime and all build-time `node_modules` from the production stage, serving compiled static files from an unprivileged Nginx Alpine image. This drastically minimizes the attack surface and reduces the image footprint.

2. **Reusing API Image for Worker with Explicit Health Check Disabling:**
   - *Rationale:* The API server and background worker share the same Node.js codebase and dependencies (`amqplib`, `nodemailer`, etc.) but differ only in their entry point (`node src/server.js` vs `node src/worker.js`). Reusing the single `campushub-api:latest` image avoids redundant build steps and duplicate disk usage. Because the worker is a headless queue consumer with no open HTTP port, we explicitly configure `healthcheck: disable: true` in `docker-compose.yml` to prevent it from inheriting an invalid API HTTP check.

3. **Least-Privilege Networking and Non-Root Execution:**
   - *Rationale:* 
     - **Non-Root Execution:** All services (`api`, `worker`, `frontend`, `gateway`) execute under dedicated non-root users (`node` UID 1000 and `nginx` UID 101), complying with enterprise security hardening best practices.
     - **Network Segmentation:** Services are divided across three isolated bridge networks (`frontend`, `backend`, `data`). Sensitive infrastructure (PostgreSQL, Redis, RabbitMQ) is isolated on the `data` network, inaccessible from the external world.
     - **Single Public Port:** Only the Nginx Gateway exposes a public port on `0.0.0.0:8080`. Management consoles (RabbitMQ UI, MailHog, MinIO) are strictly bound to localhost (`127.0.0.1`).

---

## Verification & Testing

The stack passes all automated validation tests:
- **Health Verification:** Gateway proxies `/api/health` returning `{"ok":true}`.
- **Frontend Serving:** Root path `/` serves the React application with `<div id="root">`.
- **Database Seeding:** Automatically runs migrations and seeds events (`Hack Night`, `Career Fair`, `Robotics Demo Day`).
- **Caching:** First request yields `X-Cache: MISS`, immediate subsequent requests yield `X-Cache: HIT`.
- **Asynchronous Queue & Email:** Registration endpoint `/api/events/:id/register` returns HTTP 202, queues event to RabbitMQ, and worker delivers confirmation email to MailHog.
- **Object Storage:** Event images upload up to 4 MB via `/api/events/:id/image`, store in MinIO bucket `campushub`, and are routed through `/storage/`.
- **Data Persistence:** Database records survive `docker compose down` and `docker compose up` cycles via named Docker volume `postgres_data`.
- **Image Size Compliance:** API image is 216 MB (well below the 250 MB ceiling).
- **Zero Committed Secrets:** All credentials are dynamically supplied through environment variables.
