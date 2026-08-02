# syntax=docker/dockerfile:1

# ── Build stage ───────────────────────────────────────────────────────────────
# Compiles the Vite + React app to static assets in /app/dist.
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies first for better layer caching.
COPY package.json package-lock.json ./
RUN npm ci

# Build the app (tsc -b && vite build).
COPY . .
RUN npm run build

# ── Serve stage ───────────────────────────────────────────────────────────────
# Serves the compiled static site with nginx over HTTPS. No backend — all state
# is in the browser's localStorage. HTTPS is required so the browser treats the
# app as a secure context (crypto.randomUUID, etc.) when accessed by IP on a LAN.
FROM nginx:1.27-alpine AS serve

# openssl is used by the entrypoint hook to generate the self-signed cert.
RUN apk add --no-cache openssl

# SPA-aware nginx config (HTTPS + HTTP→HTTPS redirect, history fallback, caching).
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Self-signed cert generator — nginx runs /docker-entrypoint.d/*.sh before start.
COPY 40-selfsigned-cert.sh /docker-entrypoint.d/40-selfsigned-cert.sh
RUN chmod +x /docker-entrypoint.d/40-selfsigned-cert.sh

# Copy the built assets.
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
