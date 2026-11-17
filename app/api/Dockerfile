# Single Dockerfile for API and worker services
FROM node:20.18.0-alpine

WORKDIR /app

# Cache dependencies and install production dependencies only
COPY --chown=node:node package*.json ./
RUN npm install --omit=dev && npm cache clean --force && rm -rf /root/.npm

# Copy application source code
COPY --chown=node:node . .

# Run container as non-root user
USER node

EXPOSE 3000

# API healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Default command
CMD ["npm", "start"]
