#!/usr/bin/env bash
#
# Startup-Automation für den Toolkit-Stack.
#
# Dieses Skript verbindet die einzelnen Deployment-Schritte aus der Dokumentation
# zu einem wiederholbaren Ablauf:
#   * lokale .env-Datei sicherstellen
#   * Nginx-Konfiguration innerhalb des Frontend-Containers rendern
#   * Backend-Port auf den Host binden (damit der Host-Nginx /api-Anfragen weiterleiten kann)
#   * Docker-Compose-Stack bauen und starten
#   * (optional) Host-Nginx als Reverse Proxy konfigurieren und neu laden
#
# Die wichtigsten Parameter können über Umgebungsvariablen gesteuert werden. Alle
# Variablen besitzen sinnvolle Defaults für das Live-Setup auf behamot.de.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

DEV_DOMAIN=${DEV_DOMAIN:-dev.behamot.de}
WWW_DOMAIN=${WWW_DOMAIN:-www.behamot.de}
FRONTEND_PORT=${FRONTEND_PORT:-8080}
BACKEND_PORT=${BACKEND_PORT:-3000}
BACKEND_BIND_ADDRESS=${BACKEND_BIND_ADDRESS:-127.0.0.1}
CERTBOT_WEBROOT=${CERTBOT_WEBROOT:-/var/www/certbot}
LE_LIVE_ROOT=${LE_LIVE_ROOT:-/etc/letsencrypt/live}
DEV_CERT_NAME=${DEV_CERT_NAME:-$DEV_DOMAIN}
WWW_CERT_NAME=${WWW_CERT_NAME:-$WWW_DOMAIN}
NGINX_CONFIG_PATH=${NGINX_CONFIG_PATH:-/etc/nginx/sites-available/behamot.conf}
NGINX_ENABLED_PATH=${NGINX_ENABLED_PATH:-/etc/nginx/sites-enabled/behamot.conf}
GENERATE_HOST_NGINX=${GENERATE_HOST_NGINX:-true}
DOCKER_COMPOSE_OVERRIDE=${DOCKER_COMPOSE_OVERRIDE:-docker-compose.override.yml}

log() {
  printf '[startup] %s\n' "$*"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Fehlende Abhängigkeit: $1" >&2
    exit 1
  fi
}

log "Prüfe Abhängigkeiten"
require_cmd docker
if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose Plugin nicht gefunden (docker compose)." >&2
  exit 1
fi

if [[ "${GENERATE_HOST_NGINX}" == "true" ]]; then
  require_cmd nginx
fi

log ".env-Datei prüfen"
if [[ -x "${REPO_ROOT}/scripts/ensure-env.sh" ]]; then
  (cd "${REPO_ROOT}" && ./scripts/ensure-env.sh)
else
  log "Warnung: ensure-env.sh nicht gefunden oder nicht ausführbar"
fi

log "Render Nginx-Konfiguration im Frontend-Container"
(cd "${REPO_ROOT}" && ./scripts/render-nginx-config.sh "$DEV_DOMAIN" "$WWW_DOMAIN")

log "Erzeuge docker-compose-Override für Backend-Port"
cat > "${REPO_ROOT}/${DOCKER_COMPOSE_OVERRIDE}" <<EOF_OVERRIDE
# Automatisch erzeugt durch server/scripts/startup.sh am $(date -Iseconds)
services:
  backend:
    ports:
      - "${BACKEND_BIND_ADDRESS}:${BACKEND_PORT}:${BACKEND_PORT}"
EOF_OVERRIDE

log "Starte Docker Compose Stack"
export DEV_SERVER_NAME="$DEV_DOMAIN"
export WWW_SERVER_NAME="$WWW_DOMAIN"
export BACKEND_PORT
(cd "${REPO_ROOT}" && docker compose up -d --build)

if [[ "${GENERATE_HOST_NGINX}" == "true" ]]; then
  log "Bereite Host-Nginx-Konfiguration vor"
  mkdir -p "$(dirname "${NGINX_CONFIG_PATH}")"
  mkdir -p "$(dirname "${NGINX_ENABLED_PATH}")"
  mkdir -p "$CERTBOT_WEBROOT"

  DEV_CERT_DIR="${LE_LIVE_ROOT}/${DEV_CERT_NAME}"
  WWW_CERT_DIR="${LE_LIVE_ROOT}/${WWW_CERT_NAME}"

  DEV_HTTPS_BLOCK=""
  if [[ -f "${DEV_CERT_DIR}/fullchain.pem" && -f "${DEV_CERT_DIR}/privkey.pem" ]]; then
    DEV_HTTPS_BLOCK=$(cat <<EOF
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DEV_DOMAIN};

    ssl_certificate     ${DEV_CERT_DIR}/fullchain.pem;
    ssl_certificate_key ${DEV_CERT_DIR}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location ^~ /.well-known/acme-challenge/ {
        root ${CERTBOT_WEBROOT};
        default_type "text/plain";
        try_files \$uri =404;
    }

    location / {
        proxy_pass http://behamot_frontend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
    }

    location /api/ {
        proxy_pass http://behamot_backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
    }
}
EOF
)
  else
    log "Warnung: Zertifikate für ${DEV_DOMAIN} nicht gefunden – HTTPS-Block wird übersprungen"
    DEV_HTTPS_BLOCK="# HTTPS-Konfiguration für ${DEV_DOMAIN} ausgelassen (Zertifikate fehlen)"
  fi

  WWW_HTTPS_BLOCK=""
  if [[ -f "${WWW_CERT_DIR}/fullchain.pem" && -f "${WWW_CERT_DIR}/privkey.pem" ]]; then
    WWW_HTTPS_BLOCK=$(cat <<EOF
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${WWW_DOMAIN};

    ssl_certificate     ${WWW_CERT_DIR}/fullchain.pem;
    ssl_certificate_key ${WWW_CERT_DIR}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location ^~ /.well-known/acme-challenge/ {
        root ${CERTBOT_WEBROOT};
        default_type "text/plain";
        try_files \$uri =404;
    }

    location / {
        proxy_pass http://behamot_frontend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
    }
}
EOF
)
  else
    log "Warnung: Zertifikate für ${WWW_DOMAIN} nicht gefunden – HTTPS-Block wird übersprungen"
    WWW_HTTPS_BLOCK="# HTTPS-Konfiguration für ${WWW_DOMAIN} ausgelassen (Zertifikate fehlen)"
  fi

  cat > "$NGINX_CONFIG_PATH" <<EOF_NGINX
# Automatisch erzeugt durch server/scripts/startup.sh am $(date -Iseconds)
# leitet behamot.de Domains auf die Docker-Services weiter

upstream behamot_frontend {
    server 127.0.0.1:${FRONTEND_PORT};
}

upstream behamot_backend {
    server ${BACKEND_BIND_ADDRESS}:${BACKEND_PORT};
}

map \$http_upgrade \$connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;
    listen [::]:80;
    server_name ${DEV_DOMAIN} ${WWW_DOMAIN};

    location ^~ /.well-known/acme-challenge/ {
        root ${CERTBOT_WEBROOT};
        default_type "text/plain";
        try_files \$uri =404;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

${DEV_HTTPS_BLOCK}

${WWW_HTTPS_BLOCK}
EOF_NGINX

  ln -sf "$NGINX_CONFIG_PATH" "$NGINX_ENABLED_PATH"

  log "Teste Nginx-Konfiguration"
  nginx -t

  if command -v systemctl >/dev/null 2>&1; then
    log "Starte Nginx-Reload via systemctl"
    systemctl reload nginx
  else
    log "Starte Nginx-Reload via nginx -s reload"
    nginx -s reload
  fi
fi

log "Startup-Prozess abgeschlossen"
