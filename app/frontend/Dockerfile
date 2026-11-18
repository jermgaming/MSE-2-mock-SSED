# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definitions and install
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Serve the build using unprivileged Nginx
FROM nginxinc/nginx-unprivileged:alpine-slim

# Copy built assets
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Expose non-privileged HTTP port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
