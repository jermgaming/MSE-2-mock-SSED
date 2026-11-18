# Multi-stage Dockerfile for CampusHub Frontend

# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

# Cache package dependencies
COPY package*.json ./
RUN npm install

# Build production assets
COPY . .
RUN npm run build

# Stage 2: Serve with unprivileged Nginx
FROM nginxinc/nginx-unprivileged:alpine

# Copy static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 8080 (standard unprivileged nginx port)
EXPOSE 8080

# Run as non-root user (inherited from nginxinc/nginx-unprivileged: 101/nginx)
USER 101

# Health check to verify frontend is responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
