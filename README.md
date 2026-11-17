# CampusHub — Docker Compose stack (9 services)

A campus events platform: React frontend, Express API, background worker,
PostgreSQL, Redis (cache), RabbitMQ (queue), MinIO (object storage) and
MailHog (SMTP sink), fronted by an nginx gateway that is the only public
entry point.

## Services

| Service | Image | Networks | Purpose |
|---|---|---|---|
| gateway | `nginxinc/nginx-unprivileged:1.27-alpine` | frontend, backend, data | reverse proxy, only published port |
| frontend | `campushub/frontend:1.0.0` (build `app/frontend`) | frontend | static React build served by unprivileged nginx |
| api | `campushub/api:1.0.0` (build `app/api`) | backend, data | REST API; runs migrations + seed on start |
| worker | `campushub/api:1.0.0` (same image, `node src/worker.js`) | backend, data | consumes the `registration_emails` queue, sends mail |
| db | `postgres:16-alpine` | data | primary storage (named volume `pgdata`) |
| redis | `redis:7-alpine` | data | events cache (password-protected) |
| rabbitmq | `rabbitmq:3.13-management-alpine` | data | job queue |
| minio | `bitnamilegacy/minio:2025.7.23-debian-12-r5` | data | image storage, bucket `campushub` (named volume `minio-data`) |
| mailhog | `mailhog/mailhog:v1.0.1` | backend | catches all outgoing email |

## Architecture

```
                        host :8080 (0.0.0.0, the only public port)
                                     |
                               [ gateway nginx ]
              frontend net ────────┼─────────────── backend net ─────── data net
                   |                |                  |                  |
              [ frontend ]      [ api ]             [ worker ]     [ db ] [ redis ]
              (nginx, static)      | (migrate+seed on boot)    [ rabbitmq ] [ minio ]
                                    └──── /api/ ────► api         [ mailhog ] (backend)
                                    └──── /storage/ ─► minio:9000/campushub/
```

- `/` is served by the frontend, `/api/` proxies to the API,
  `/storage/` proxies to the MinIO bucket (uploaded event images are public).
- Only the gateway is reachable from outside; the three networks keep the
  frontend away from the data layer and the data layer away from the host.

## Running the stack

```bash
cp .env.example .env      # then edit the placeholder values
docker compose up -d --build --wait
docker compose ps         # all nine services should report healthy
```

Open <http://localhost:8080> (port comes from `GATEWAY_PORT`, default 8080).
The API runs migrations and seeds three events automatically at startup —
check with `docker compose logs api`.

UIs bound to loopback only (local screenshots):

| UI | URL |
|---|---|
| MailHog | http://127.0.0.1:8025 |
| RabbitMQ management | http://127.0.0.1:15672 |
| MinIO console | http://127.0.0.1:9001 |

Data survives `docker compose down` + `up` because `pgdata` and
`minio-data` are named volumes; `docker compose down -v` wipes them.

Grading / verification (from the repo root, `.env` present):

```bash
DC="docker compose" ENV_FILE=.env bash grade.sh
```

> Note on Windows: MinIO removed its `minio/minio` image from Docker Hub, so
> this stack uses the Bitnami MinIO image (same `MINIO_ROOT_USER` /
> `MINIO_ROOT_PASSWORD` env contract, console on :9001 with `MINIO_BROWSER=on`).
> When running `grade.sh` under Git Bash, create `C:\tmp\ch-test.png`
> containing the bytes `fake-image-bytes` first — Git Bash's `/tmp` maps to
> `%TEMP%` but its Windows `curl.exe` resolves `/tmp/...` against `C:\`.
> On Linux/macOS/WSL grade.sh needs no tweaks.

## Design decisions

1. **Multi-stage frontend build.** The React app is built with Node.js in a
   builder stage; only the `dist/` output is copied into an unprivileged
   nginx image. The final image contains no Node.js and no `node_modules`,
   so it stays small, starts fast and has a minimal attack surface.

2. **One API image for two services.** `api` and `worker` share the
   `campushub/api:1.0.0` image; the worker only overrides the command
   (`node src/worker.js`). This halves build time and guarantees both
   services always run the same code. Because the image's HEALTHCHECK probes
   an HTTP endpoint the worker does not serve, the worker overrides it with
   a process-aliveness check (`pgrep`) instead of inheriting it.

3. **Three segmented networks.** `frontend` (gateway↔frontend), `backend`
   (gateway↔api/worker + mailhog) and `data` (persistence and messaging).
   A compromised frontend container cannot even resolve `db` or `redis`,
   and only the gateway touches all three, matching the principle of least
   network access.

4. **Secrets only via `.env` substitution.** No credential appears in
   `docker-compose.yml` or in git; every value is `${VAR}` from `.env`
   (committed only as `.env.example` with placeholders). `depends_on` with
   `condition: service_healthy` for db/redis/rabbitmq/minio means the API
   never starts before its dependencies actually accept connections — its
   migration runs unguarded, so ordering matters.

5. **Named volumes + restart policies + resource limits everywhere.**
   Postgres and MinIO data outlive `down`/`up`, `restart: unless-stopped`
   keeps the stack self-healing, and every service has explicit CPU and
   memory limits so a single runaway service cannot starve the host.

## Development / release extras

- **Dev overrides:** `docker-compose.dev.yml` (bind-mounted source, no
  restart policies, local Postgres port) — merged explicitly with
  `docker compose -f docker-compose.yml -f docker-compose.dev.yml up`.
- **Versioning & release note:** images are tagged `campushub/{api,frontend}:1.0.0`.
  A release is built with `docker compose build`, tagged
  `docker tag campushub/api:1.0.0 registry.example.com/campushub/api:1.0.0`
  and pushed with `docker push registry.example.com/campushub/api:1.0.0`
  (requires a `docker login registry.example.com` first). Retagging
  `:latest` in addition to the immutable version keeps rollbacks possible.
- **Monitoring (how it could be added):** a Prometheus container on the
  `data`/`backend` networks scraping node-exporter-style metrics —
  `postgres_exporter`, `redis_exporter`, `rabbitmq` built-in plugin,
  MinIO's `/minio/v2/metrics` endpoint, and an nginx `stub_status` block on
  the gateway — plus cAdvisor for container CPU/memory and Grafana for
  dashboards; healthchecks already give Docker-native liveness signals.
