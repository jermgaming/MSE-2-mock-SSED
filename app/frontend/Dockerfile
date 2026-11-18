# Stage 1: Build React application
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source code
COPY . .

# Build React application
RUN npm run build


# Stage 2: Serve application using unprivileged Nginx
FROM nginxinc/nginx-unprivileged:1.27-alpine

# Copy production build from previous stage
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx unprivileged image listens on port 8080
EXPOSE 8080

# Check whether frontend is responding
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
