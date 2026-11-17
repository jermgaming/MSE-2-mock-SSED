
# Use a lightweight Node.js image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy dependency files first for caching
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev && npm cache clean --force

# Copy application source
COPY src ./src

# Set permissions for non-root user
RUN chown -R node:node /app

# Run as non-root user
USER node

# API port
EXPOSE 3000

# Check API health
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Default API command
CMD ["npm", "start"]
