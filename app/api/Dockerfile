# Pinned Node.js 20 Alpine image
FROM node:20.18-alpine

WORKDIR /app
ENV NODE_ENV=production

# Copy package definition first for efficient layer caching
COPY --chown=node:node package.json ./

# Install only production dependencies
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

# Copy application source code
COPY --chown=node:node src ./src

# Run container as non-root user
USER node

EXPOSE 3000

# Healthcheck targeting the /api/health endpoint
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Default startup command (runs database migrations/seed, then starts server)
CMD ["npm", "start"]
