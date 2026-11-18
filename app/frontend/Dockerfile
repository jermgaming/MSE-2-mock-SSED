# Stage 1: Build React application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definition
COPY package.json ./

# Install dependencies (including devDependencies required for Vite build)
RUN npm install

# Copy application source code
COPY . .

# Build the production static assets
RUN npm run build

# Stage 2: Serve static assets with unprivileged Nginx
FROM nginxinc/nginx-unprivileged:1.27-alpine

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Run as non-root user (nginx UID 101)
USER 101

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
