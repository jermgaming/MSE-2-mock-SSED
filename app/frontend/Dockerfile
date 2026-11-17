# Stage 1: Build frontend
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build production files
RUN npm run build


# Stage 2: Nginx production server
FROM nginxinc/nginx-unprivileged:1.27-alpine

# Copy frontend build
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx unprivileged port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1