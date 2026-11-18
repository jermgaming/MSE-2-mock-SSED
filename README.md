# CampusHub - Containerized 9-Service Architecture

CampusHub is a full-stack campus event management application containerized with Docker and orchestrated with Docker Compose for production-grade reliability, security, and scalability.

---

## Architecture & Service Overview

The stack consists of 9 isolated container services communicating over segregated internal networks:

```
[ Client / Browser ]
        |
    (Port 8080)
        v
+-----------------------------------------------------------+
|                      Gateway (Nginx)                      |
+-----------------------------------------------------------+
       |                         |                     |
       | /                       | /api/               | /storage/
       v                         v                     v
+---------------+       +-----------------+     +---------------+
|   Frontend    |       |       API       |     |     MinIO     |
| (React/Nginx) |       | (Node Express)  |     | (S3 Storage)  |
+---------------+       +-----------------+     +---------------+
                          |   |     |    \             |
           +--------------+   |     |     +---------+  |
           |                  |     |               |  |
           v                  v     v               v  v
      +----------+        +-------+ +----------+  [Named Volumes]
      | Postgres |        | Redis | | RabbitMQ |  (pg_data, minio_data)
      |   (DB)   |        |(Cache)| | (Queue)  |
      +----------+        +-------+ +----------+
                                        |
                                        v
                                 +--------------+
                                 |    Worker    |
                                 | (Background) |
                                 +--------------+
                                        |
                                        v
                                 +--------------+
                                 |   MailHog    |
                                 | (SMTP/Mail)  |
                                 +--------------+
```

### Services Contract

| Service | Base Image / Build Context | Internal Port | Networks | Role & Description |
|---|---|---|---|---|
| **gateway** | `nginxinc/nginx-unprivileged:alpine` | 8080 (Published: `${GATEWAY_PORT:-8080}`) | `frontend`, `backend`, `data` | Reverse proxy and single public entry point routing `/` to frontend, `/api/` to API, and `/storage/` to MinIO. |
| **frontend** | `./app/frontend` (multi-stage) | 8080 | `frontend` | Production React SPA served via unprivileged Nginx. |
| **api** | `./app/api` (`node:20-alpine`) | 3000 | `backend`, `data` | REST API handling event management, DB migrations, caching, queuing, and uploads. |
| **worker** | Reuses `campushub-api` image | None | `backend`, `data` | Background consumer that consumes registration tasks from RabbitMQ and dispatches confirmation emails via MailHog. |
| **db** | `postgres:16-alpine` | 5432 | `data` | PostgreSQL relational database for events and registrations. Data persisted via `pg_data` volume. |
| **redis** | `redis:7-alpine` | 6379 | `data` | In-memory key-value cache for caching `/api/events` responses with password authentication. |
| **rabbitmq** | `rabbitmq:3-management-alpine` | 5672 (Admin UI: `127.0.0.1:15672`) | `data` | Message broker managing `registration_emails` job queue. |
| **minio** | `bitnamilegacy/minio:latest` | 9000 (Console: `127.0.0.1:9001`) | `data` | S3-compatible object store hosting event banner images with `campushub` public bucket. Data persisted via `minio_data` volume. |
| **mailhog** | `mailhog/mailhog:latest` | 1025 SMTP (Web UI: `127.0.0.1:8025`) | `backend` | Development SMTP server and email inbox for registration confirmations. |

---

## How to Run the Stack

### 1. Prerequisites
- Docker Engine 24+ & Docker Compose v2+
- Git

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `.env` remains git-ignored and contains your local deployment configuration.

### 3. Build and Start All Containers
Launch the stack with automatic health check waiting:
```bash
docker compose up -d --build --wait
```

### 4. Access the Application
- **CampusHub Web App:** [http://localhost:8080](http://localhost:8080)
- **API Health Check:** [http://localhost:8080/api/health](http://localhost:8080/api/health)
- **MailHog Web UI:** [http://127.0.0.1:8025](http://127.0.0.1:8025)
- **RabbitMQ Management:** [http://127.0.0.1:15672](http://127.0.0.1:15672) (User: `campus`, Pass: `change-me-mq`)
- **MinIO Console:** [http://127.0.0.1:9001](http://127.0.0.1:9001) (User: `minioadmin`, Pass: `change-me-too`)

### 5. Automated Verification (Grader)
Run the test suite:
```bash
DC="docker compose" ENV_FILE=.env ./grade.sh
```

### 6. Stopping the Stack
To stop containers while preserving persistent database and object storage volumes:
```bash
docker compose down
```
To stop and remove all volumes:
```bash
docker compose down -v
```

---

## Design Decisions and Rationale

### 1. Multi-Stage Build for the Frontend
- **Decision:** Built the React frontend in a temporary Node.js builder stage (`node:20-alpine`) and copied only static production bundle files (`dist/`) into `nginxinc/nginx-unprivileged:alpine`.
- **Reason:** Keeps the final runtime image lightweight (~25 MB), prevents Node.js, npm, or devDependencies from entering production, and enforces security by running as non-root UID 101.

### 2. Unified Base Image & Layer Optimization for API and Worker
- **Decision:** Used a single `node:20-alpine` Dockerfile for both the API server and background Worker, installed production dependencies only (`--omit=dev`), set non-root ownership (`node`), and cleared npm caches.
- **Reason:** Sharing the image cuts build time and disk utilization in half while keeping image size at ~216 MB (well below the 250 MB ceiling). The Worker overrides the default entrypoint to run `node src/worker.js` and implements a dedicated process health check (`pgrep -f 'src/worker.js'`) so it does not inherit the HTTP `/api/health` check.

### 3. Least-Privilege Network Segmentation & Reverse Proxy Gateway
- **Decision:** Divided the architecture into three discrete networks (`frontend`, `backend`, `data`), and made the Nginx gateway the only publicly bound port (`0.0.0.0:8080`). Administrative interfaces (RabbitMQ, MailHog, MinIO console) are strictly bound to localhost `127.0.0.1`.
- **Reason:** Datastores (`db`, `redis`, `rabbitmq`, `minio`) cannot be accessed from public host interfaces or the frontend container directly. Routing through Nginx enforces centralized proxy controls, connection timeouts, and a 5 MB upload limit for banner images.
