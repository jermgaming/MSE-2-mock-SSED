# Stage 1: Build the React application
FROM node:20.18-alpine AS builder

WORKDIR /app

# Copy dependency specifications
COPY package.json ./

# Install all dependencies required for building the Vite React app
RUN npm install

# Copy source code and build the production bundle
COPY . .
RUN npm run build

# Stage 2: Serve using unprivileged Nginx
FROM nginxinc/nginx-unprivileged:1.27-alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy production static assets from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080

# Healthcheck to verify the web server is responding
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
