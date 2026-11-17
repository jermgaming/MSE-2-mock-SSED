# Stage 1: Install production dependencies
FROM node:22.23.5-alpine3.24 AS deps

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev --no-audit --no-fund


# Stage 2: Lightweight Distroless runtime
FROM gcr.io/distroless/nodejs22-debian12:nonroot

WORKDIR /app

COPY --from=deps --chown=65532:65532 /app/node_modules ./node_modules

COPY --chown=65532:65532 package.json ./
COPY --chown=65532:65532 src ./src

USER 65532:65532

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD ["/nodejs/bin/node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["src/launcher.js"]
