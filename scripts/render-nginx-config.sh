#!/usr/bin/env bash
set -euo pipefail

TEMPLATE_FILE="docker/nginx/templates/dev_www.conf.tpl"
OUTPUT_FILE="docker/nginx/default.conf"

if [[ $# -ne 2 ]]; then
  echo "Aufruf: $0 <dev-server-name> <www-server-name>" >&2
  exit 1
fi

DEV_SERVER_NAME="$1"
WWW_SERVER_NAME="$2"

if [[ ! -f "$TEMPLATE_FILE" ]]; then
  echo "Vorlage $TEMPLATE_FILE wurde nicht gefunden." >&2
  exit 1
fi

content=$(<"$TEMPLATE_FILE")
content=${content//\{\{DEV_SERVER_NAME\}\}/$DEV_SERVER_NAME}
content=${content//\{\{WWW_SERVER_NAME\}\}/$WWW_SERVER_NAME}

mkdir -p "$(dirname "$OUTPUT_FILE")"
printf '%s\n' "$content" > "$OUTPUT_FILE"

echo "Nginx-Konfiguration nach $OUTPUT_FILE gerendert."
