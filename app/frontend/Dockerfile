# Stage 1 — build the React application with Vite.
# Node.js and node_modules exist only in this stage.
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
# No package-lock.json is committed, so npm ci cannot be used.
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

# Stage 2 — serve the static build with unprivileged nginx.
# The final image contains no Node.js and no node_modules.
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/ || exit 1
EXPOSE 8080
