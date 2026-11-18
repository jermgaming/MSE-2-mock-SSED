FROM node:20-alpine

# Set working directory
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy package definitions for layer caching
COPY package.json ./

# Install production dependencies only
RUN npm install --omit=dev && npm cache clean --force

# Copy application source files with node ownership
COPY --chown=node:node . .

# Switch to non-root node user
USER node

# Expose default API port
EXPOSE 3000

# Healthcheck for the API service
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/api/health || exit 1

# Default command runs migration + seed then starts server
CMD ["npm", "start"]
