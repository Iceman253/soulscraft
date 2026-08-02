#!/usr/bin/env bash
#
# install-native.sh
# ─────────────────
# Installs Soulscraft directly with nginx — NO Docker. Ideal for a plain
# Debian/Ubuntu Proxmox LXC: no nesting, no AppArmor changes, no runc.
# Run as root inside the container (or VM):
#
#   bash -c "$(curl -fsSL https://raw.githubusercontent.com/Iceman253/soulscraft/master/deploy/install-native.sh)"
#
# or from a checkout:
#
#   bash deploy/install-native.sh
#
# Env overrides:
#   REPO_URL     Git repo to deploy                 [github.com/Iceman253/soulscraft]
#   SERVER_NAME  Hostname for nginx + the cert      [<container-hostname>.local]
#   APP_DIR      Source checkout dir                [/opt/soulscraft]
#   WEB_ROOT     Where the built files are served   [/var/www/soulscraft]
#   AUDIT_FIX    Vulnerability repair before build: safe (default) | force | off
#                'force' allows major-version bumps that may break the build.
#
# Tip: give the container >=1 GB RAM (2 GB comfortable) — the Vite build is the
# heaviest step and can OOM on 512 MB.
#
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/Iceman253/soulscraft.git}"
SERVER_NAME="${SERVER_NAME:-$(hostname).local}"
APP_DIR="${APP_DIR:-/opt/soulscraft}"
WEB_ROOT="${WEB_ROOT:-/var/www/soulscraft}"
CERT_DIR="/etc/nginx/certs"

msg() { echo -e "\e[1;32m[+]\e[0m $*"; }
die() { echo -e "\e[1;31m[x]\e[0m $*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Please run as root."

export DEBIAN_FRONTEND=noninteractive
msg "Installing nginx, git, openssl, Node, and avahi (.local names)…"
apt-get update -qq
apt-get install -y -qq ca-certificates curl git openssl nginx avahi-daemon >/dev/null

# Node 22 (via NodeSource) — needed only to build the static bundle.
# Vite requires Node >= 20.19; Debian's packaged Node (18) is too old, so we
# check the MAJOR version, not just presence, and replace it if it's stale.
NODE_MAJOR=0
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -v 2>/dev/null | sed 's/^v\([0-9]*\).*/\1/')"
  [ -n "$NODE_MAJOR" ] || NODE_MAJOR=0
fi
if [ "$NODE_MAJOR" -lt 20 ]; then
  msg "Installing Node.js 22 (current: $(node -v 2>/dev/null || echo none))…"
  # Remove any distro nodejs/npm first — they conflict with the NodeSource package.
  apt-get purge -y -qq nodejs npm >/dev/null 2>&1 || true
  apt-get autoremove -y -qq >/dev/null 2>&1 || true
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null 2>&1
  apt-get install -y -qq nodejs >/dev/null
  msg "Node is now $(node -v)."
fi

# Fetch / update source.
if [ -d "$APP_DIR/.git" ]; then
  msg "Updating existing checkout in ${APP_DIR}…"
  git -C "$APP_DIR" pull --ff-only
else
  msg "Cloning ${REPO_URL} → ${APP_DIR}…"
  rm -rf "$APP_DIR"
  git clone --depth 1 "$REPO_URL" "$APP_DIR"
fi

# Install dependencies.
msg "Installing dependencies (npm ci)…"
cd "$APP_DIR"
npm ci

# Security: repair known vulnerabilities before building. Controlled by AUDIT_FIX:
#   safe  (default) — non-breaking fixes only
#   force           — allow major-version bumps that may break the build
#   off             — skip entirely
case "${AUDIT_FIX:-safe}" in
  off)
    msg "Skipping npm audit fix (AUDIT_FIX=off)." ;;
  force)
    msg "Running npm audit fix --force (may introduce breaking changes)…"
    npm audit fix --force || true ;;
  *)
    msg "Running npm audit fix (non-breaking)…"
    npm audit fix || true ;;
esac

# Build.
msg "Building the app (npm run build)…"
npm run build

# Publish the static files.
msg "Publishing to ${WEB_ROOT}…"
rm -rf "$WEB_ROOT"
mkdir -p "$WEB_ROOT"
cp -r dist/* "$WEB_ROOT/"

# Self-signed cert (so the app is a secure context → crypto.randomUUID works).
if [ ! -s "$CERT_DIR/selfsigned.crt" ] || [ ! -s "$CERT_DIR/selfsigned.key" ]; then
  msg "Generating self-signed certificate for ${SERVER_NAME}…"
  mkdir -p "$CERT_DIR"
  openssl req -x509 -nodes -newkey rsa:2048 \
    -keyout "$CERT_DIR/selfsigned.key" -out "$CERT_DIR/selfsigned.crt" -days 3650 \
    -subj "/CN=${SERVER_NAME}" \
    -addext "subjectAltName=DNS:${SERVER_NAME},DNS:localhost,IP:127.0.0.1"
fi

# nginx site — HTTP→HTTPS redirect + SPA fallback + asset caching.
msg "Configuring nginx…"
cat > /etc/nginx/sites-available/soulscraft <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${SERVER_NAME} _;
    location / { return 301 https://\$host\$request_uri; }
}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name ${SERVER_NAME} _;

    ssl_certificate     ${CERT_DIR}/selfsigned.crt;
    ssl_certificate_key ${CERT_DIR}/selfsigned.key;
    ssl_protocols       TLSv1.2 TLSv1.3;

    root ${WEB_ROOT};
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/javascript application/json
               image/svg+xml application/xml font/woff2;

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    location = /index.html {
        add_header Cache-Control "no-cache";
    }
}
NGINX

ln -sf /etc/nginx/sites-available/soulscraft /etc/nginx/sites-enabled/soulscraft
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
systemctl enable nginx >/dev/null 2>&1 || true

IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
echo
msg "Done — Soulscraft is served WITHOUT Docker. 🎲"
echo "    https://${SERVER_NAME}      (via mDNS — works on devices that support .local)"
echo "    https://${IP:-<host-ip>}    (always works)"
echo
echo "    Self-signed cert — accept the one-time browser warning (Advanced → Proceed)."
echo "    Update later with:  bash ${APP_DIR}/deploy/install-native.sh"
