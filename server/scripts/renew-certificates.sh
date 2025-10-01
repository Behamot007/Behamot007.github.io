#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "$PROJECT_ROOT"

if [[ -n "${DOCKER_COMPOSE_BIN:-}" ]]; then
  DOCKER_COMPOSE="${DOCKER_COMPOSE_BIN}"
elif command -v docker-compose >/dev/null 2>&1; then
  DOCKER_COMPOSE="docker-compose"
else
  DOCKER_COMPOSE="docker compose"
fi

DOMAINS_RAW="${CERTBOT_DOMAINS:-dev.behamot.de,www.behamot.de}"
EMAIL="${CERTBOT_EMAIL:-admin@behamot.de}"
WEBROOT="${CERTBOT_WEBROOT:-/var/www/certbot}"

IFS=',' read -r -a DOMAINS <<< "$DOMAINS_RAW"
DOMAIN_ARGS=()
for domain in "${DOMAINS[@]}"; do
  TRIMMED="$(echo "$domain" | xargs)"
  if [[ -n "$TRIMMED" ]]; then
    DOMAIN_ARGS+=("-d" "$TRIMMED")
  fi
done

if [[ ${#DOMAIN_ARGS[@]} -eq 0 ]]; then
  echo "Keine Domains konfiguriert. Setze die Variable CERTBOT_DOMAINS." >&2
  exit 1
fi

CERTBOT_ARGS=("certonly" "--webroot" "-w" "$WEBROOT" "--keep-until-expiring" "--non-interactive" "--agree-tos" "--email" "$EMAIL")
CERTBOT_ARGS+=("${DOMAIN_ARGS[@]}")
if [[ $# -gt 0 ]]; then
  CERTBOT_ARGS+=("$@")
fi

$DOCKER_COMPOSE run --rm \
  -e CERTBOT_EMAIL="$EMAIL" \
  certbot "${CERTBOT_ARGS[@]}"

if FRONTEND_ID="$($DOCKER_COMPOSE ps --status=running -q frontend 2>/dev/null)" && [[ -n "$FRONTEND_ID" ]]; then
  $DOCKER_COMPOSE exec frontend nginx -s reload
else
  echo "Frontend-Container läuft nicht – nginx-Reload übersprungen." >&2
fi
