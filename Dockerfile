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
# Serves the compiled static site with nginx. No backend — all state is in the
# browser's localStorage, so a plain static server is all that's needed.
FROM nginx:1.27-alpine AS serve

# SPA-aware nginx config (history fallback + asset caching + gzip).
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built assets.
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
