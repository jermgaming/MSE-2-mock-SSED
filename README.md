# CampusHub

CampusHub is a nine-container local event registration demo. Docker Compose builds the frontend and API, then starts PostgreSQL, Redis, RabbitMQ, S3-compatible object storage, and MailHog behind one Nginx gateway. The object storage container keeps the Compose service name `minio` expected by the app. It uses RustFS because the MinIO image registry is no longer publicly pullable; RustFS exposes the S3 API used by this app.

## Run it

1. Copy `.env.example` to `.env`. The example credentials are for local development; replace them before using this stack in a shared environment.
2. Start the stack with `docker compose up -d --build --wait`.
3. Open `http://localhost:8080`. The gateway port can be changed with `GATEWAY_PORT` in `.env`.
4. Check startup and migration output with `docker compose logs api` and inspect running services with `docker compose ps`.
5. Stop the containers with `docker compose down`. The PostgreSQL and MinIO named volumes remain. To remove persisted data too, run `docker compose down -v`.

Only the gateway is published on all host interfaces. MailHog’s web UI, RabbitMQ’s management UI, and the MinIO console are not published; services communicate over private Compose networks.

## Services and request path

```text
Browser :8080 -> gateway (Nginx)
                   |-- /         -> frontend (static React build)
                   |-- /api/     -> API -> PostgreSQL, Redis, RabbitMQ, S3 store
                   `-- /storage/ -> public event-image objects

API registration -> RabbitMQ -> worker -> MailHog SMTP
```

The API runs database migration and seed creation before it starts listening. It also creates the `campushub` bucket in the S3-compatible store. Event images up to 4 MB are accepted by the API; Nginx allows 5 MB request bodies.

## Design decisions

1. **Separate frontend build and runtime stages.** Node and build dependencies stay in the build stage; the final frontend image serves static files from unprivileged Nginx.
2. **Share one API image between API and worker.** The worker overrides the command and disables the API-specific health check, keeping the image consistent without probing an endpoint it does not serve.
3. **Use three private networks and named data volumes.** The gateway reaches only frontend and API/storage; app services reach their required backends; PostgreSQL and MinIO keep data across container recreation.

## Useful endpoints

- `GET /api/health` — API, database, and Redis health through the gateway.
- `GET /api/events` — seeded events; subsequent requests are served from Redis briefly.
- `POST /api/events/:id/register` — queues a registration confirmation for MailHog.
- `POST /api/events/:id/image` — multipart image upload, returned under `/storage/`.
