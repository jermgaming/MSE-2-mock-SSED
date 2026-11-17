
# Stage 1: Build the React application
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy dependency configuration
COPY package.json ./

# Install dependencies
RUN npm install

# Copy application source code
COPY . .

# Build React application
RUN npm run build


# Stage 2: Serve using unprivileged Nginx
FROM nginxinc/nginx-unprivileged:1.27-alpine

# Copy production build from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx listens on port 8080
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
