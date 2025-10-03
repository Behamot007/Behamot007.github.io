# Dev Backend

Der Dev-Backend-Service konsolidiert alle serverseitigen APIs für das Toolkit. Er basiert auf Node.js/Express und stellt Spotify- und OpenAI-Hilfsendpunkte sowie CRUD-Funktionen für den Anime-Datensatz bereit.

## Externe Abhängigkeiten

- **PostgreSQL** – Wird perspektivisch für persistente Features vorbereitet. In `docker-compose.yml` ist ein vorkonfigurierter `postgres`-Service enthalten (Default-Login `app`/`change-me`).
- **Spotify Web API** – Für Playlist-Importe, Token-Austausch und Client-Credential-Flows. Benötigt `SPOTIFY_CLIENT_ID` und `SPOTIFY_CLIENT_SECRET`.
- **OpenAI API** – Für Chat-Completion-Features (`/api/openai/*`). Benötigt `OPENAI_API_KEY` und optional `OPENAI_DEFAULT_MODEL`.

## Umgebungsvariablen

Die wichtigsten Variablen werden sowohl aus `.env` (über `loadEnvFile()` in `server.js`) als auch über Docker Compose durchgereicht.

| Variable | Beschreibung | Default |
|----------|--------------|---------|
| `PORT` | Port, auf dem das Backend lauscht. | `3000` |
| `DATASET_PATH` | Pfad zur JSONL-Datei mit den Anime-Charakteren. | `dataset/characters.jsonl` |
| `SPOTIFY_CLIENT_ID` | Spotify Client-ID für API-Aufrufe. | – |
| `SPOTIFY_CLIENT_SECRET` | Spotify Client-Secret für Token-Exchanges. | – |
| `OPENAI_API_KEY` | Secret für die OpenAI API. | – |
| `OPENAI_DEFAULT_MODEL` | Vorbelegtes OpenAI-Modell. | `gpt-4o-mini` |
| `BACKEND_API_TOKEN` | Optionaler Token für aufrufende Clients (kann per Reverse-Proxy erzwungen werden). | – |

Weitere Compose-Variablen (`POSTGRES_*`, `FRONTEND_BACKEND_API_BASE`) werden im Repository-Root erläutert.

## Lokale Entwicklung

```bash
# Abhängigkeiten installieren (einmalig)
npm install

# Backend im Entwicklungsmodus starten
npm run start
```

> Tipp: Die Kommandos müssen im Verzeichnis `projects/dev-backend/anime-dataset` ausgeführt werden.

Für einen Docker-gestützten Workflow:

```bash
# Backend + Frontend + Postgres starten
BACKEND_API_TOKEN=devtoken docker compose up -d --build

# Logs beobachten
docker compose logs -f backend
```

Der Datensatz liegt standardmäßig unter `dataset/characters.jsonl`. Über das bind-mount `./projects/dev-backend/anime-dataset/dataset:/app/dataset` bleiben Änderungen lokal erhalten.

## Zusätzliche Services

- `twitch-chat-controller/`: Separates Express-Backend, das einen Twitch-Bot verwaltet, Chatnachrichten per SSE streamt und einen OAuth-Test-Flow bereitstellt. Die zugehörige Oberfläche befindet sich unter `projects/sites/dev/services/twitch-bot`.
