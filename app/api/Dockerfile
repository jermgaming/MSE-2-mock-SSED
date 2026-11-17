# Use a pinned Node.js base image
FROM node:22.13.0-alpine3.21

# Production environment
ENV NODE_ENV=production

# Set working directory
WORKDIR /app

# Copy dependency information
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev && npm cache clean --force

# Copy application source code
COPY --chown=node:node . .

# Run application as non-root user
USER node

# Backend port
EXPOSE 3000

# API health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Start API server (migration runs first)
CMD ["npm", "start"]