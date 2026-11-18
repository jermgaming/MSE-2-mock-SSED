FROM node:20-alpine

# Set environment to production
ENV NODE_ENV=production

WORKDIR /app

# Install production dependencies only, leveraging Docker cache
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy application source code
COPY . .

# Run as non-root user (node user is built into node-alpine images)
USER node

# Default port
EXPOSE 3000

# API Health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

# Default command
CMD ["npm", "start"]
