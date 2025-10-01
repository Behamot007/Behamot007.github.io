# Container Deployment Guide

Diese Dokumentation beschreibt, wie das Projekt mithilfe von Docker-Containern bereitgestellt wird. Der Stack besteht aus einem Node.js-Backend (Toolkit-API-Service auf Basis des ehemaligen "anime-dataset" Projekts) und einem statischen Frontend, das via nginx ausgeliefert wird. Die Container werden mit `docker compose` orchestriert.

> **Hinweis:** Alle Riot-/Arena-Tools, der Spotify Play Screen, der Playlist-zu-QR-Generator sowie Debug- und Dataset-Verwaltungen wurden entfernt. Übrig bleiben der Digital Mode, die Kostenkalkulation und der Anime Rätsel Chat.

## Verzeichnisstruktur

- `anime-dataset/`: Node.js-Backend-Service für Spotify-/OpenAI-Bridging sowie den Anime-Datensatz (ohne Frontend-Verwaltung).
- `Dockerfile.frontend`: Build-Anleitung für das nginx-Frontend.
- `anime-dataset/Dockerfile`: Build-Anleitung für den Backend-Service.
- `docker-compose.yml`: Definition der Services, Netzwerke und Volumes.
- `docker/nginx/default.conf`: nginx-Konfiguration mit Proxy-Regeln für `/api`.
- `.env.example`: Vorlage für benötigte Umgebungsvariablen.

## Vorbereitung von Secrets & Umgebungsvariablen

1. Erstelle die lokale `.env` **nur einmalig** aus der Vorlage – entweder manuell oder via Skript:
   ```bash
   # legt die Datei nur an, falls sie noch nicht existiert
   ./scripts/ensure-env.sh
   ```
   Alternativ kann `cp -n .env.example .env` verwendet werden (`-n` verhindert ein Überschreiben bestehender Dateien).
2. Ergänze anschließend alle benötigten Werte (z. B. `BACKEND_API_TOKEN`, `OPENAI_API_KEY`). Bei Updates der Vorlage können Unterschiede mit `diff -u .env .env.example` geprüft und selektiv übernommen werden. Der CI-Deploy schließt `.env*`-Dateien vom `rsync --delete` aus, sodass bestehende Secrets auf dem Server erhalten bleiben.
3. Sensible Dateien sollten **nicht** eingecheckt werden. Das Repository ignoriert `.env*` Dateien bereits über `.gitignore` und `.dockerignore`.
4. Auf dem Server sollten Secrets via `scp` oder einem Secret-Management-Tool (z. B. sops, Ansible Vault, HashiCorp Vault) abgelegt werden. Passe die Dateiberechtigungen an (`chmod 600 .env`).

## Docker-Images bauen und starten

Voraussetzungen: Docker Engine ≥ 24 und Docker Compose Plugin.

```bash
# Images bauen und Container im Hintergrund starten
BACKEND_API_TOKEN=geheim docker compose up -d --build

# Logs prüfen
docker compose logs -f backend
```

Der Befehl `docker compose up -d --build` baut beide Images (`backend`, `frontend`), erstellt die Netzwerke (`internal`, `public`) und startet die Container im Hintergrund. Das Frontend ist anschließend unter `http://localhost:8080` erreichbar. Interne Aufrufe an `/api/*` werden automatisch an den Backend-Service weitergeleitet.

### Datenpersistenz

- Das Backend schreibt den Datensatz nach `/app/dataset/characters.jsonl`. Über das Compose-Volume `./anime-dataset/dataset:/app/dataset` bleiben Änderungen auf dem Host erhalten.
- Alternativ kann ein Docker-Volume verwendet werden:
  ```yaml
  volumes:
    - anime-dataset-data:/app/dataset
  ```

### Persistente PostgreSQL-Datenbank

Für zusätzliche Services, die eine relationale Datenbank benötigen, steht ein vorkonfigurierter PostgreSQL-Container bereit:

```yaml
postgres:
  image: postgres:15
  restart: unless-stopped
  environment:
    POSTGRES_DB: ${POSTGRES_DB:-app}
    POSTGRES_USER: ${POSTGRES_USER:-app}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-change-me}
  volumes:
    - postgres_data:/var/lib/postgresql/data
  ports:
    - "${POSTGRES_PORT:-5432}:5432"
```

- Über das benannte Volume `postgres_data` bleiben Daten über Container-Neustarts hinweg erhalten.
- Mit `restart: unless-stopped` startet der Datenbank-Container automatisch nach einem Server-Reboot.
- Passe die Zugangsdaten in `.env` an und hinterlege starke Passwörter oder verwende ein Secret-Management.
- Für Backups können `pg_dump` oder Automatisierungstools wie `pgBackRest` eingesetzt werden.

## Deployment auf einem Server

1. Repository klonen oder Artefakte per CI/CD bereitstellen.
2. `.env` und ggf. weitere Secret-Dateien (z. B. Zertifikate) via `scp` auf den Server kopieren.
3. Optional: `docker compose pull` verwenden, falls die Images in einer Registry liegen.
4. `docker compose up -d` ausführen.
5. `docker compose ps` bzw. `docker compose logs` zur Überwachung nutzen.

### Reverse Proxy & HTTPS

Für ein öffentliches Deployment empfiehlt sich ein vorgelagerter Reverse Proxy:

- **Traefik**: Container zum `public`-Netzwerk hinzufügen und Labels in `docker-compose.yml` ergänzen.
- **Caddy** oder **Nginx**: Eigenen Proxy-Container starten (ebenfalls im `public`-Netzwerk), der TLS-Zertifikate (z. B. via Let's Encrypt) verwaltet und eingehende Anfragen auf `frontend:80` weiterleitet.
- Achte darauf, HTTPS zu erzwingen und sensible Header (`X-Forwarded-Proto`, `X-Forwarded-For`) zu setzen.

Beispiel für ein zusätzliches Traefik-Label im `frontend`-Service:
```yaml
labels:
  - traefik.enable=true
  - traefik.http.routers.toolkit.rule=Host(`toolkit.example.com`)
  - traefik.http.routers.toolkit.entrypoints=websecure
  - traefik.http.routers.toolkit.tls.certresolver=letsencrypt
```

## Weiterentwicklung & Troubleshooting

- **Lokale Tests**: Mit `docker compose up` ohne `-d` starten, um Logs direkt im Terminal zu verfolgen.
- **Konfigurationsänderungen**: Nach Anpassungen an Dockerfiles oder `docker-compose.yml` den Stack mit `docker compose up -d --build` neu deployen.
- **Backend-Variablen**: `PORT` und `DATASET_PATH` lassen sich via `.env` überschreiben. Zusätzlich werden `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `OPENAI_API_KEY` und `OPENAI_DEFAULT_MODEL` automatisch aus der `.env` in den Backend-Container durchgereicht.
- **Fehlersuche**: `docker compose exec backend sh` öffnet eine Shell im Backend-Container.

Für Erweiterungen (z. B. zusätzliche Services, Worker, Cronjobs) empfiehlt sich, eigene Netzwerke oder Compose-Profile zu definieren. Dokumentiere neue Umgebungsvariablen stets in `.env.example`.
