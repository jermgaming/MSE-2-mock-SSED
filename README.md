# CampusHub starter (9-service exam)

The application code in `app/` is complete and works. Only Docker and deployment configuration files are managed here.

## Service Contract
| Service | Image or build | Port | Notes |
|---|---|---|---|
| gateway | nginx-unprivileged:1.27-alpine | 8080 | only port published on all public interfaces |
| frontend | `app/frontend` (multi-stage) | 8080 | static files from `npm run build` (`dist/`) |
| api | `app/api` | 3000 | `npm start` runs migration + seed, then the server |
| worker | same image as api | none | command `node src/worker.js` |
| db | postgres:16-alpine | 5432 | user, password, db name from env |
| redis | redis:7-alpine | 6379 | password required (`REDIS_PASSWORD`) |
| rabbitmq | rabbitmq:3-management-alpine | 5672 | user and password from env |
| minio | alpine/minio:latest-release | 9000 | bucket `campushub` is created by the API |
| mailhog | mailhog/mailhog:v1.0.1 | 1025 SMTP, 8025 UI | inspection UI bound to 127.0.0.1 |

Gateway routes:
- `/` -> frontend:8080
- `/api/` -> api:3000
- `/storage/` -> minio:9000/campushub/

---

## Architecture Overview
The system employs a 3-tier microservices architecture segregated into three distinct bridge networks:
1. `frontend` network: Reverse proxy gateway and React frontend static server.
2. `backend` network: Gateway, Node.js REST API, background worker, and asynchronous message broker / mail service.
3. `data` network: Node.js REST API, PostgreSQL database, Redis cache, RabbitMQ, and MinIO object store.

---

## Three Key Design Decisions

1. **Multi-Stage Build for React Frontend**:
   - **Reason**: The build stage utilizes `node:20-alpine` with full development tooling (Vite, Rollup) to compile the React code into optimized production assets (`dist/`). The final stage copies only static HTML/JS/CSS into an unprivileged Nginx container (`nginxinc/nginx-unprivileged:1.27-alpine`), completely stripping Node.js and `node_modules`. This minimizes image size (~21 MB) and eliminates build tool vulnerabilities in production.

2. **Shared API and Worker Image with Command and Health Check Override**:
   - **Reason**: Both the REST API and the async email worker share the same codebase and npm dependencies. By maintaining a single `app/api/Dockerfile` tagged as `campushub-api:latest`, we avoid duplicate builds and layer caching redundancy. The worker service simply overrides the entry command (`node src/worker.js`) and defines a dedicated process health check (`ps aux | grep worker.js`) rather than inheriting the HTTP port 3000 API health check.

3. **Strict Network Segregation and Single Host Port Ingress**:
   - **Reason**: The database (`db`) and cache (`redis`) reside strictly on the internal `data` network and are never directly addressable by the frontend or external clients. Only the reverse proxy `gateway` binds to all public interfaces (`0.0.0.0:8080`). Administrative inspection interfaces (RabbitMQ Management, MailHog UI, MinIO Console) are restricted to `127.0.0.1`.

---

## Quickstart (Local)

1. Ensure `.env` is initialized:
   ```bash
   cp .env.example .env
   ```
2. Build and start all 9 services:
   ```bash
   docker compose up -d --build --wait
   ```
3. Run the grading verification suite:
   ```bash
   DC="docker compose" ENV_FILE=.env ./grade.sh
   ```
4. Stop the stack:
   ```bash
   docker compose down
   ```
