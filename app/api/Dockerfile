# 1. Use Node.js Alpine base image
FROM node:22-alpine

# 2. Set working directory
WORKDIR /app

# 3. Copy package files first
COPY package*.json ./

# 4. Install production dependencies only
RUN npm install --omit=dev

# 5. Copy application source code
COPY --chown=node:node . .

# 6. Run as non-root user
USER node

# 7. Document the API port
EXPOSE 3000

# 8. Check whether the API is healthy
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# 9. Start the API
CMD ["npm", "start"]
