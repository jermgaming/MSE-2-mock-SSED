# CampusHub API image.
# One image serves both the api and the worker service: the worker overrides
# the command (node src/worker.js) in docker-compose.yml.
FROM node:20-alpine

# Unprivileged runtime user.
RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

# Copy the manifests first so dependency installation has its own,
# cacheable layer below the frequently changing source code.
COPY package*.json ./

# No package-lock.json is committed, so npm ci cannot be used.
# Production dependencies only; the npm cache is removed afterwards to
# keep the image well under the 250 MB budget.
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

# Application code, owned by the non-root user.
COPY --chown=appuser:appgroup . .

USER appuser

# /api/health becomes available once migration, seed and the server are up.
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider "http://127.0.0.1:${PORT:-3000}/api/health" || exit 1

EXPOSE 3000
CMD ["npm", "start"]
