FROM node:20.18-alpine3.20

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy package definitions for optimal layer caching
COPY package.json package-lock.json* ./

# Install production dependencies only and clear cache
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

# Copy application source code with non-root ownership
COPY --chown=node:node . .

# Run as non-root user
USER node

# Expose internal API port
EXPOSE 3000

# API healthcheck verifying database and redis connectivity
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

# Default command runs database migrations/seed, then starts the API server
CMD ["npm", "start"]

