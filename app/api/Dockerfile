
# Stage 1: Install production dependencies
FROM node:22.16.0-alpine3.22 AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev --no-audit --no-fund \
    && npm cache clean --force

COPY src/ ./src/


# Stage 2: Minimal non-root runtime
FROM gcr.io/distroless/nodejs22-debian13:nonroot

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder --chown=nonroot:nonroot /app/node_modules ./node_modules
COPY --from=builder --chown=nonroot:nonroot /app/src ./src
COPY --from=builder --chown=nonroot:nonroot /app/package.json ./package.json

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["/nodejs/bin/node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["src/start.js"]