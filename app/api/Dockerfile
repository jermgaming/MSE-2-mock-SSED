# Dockerfile for CampusHub API and Worker services
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Ensure directory is owned by non-root node user
RUN chown node:node /app

# Run container as non-root user
USER node

# Copy dependency definitions and install production dependencies only
COPY --chown=node:node package*.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

# Copy application source code
COPY --chown=node:node . .

# Expose API port
EXPOSE 3000

# API Healthcheck endpoint
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Default startup command (runs migrations and starts API server)
CMD ["npm", "start"]
