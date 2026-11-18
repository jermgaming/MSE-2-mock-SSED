# CampusHub Docker Infrastructure

CampusHub is a full-stack, distributed campus event management application running as a 9-service containerized architecture orchestrated with Docker Compose.

---

## 1. Architecture Overview

The application is decomposed into nine services communicating across isolated Docker bridge networks:

```
                            +--------------------------+
                            |   Client / Browser       |
                            +-------------+------------+
                                          |
                              Port 8080   |  (Only public port)
                                          v
                      +-------------------+--------------------+
                      |         Gateway (Nginx)                |
                      +-----+----------------+---------------+--+
                            |                |               |
              / (Frontend)  |   /api/ (API)  |     /storage/ | (MinIO S3)
                            v                v               v
               +------------+----+    +------+-----+    +----+-----+
               |    Frontend     |    |    API     |    |  MinIO   |
               | (React / Nginx) |    |  (Node.js) |    | (S3/Silo)|
               +-----------------+    +------+-----+    +----+-----+
                 [frontend net]              |               ^
                                             |               |
               +-----------------------------+---------------+
               |                             |               |
               v                             v               v
        +------+------+               +------+------+  +-----+------+
        | PostgreSQL  |               |    Redis    |  |  RabbitMQ  |
        |  Database   |               |   (Cache)   |  |  (Broker)  |
        +-------------+               +-------------+  +-----+------+
          [data net]                    [data net]           |
                                                             | (Queue)
                                                             v
                                                      +------+------+
                                                      |   Worker    |
                                                      |  (Consumer) |
                                                      +------+------+
                                                             |
                                                    SMTP:1025|
                                                             v
                                                      +------+------+
                                                      |   MailHog   |
                                                      | (Local SMTP)|
                                                      +-------------+
```

### Services Directory

| Service | Image / Build Context | Internal Port | Exposed Host Port | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **gateway** | `nginxinc/nginx-unprivileged:1.27-alpine` | `8080` | `8080` (`0.0.0.0`) | Reverse proxy and single public entrypoint |
| **frontend** | `./app/frontend` (multi-stage) | `8080` | None | Pre-compiled Vite/React static SPA |
| **api** | `./app/api` (Node 20 Alpine) | `3000` | None | REST API, database migrations & seeding |
| **worker** | `campushub-api:1.0` | None | None | RabbitMQ consumer sending registration emails |
| **db** | `postgres:16-alpine` | `5432` | None | Persistent relational database |
| **redis** | `redis:7.4-alpine` | `6379` | None | Cache layer for high-throughput endpoints |
| **rabbitmq**| `rabbitmq:3.13-management-alpine` | `5672`, `15672` | `127.0.0.1:15672` | Asynchronous message broker |
| **minio** | `pgsty/silo:RELEASE.2026-11-12T00-00-00Z` | `9000`, `9001` | `127.0.0.1:9001` | S3-compatible object storage for event banners |
| **mailhog** | `mailhog/mailhog:v1.0.1` | `1025`, `8025` | `127.0.0.1:8025` | Local SMTP test server & web inbox |

---

## 2. Getting Started

### Prerequisites
- Docker Engine 24+ and Docker Compose v2+
- Git

### Quickstart

1. **Clone the repository and enter the directory**:
   ```bash
   git clone https://github.com/anandkgupta-dev/MSE-2-mock-SSED.git
   cd MSE-2-mock-SSED
   ```

2. **Prepare Environment File**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. **Start the Stack**:
   Build and start all 9 containers with health checks:
   ```bash
   docker compose up -d --build --wait
   ```

4. **Verify Health**:
   Check that all 9 containers are running and healthy:
   ```bash
   docker compose ps
   ```

5. **Access Application Endpoints**:
   - Web Application: [http://localhost:8080/](http://localhost:8080/)
   - API Healthcheck: [http://localhost:8080/api/health](http://localhost:8080/api/health)
   - MailHog UI: [http://127.0.0.1:8025/](http://127.0.0.1:8025/)
   - RabbitMQ Management: [http://127.0.0.1:15672/](http://127.0.0.1:15672/) (User: `campus`, Pass: `change-me-mq`)
   - MinIO Console: [http://127.0.0.1:9001/](http://127.0.0.1:9001/) (User: `minioadmin`, Pass: `change-me-too`)

6. **Run Grading / Verification Suite**:
   ```bash
   ./grade.sh
   ```

7. **Tear Down**:
   ```bash
   # Stop containers keeping data
   docker compose down

   # Remove containers, networks, and named volumes
   docker compose down -v
   ```

---

## 3. Key Design Decisions

### Decision 1: Least-Privilege Network Segmentation (3 Tiers)
- **Design**: Created three distinct bridge networks: `frontend`, `backend`, and `data`.
- **Reason**: Security hardening through least-privilege boundary enforcement.
  - The `frontend` network contains only `gateway` and `frontend`.
  - The `backend` network links `gateway`, `api`, `worker`, `minio`, and `mailhog`.
  - The `data` network is strictly isolated for `api`, `worker`, `db`, `redis`, `rabbitmq`, and `minio`.
  - This guarantees that PostgreSQL, Redis, and internal datastores are never accessible to the frontend or directly routeable from public requests.

### Decision 2: Multi-Stage Build & Non-Root Containers
- **Design**:
  - The frontend Dockerfile uses Node 20 to build the static React bundle, then copies only the resulting `dist/` directory into an unprivileged Nginx image (`nginxinc/nginx-unprivileged:1.27-alpine`).
  - The API image installs production dependencies only (`npm install --omit=dev`) with layer caching, drops privileges to the built-in non-root `node` user (UID 1000), and maintains an image footprint under 150 MB.
- **Reason**: Minimizes attack surface and container footprint by eliminating compilers, devDependencies, and root escalation pathways.

### Decision 3: Image Reuse with Custom Command & Healthcheck Decoupling
- **Design**: The `worker` service reuses the exact same container image built for `api` (`campushub-api:1.0`), overriding the startup command to `node src/worker.js` and explicitly disabling the inherited HTTP healthcheck (`healthcheck: disable: true`).
- **Reason**: Maximizes CI build efficiency and storage reuse by producing a single artifact for the shared Node.js codebase, while preventing spurious health check failures on the background worker which does not bind an HTTP server.

---

## 4. Operational & Security Enhancements

### Production vs Development Compose Override
- For local development with live code reloading:
  Use a `docker-compose.override.yml` that binds `./app/api:/app` and runs `npm run dev`.
- For production:
  The base `docker-compose.yml` runs immutable builds without host volume mounts, enforcing strict resource constraints (CPU and memory limits) on all services.

### Vulnerability Mitigation for API Image
1. Base image pinned to Alpine Linux reduces package count by >70% compared to Debian/Ubuntu bases, eliminating glibc-related CVEs.
2. Explicit `.dockerignore` prevents accidental leakage of `.env`, `.git`, or temporary artifacts into the build cache and image layers.

### Pushing to Docker Hub / Container Registry
To tag and publish the image to Docker Hub:
```bash
# 1. Log in using Docker Personal Access Token (PAT)
echo "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin

# 2. Tag image with version and latest
docker tag campushub-api:1.0 $DOCKERHUB_USERNAME/campushub-api:1.0.0
docker tag campushub-api:1.0 $DOCKERHUB_USERNAME/campushub-api:latest

# 3. Push to registry
docker push $DOCKERHUB_USERNAME/campushub-api:1.0.0
docker push $DOCKERHUB_USERNAME/campushub-api:latest
```

### Monitoring Strategy
To monitor the stack in staging/production:
- **Prometheus & Grafana**: Add `cAdvisor` to collect real-time container metrics (CPU, RAM, network I/O) and scrape the `/metrics` endpoints.
- **Health Probing**: Gateway `/api/health` integrates directly into load balancers and orchestrator liveness probes.
