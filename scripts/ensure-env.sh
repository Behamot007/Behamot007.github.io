#!/usr/bin/env bash
set -euo pipefail

ENV_FILE=".env"
EXAMPLE_FILE=".env.example"

if [[ ! -f "$EXAMPLE_FILE" ]]; then
  echo "Vorlage $EXAMPLE_FILE wurde nicht gefunden." >&2
  exit 1
fi

if [[ -f "$ENV_FILE" ]]; then
  echo "Bestehende $ENV_FILE gefunden. Datei bleibt unverändert." >&2
  echo "Prüfe Unterschiede mit: diff -u $ENV_FILE $EXAMPLE_FILE || true" >&2
  exit 0
fi

cp "$EXAMPLE_FILE" "$ENV_FILE"
chmod 600 "$ENV_FILE"
echo "$ENV_FILE aus $EXAMPLE_FILE erstellt. Bitte Werte aktualisieren."
