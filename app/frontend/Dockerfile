# Build stage: Compile the React frontend with Vite
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application files and build
COPY . .
RUN npm run build

# Runtime stage: Serve static assets with unprivileged Nginx
FROM nginxinc/nginx-unprivileged:alpine

# Copy compiled static files
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose unprivileged HTTP port
EXPOSE 8080

# Health check to ensure Nginx is serving the frontend
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8080/ || exit 1

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
