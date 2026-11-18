# CampusHub — Dockerized Application

CampusHub is a containerized event management application built using Docker and Docker Compose. It uses a multi-service architecture with a React frontend, Node.js API, background worker, PostgreSQL, Redis, RabbitMQ, S3-compatible object storage, and MailHog.

## Architecture

```text
                 Browser
                    |
              Gateway (8080)
                 /      \
                /        \
          Frontend       API
          (React)      (Node.js)
                          |
             +------------+-------------+
             |            |             |
          PostgreSQL    Redis        RabbitMQ
                                       |
                                     Worker
                                       |
                                    MailHog

                 API
                  |
             S3-compatible
              SILO Storage
```

## Services

| Service | Technology | Purpose |
|---|---|---|
| Gateway | Nginx Unprivileged | Routes frontend, API and storage requests |
| Frontend | React + Vite + Nginx | User interface |
| API | Node.js + Express | Application backend and REST APIs |
| Worker | Node.js | Processes registration email jobs |
| Database | PostgreSQL 16 | Stores events and registrations |
| Cache | Redis 7 | Caches event data |
| Message Broker | RabbitMQ | Queues registration email jobs |
| Object Storage | SILO | S3-compatible file storage |
| Email Testing | MailHog | Captures test emails |

## Prerequisites

- Docker Desktop
- Docker Compose
- Git

## Setup

1. Clone the repository.
2. Copy `.env.example` to `.env`.
3. Update the local environment variables if required.
4. Start the application:

```bash
docker compose up -d --build --wait --wait-timeout 180
```

Check services:

```bash
docker compose ps
```

## Access URLs

- Application: http://localhost:8080
- API Health: http://localhost:8080/api/health
- Events API: http://localhost:8080/api/events
- MailHog UI: http://localhost:8025
- RabbitMQ Management: http://localhost:15672
- SILO Console: http://localhost:9001

Management interfaces are bound to localhost only. The Gateway is the only publicly exposed service port.

## Docker Commands

Build images:

```bash
docker compose build
```

Start services:

```bash
docker compose up -d
```

View running services:

```bash
docker compose ps
```

View logs:

```bash
docker compose logs -f
```

Stop services without deleting persistent volumes:

```bash
docker compose down
```

## Design Decisions

1. **Multi-stage frontend build:** Node.js is used only for building the React application. The final frontend image uses unprivileged Nginx, reducing the runtime image and avoiding Node.js in production.

2. **Shared API and Worker image:** Both services use the same API image. The Worker overrides the default command to execute `node src/worker.js`, avoiding duplicate image builds.

3. **Network isolation and persistence:** Separate frontend, backend and data networks limit unnecessary service communication. PostgreSQL and SILO use named volumes so data survives container recreation.

## Security

- Services run as non-root users where applicable.
- Environment variables are supplied through `.env`.
- `.env` is excluded from Git.
- `.dockerignore` prevents secrets and unnecessary files from entering build contexts.
- Only the Gateway is exposed on all host interfaces.

## Verification

The project can be verified using:

```bash
docker compose up -d --build --wait --wait-timeout 180
docker compose ps
```

The application supports event listing, Redis caching, registration processing through RabbitMQ, email testing with MailHog, and image upload and retrieval through S3-compatible storage.

## Stop the Application

```bash
docker compose down
```

Named volumes are preserved unless `-v` is explicitly supplied.