#!/usr/bin/env bash
#
# proxmox-lxc-setup.sh
# ────────────────────
# Creates a Debian 12 LXC container on a Proxmox VE host, installs Docker,
# and deploys Soulscraft into it. Run this ON THE PROXMOX HOST as root.
#
#   bash deploy/proxmox-lxc-setup.sh
#
# Everything is configurable via environment variables (defaults in brackets):
#
#   CTID            Container ID                       [next free id]
#   CT_HOSTNAME     Container hostname                 [soulscraft]
#   DISK_GB         Root disk size in GB               [4]
#   CORES           CPU cores                          [1]
#   RAM_MB          Memory in MB                       [512]
#   BRIDGE          Network bridge                     [vmbr0]
#   STORAGE         Storage pool for the rootfs        [local-lvm]
#   TEMPLATE_STORE  Storage pool holding CT templates  [local]
#   REPO_URL        Git repo to deploy                 [github.com/Iceman253/soulscraft]
#   HOST_PORT       Port the app is published on       [8080]
#   CT_PASSWORD     root password inside the container [random, printed at end]
#   UNPRIVILEGED    1 = unprivileged container         [1]
#
# Example:
#   CTID=250 RAM_MB=1024 HOST_PORT=80 bash deploy/proxmox-lxc-setup.sh
#
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
CT_HOSTNAME="${CT_HOSTNAME:-soulscraft}"
DISK_GB="${DISK_GB:-4}"
CORES="${CORES:-1}"
RAM_MB="${RAM_MB:-512}"
BRIDGE="${BRIDGE:-vmbr0}"
STORAGE="${STORAGE:-local-lvm}"
TEMPLATE_STORE="${TEMPLATE_STORE:-local}"
REPO_URL="${REPO_URL:-https://github.com/Iceman253/soulscraft.git}"
HOST_PORT="${HOST_PORT:-8080}"
UNPRIVILEGED="${UNPRIVILEGED:-1}"
CT_PASSWORD="${CT_PASSWORD:-$(openssl rand -base64 12 2>/dev/null || echo "soulscraft$(date +%s)")}"

msg()  { echo -e "\e[1;32m[+]\e[0m $*"; }
warn() { echo -e "\e[1;33m[!]\e[0m $*"; }
die()  { echo -e "\e[1;31m[x]\e[0m $*" >&2; exit 1; }

# ── Preflight ─────────────────────────────────────────────────────────────────
command -v pct   >/dev/null 2>&1 || die "'pct' not found — run this on a Proxmox VE host as root."
command -v pveam >/dev/null 2>&1 || die "'pveam' not found — is this a Proxmox VE host?"
[ "$(id -u)" -eq 0 ] || die "Must run as root."

CTID="${CTID:-$(pvesh get /cluster/nextid 2>/dev/null || echo 200)}"
msg "Using container ID: ${CTID}"

if pct status "$CTID" >/dev/null 2>&1; then
  die "Container ${CTID} already exists. Set CTID=<free id> or remove it first."
fi

# ── Ensure a Debian 12 template is available ──────────────────────────────────
msg "Refreshing template catalog…"
pveam update >/dev/null 2>&1 || warn "pveam update failed (continuing with cached list)."

TEMPLATE="$(pveam available --section system 2>/dev/null \
  | awk '/debian-12-standard/ {print $2}' | sort -V | tail -n1)"
[ -n "$TEMPLATE" ] || die "Could not find a debian-12-standard template in the catalog."

if ! pveam list "$TEMPLATE_STORE" 2>/dev/null | grep -q "$TEMPLATE"; then
  msg "Downloading template ${TEMPLATE} to ${TEMPLATE_STORE}…"
  pveam download "$TEMPLATE_STORE" "$TEMPLATE"
else
  msg "Template ${TEMPLATE} already present."
fi
TEMPLATE_REF="${TEMPLATE_STORE}:vztmpl/${TEMPLATE}"

# ── Create the container ──────────────────────────────────────────────────────
msg "Creating LXC ${CTID} (${CT_HOSTNAME}: ${CORES} core / ${RAM_MB}MB / ${DISK_GB}GB)…"
pct create "$CTID" "$TEMPLATE_REF" \
  --hostname "$CT_HOSTNAME" \
  --cores "$CORES" \
  --memory "$RAM_MB" \
  --swap "$RAM_MB" \
  --rootfs "${STORAGE}:${DISK_GB}" \
  --net0 "name=eth0,bridge=${BRIDGE},ip=dhcp" \
  --features "nesting=1,keyctl=1" \
  --unprivileged "$UNPRIVILEGED" \
  --password "$CT_PASSWORD" \
  --onboot 1

msg "Starting container…"
pct start "$CTID"

# Wait for network / DHCP lease.
msg "Waiting for network…"
for _ in $(seq 1 30); do
  if pct exec "$CTID" -- sh -c 'command -v ip >/dev/null 2>&1 && ip route get 1.1.1.1' >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

# ── Provision inside the container ────────────────────────────────────────────
msg "Installing Docker + deploying Soulscraft inside the container…"
pct exec "$CTID" -- bash -euo pipefail -c "
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl git >/dev/null

  # Official Docker convenience installer (includes the compose plugin).
  if ! command -v docker >/dev/null 2>&1; then
    curl -fsSL https://get.docker.com | sh
  fi
  systemctl enable --now docker

  rm -rf /opt/soulscraft
  git clone --depth 1 '${REPO_URL}' /opt/soulscraft
  cd /opt/soulscraft
  HOST_PORT='${HOST_PORT}' docker compose up -d --build
"

# ── Report ────────────────────────────────────────────────────────────────────
IP="$(pct exec "$CTID" -- hostname -I 2>/dev/null | awk '{print $1}')"
echo
msg "Soulscraft is deployed! 🎲"
echo "    Container : ${CTID} (${CT_HOSTNAME})"
echo "    URL       : http://${IP:-<container-ip>}:${HOST_PORT}"
echo "    root pw   : ${CT_PASSWORD}"
echo
echo "  Update later with:"
echo "    pct exec ${CTID} -- bash -c 'cd /opt/soulscraft && git pull && HOST_PORT=${HOST_PORT} docker compose up -d --build'"
