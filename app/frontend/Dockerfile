# Stage 1: Build React application
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

# Stage 2: Serve with unprivileged Nginx
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY --from=builder --chown=101:101 /app/dist /usr/share/nginx/html
EXPOSE 8080
USER 101

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
