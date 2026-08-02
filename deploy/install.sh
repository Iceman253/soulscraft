#!/usr/bin/env bash
#
# install.sh
# ──────────
# Installs Soulscraft INSIDE an existing Debian/Ubuntu LXC container or VM.
# Use this when you've already created the container through the Proxmox web UI.
# Run as root inside the container:
#
#   bash -c "$(curl -fsSL https://raw.githubusercontent.com/Iceman253/soulscraft/master/deploy/install.sh)"
#
# or, from a checkout:
#
#   bash deploy/install.sh
#
# Env overrides:
#   REPO_URL    Git repo to deploy       [github.com/Iceman253/soulscraft]
#   HTTP_PORT   Published HTTP port      [80]  (redirects to HTTPS)
#   HTTPS_PORT  Published HTTPS port     [443]
#   APP_DIR     Install directory        [/opt/soulscraft]
#
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/Iceman253/soulscraft.git}"
HTTP_PORT="${HTTP_PORT:-80}"
HTTPS_PORT="${HTTPS_PORT:-443}"
APP_DIR="${APP_DIR:-/opt/soulscraft}"

msg() { echo -e "\e[1;32m[+]\e[0m $*"; }
die() { echo -e "\e[1;31m[x]\e[0m $*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Please run as root (sudo)."

export DEBIAN_FRONTEND=noninteractive
msg "Installing prerequisites…"
apt-get update -qq
apt-get install -y -qq ca-certificates curl git >/dev/null

if ! command -v docker >/dev/null 2>&1; then
  msg "Installing Docker…"
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker >/dev/null 2>&1 || true

if [ -d "$APP_DIR/.git" ]; then
  msg "Updating existing checkout in ${APP_DIR}…"
  git -C "$APP_DIR" pull --ff-only
else
  msg "Cloning ${REPO_URL} → ${APP_DIR}…"
  rm -rf "$APP_DIR"
  git clone --depth 1 "$REPO_URL" "$APP_DIR"
fi

msg "Building & starting the container…"
cd "$APP_DIR"
HTTP_PORT="$HTTP_PORT" HTTPS_PORT="$HTTPS_PORT" docker compose up -d --build

IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
URL_HOST="${IP:-<this-host-ip>}"
[ "$HTTPS_PORT" = "443" ] && URL="https://${URL_HOST}" || URL="https://${URL_HOST}:${HTTPS_PORT}"
echo
msg "Done! Open Soulscraft at:  ${URL}"
echo "    It uses a self-signed certificate — your browser will warn once;"
echo "    choose \"Advanced → Proceed\" to continue. HTTPS is required so the app"
echo "    runs in a secure context (fixes crypto.randomUUID on a LAN IP)."
