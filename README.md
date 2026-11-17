# CampusHub starter (9-service exam)

The application code in `app/` is complete and works. Do not change it. Your job is the Docker work.

## Service contract
| Service | Image or build | Port | Notes |
|---|---|---|---|
| gateway | nginx-unprivileged | 8080 | only port published to the host |
| frontend | `app/frontend` (multi-stage) | 8080 | static files from `npm run build` (`dist/`) |
| api | `app/api` | 3000 | `npm start` runs migration + seed, then the server |
| worker | same image as api | none | command `node src/worker.js` |
| db | postgres | 5432 | user, password, db name from env |
| redis | redis | 6379 | password required (`REDIS_PASSWORD`) |
| rabbitmq | rabbitmq | 5672 | user and password from env |
| minio | minio | 9000 | bucket `campushub` is created by the API |
| mailhog | mailhog | 1025 SMTP, 8025 UI | |

Gateway routes: `/` to frontend, `/api/` to api, `/storage/` to `minio:9000/campushub/`.
Environment variable names are in `.env.example`. Copy it to `.env` and keep `.env` out of git.

## Student Information
- **Student Name:** Arshad Nazeer
- **Student ID:** 202401100400051
- **Branch:** `Arshad-Nazeer-202401100400051`

