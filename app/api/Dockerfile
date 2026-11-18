# Use lightweight Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first for Docker caching
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev && npm cache clean --force

# Copy application source code
COPY src/ ./src/

# Run as non-root user
USER node

# API port
EXPOSE 3000

# API health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 CMD wget -q -O /dev/null http://127.0.0.1:3000/api/health || exit 1

# Default command: migration, seed and start API
CMD ["npm", "start"]
