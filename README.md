# CampusHub

CampusHub is a full-stack event registration and management system organized into a containerized microservice architecture orchestrated with Docker Compose.

---

## Architecture Overview

```
                      +-----------------------------+
                      |       Host / Browser        |
                      +--------------+--------------+
                                     |  port 8080 (0.0.0.0)
                                     v
                      +-----------------------------+
                      |     Gateway (Nginx)         |
                      +------+---------------+------+
                             |               |
              +--------------+               +---------------+
              | /                            | /api/         | /storage/
              v                              v               v
     +-----------------+             +---------------+ +------------+
     | Frontend (HTML) |             |  API (Node)   | |   MinIO    |
     +-----------------+             +---+-------+---+ +------------+
                                         |       |
                 +-----------------------+       +------------------+
                 |                       |                          |
                 v                       v                          v
          +-------------+         +-------------+            +-------------+
          |  PostgreSQL |         |    Redis    |            |   RabbitMQ  |
          +-------------+         +-------------+            +------+------+
                                                                    |
                                                                    v
                                                             +-------------+
                                                             |   Worker    |
                                                             +------+------+
                                                                    |
                                                                    v
                                                             +-------------+
                                                             |   MailHog   |
                                                             +-------------+
```

### Service Directory
1. **Gateway (`campushub-gateway`)**: Unprivileged Nginx reverse proxy acting as the single public entry point (`0.0.0.0:8080`). Routes `/` to the frontend, `/api/` to the API server, and `/storage/` to MinIO.
2. **Frontend (`campushub-frontend`)**: Multi-stage build serving the React static assets via an unprivileged Nginx web server on port 8080.
3. **API (`campushub-api`)**: Node.js Express server handling API requests, database migrations, MinIO bucket initialization, event queries, and queuing registration jobs.
4. **Worker (`campushub-worker`)**: Reuses the API container image to consume registration tasks asynchronously from RabbitMQ and send confirmation emails through MailHog.
5. **PostgreSQL Database (`campushub-db`)**: Persistent relational database storing event definitions and registration records.
6. **Redis Cache (`campushub-redis`)**: In-memory key-value cache with password authentication caching event queries (`X-Cache: HIT/MISS`).
7. **RabbitMQ (`campushub-rabbitmq`)**: Message broker providing durable queueing for asynchronous email notification dispatching.
8. **MinIO (`campushub-minio`)**: S3-compatible object storage storing uploaded event banner images.
9. **MailHog (`campushub-mailhog`)**: Development SMTP server and webmail interface capturing transactional emails sent by the worker.

---

## How to Run the Stack

### Prerequisites
- Docker Engine 24+ and Docker Compose v2+
- Git

### 1. Configure Environment Variables
Copy the example environment configuration into a `.env` file:
```bash
cp .env.example .env
```
*(Review `.env` if custom credentials or port mappings are required. `.env` is excluded from Git tracking for security).*

### 2. Start the Stack
Build and launch all 9 services with health check verification:
```bash
docker compose up -d --build --wait
```

### 3. Verify Health and Access the Application
- **CampusHub Web Application**: [http://localhost:8080](http://localhost:8080)
- **API Health Check**: [http://localhost:8080/api/health](http://localhost:8080/api/health)
- **Events Endpoint**: [http://localhost:8080/api/events](http://localhost:8080/api/events)
- **MailHog Webmail UI**: [http://127.0.0.1:8025](http://127.0.0.1:8025)
- **RabbitMQ Management Dashboard**: [http://127.0.0.1:15672](http://127.0.0.1:15672) (User: `campus`, Password: from `.env`)
- **MinIO Console**: [http://127.0.0.1:9001](http://127.0.0.1:9001)

### 4. Running Verification Test Suite
Run the automated test suite using:
```bash
DC="docker compose" ENV_FILE=.env ./grade.sh
```

### 5. Stopping the Stack
To stop the stack and keep persistent data:
```bash
docker compose down
```

To stop the stack and remove all named volumes:
```bash
docker compose down -v
```

---

## Design Decisions

### 1. Multi-Stage Build for the Frontend
- **Decision**: Used a multi-stage Docker build with `node:20.18.0-alpine` in the builder stage and `nginxinc/nginx-unprivileged:alpine` in the runtime stage.
- **Rationale**: Isolates heavy build dependencies (Node runtime, Vite, build plugins, and `node_modules`) completely within the temporary build layer. The resulting production image contains only static web assets (`dist/`) served by Nginx, reducing the final image size to ~25 MB, eliminating build tool vulnerabilities from production, and enforcing non-root execution (`nginx` UID 101).

### 2. Single Image Reuse with Custom Healthcheck for API and Worker
- **Decision**: Built a single production image (`campushub-api`) based on `node:20.18.0-alpine` with production-only dependencies and layer caching, reused by both the `api` and `worker` services. In `docker-compose.yml`, the worker overrides the entrypoint command and defines its own process-based healthcheck (`pgrep -f node`).
- **Rationale**: Keeps Docker build times low and minimizes disk usage by sharing a single cached image for the same codebase. Overriding the healthcheck prevents the worker from inheriting the API's HTTP port 3000 health check, which would otherwise mark the worker unhealthy since it is a headless queue consumer.

### 3. Strict 3-Tier Network Segmentation and Least Privilege Exposure
- **Decision**: Partitioned services across three isolated bridge networks (`frontend`, `backend`, and `data`), and published only the Gateway port (`0.0.0.0:8080`) to public host interfaces. Management interfaces (MailHog, RabbitMQ, MinIO) are bound strictly to `127.0.0.1`.
- **Rationale**: Enforces defense-in-depth and the principle of least privilege. The database, Redis cache, and internal message queues reside on the private `data` network with zero exposure to external traffic or the frontend container. Only the gateway can receive external requests and route them to their respective internal destinations.
