# Stage 1: Build React application
FROM node:20.18-alpine3.20 AS builder

WORKDIR /app

# Copy dependency definition
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Serve using unprivileged Nginx
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runner

# Copy customized Nginx configuration
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Expose non-privileged HTTP port
EXPOSE 8080

# Switch to non-root user
USER nginx

# Container healthcheck
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]

