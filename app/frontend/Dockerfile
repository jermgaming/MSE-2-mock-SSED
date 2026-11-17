# Stage 1: Build the React application
FROM node:22.13.0-alpine3.21 AS build

WORKDIR /app

# Copy dependency configuration
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy frontend source code
COPY . .

# Generate production build
RUN npm run build


# Stage 2: Serve the application using unprivileged Nginx
FROM nginxinc/nginx-unprivileged:1.27.4-alpine

# Copy production build
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Nginx unprivileged image listens on port 8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]