#!/bin/sh
set -eu

APP_DIR="/opt/app"
RENDER_SCRIPT="$APP_DIR/scripts/render-nginx-config.sh"
OUTPUT_FILE="$APP_DIR/docker/nginx/default.conf"

DEV_SERVER_NAME="${DEV_SERVER_NAME:-dev.localhost}"
WWW_SERVER_NAME="${WWW_SERVER_NAME:-www.localhost}"

if [ ! -x "$RENDER_SCRIPT" ]; then
  echo "Render script $RENDER_SCRIPT not found or not executable" >&2
  exit 1
fi

cd "$APP_DIR"
"$RENDER_SCRIPT" "$DEV_SERVER_NAME" "$WWW_SERVER_NAME"
cp "$OUTPUT_FILE" /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"
