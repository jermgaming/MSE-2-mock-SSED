# Production Node.js Alpine base image
FROM node:20-alpine

# Set working directory and assign ownership to node user
WORKDIR /app
RUN chown node:node /app

# Set production environment
ENV NODE_ENV=production

# Copy package manifests with non-root ownership
COPY --chown=node:node package*.json ./

# Switch to non-root user before installing dependencies
USER node
RUN npm install --omit=dev --ignore-scripts && npm cache clean --force

# Copy application source code with non-root ownership
COPY --chown=node:node src/ ./src/

# Expose default API port
EXPOSE 3000

# Health check for API service
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

# Default command: runs migration & seed, then starts Express server
CMD ["npm", "start"]
