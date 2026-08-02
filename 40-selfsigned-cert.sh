#!/bin/sh
# Runs via the nginx image's /docker-entrypoint.d/ hook before nginx starts.
# Generates a self-signed TLS certificate on first boot if one isn't present.
# The cert lives in a volume (see docker-compose.yml) so it survives restarts.
set -e

CERT_DIR=/etc/nginx/certs
CRT="$CERT_DIR/selfsigned.crt"
KEY="$CERT_DIR/selfsigned.key"

if [ ! -s "$CRT" ] || [ ! -s "$KEY" ]; then
    echo "[cert] Generating self-signed TLS certificate…"
    mkdir -p "$CERT_DIR"
    openssl req -x509 -nodes -newkey rsa:2048 \
        -keyout "$KEY" -out "$CRT" -days 3650 \
        -subj "/CN=soulscraft" \
        -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
    echo "[cert] Done."
fi
