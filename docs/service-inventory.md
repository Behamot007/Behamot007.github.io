# Service- & Feature-Inventar

Dieser Überblick fasst alle Navigationsgruppen aus `app.js` samt der zugehörigen Einstiegsseiten, Stylesheets, Skripte und externen/Backend-Anbindungen zusammen. Die Dev-/Legacy-Einträge sind hervorgehoben und als Kandidaten für eine spätere Archivierung markiert.

## Arena Tools

| Feature | Einstieg (HTML) | Styles | Skripte | Backend/Externals | Hinweise |
|---------|-----------------|--------|---------|--------------------|----------|
| Arena Stats | `arena-stats.html` | Umfangreiche Inline-Styles im `<head>` | Inline-Skript block im Dokument | Direktzugriffe auf Riot Account-v1, Summoner-v4, Match-v5 (per `https://.../riot/...`), Data-Dragon Versions- & Champion-Daten | Nutzt `localStorage` (`RIOT_API_KEY`) aus der Standalone-Konfiguration. |
| Arena Match Analyzer | `arena-match-history.html` | Umfangreiche Inline-Styles im `<head>` | Inline-Skript block | Lädt Data-Dragon Versionen, Champions & Items (`https://ddragon...`), verarbeitet lokal exportierte JSON-Datensätze | Kein direkter Backend-Call; reine Clientanalyse importierter Daten. |

## Hitster & Spotify

| Feature | Einstieg (HTML) | Styles | Skripte | Backend/Externals | Hinweise |
|---------|-----------------|--------|---------|--------------------|----------|
| Playlist → QR Cards | `generator.html` | Gemeinsames Stylesheet `styles.css` | `qrcode.min.js` (CDN), `spotify.js`, `openaiClient.js`, `ai.js`, `cards.js`, `debugLog.js`, Inline-Initialisierung | Backend: `/api/spotify/config`, `/api/spotify/token`, `/api/spotify/refresh`, `/api/spotify/playlists/:id/tracks`; OpenAI via `/api/openai/chat`; QR-Code-Rendering über CDN | Benötigt Spotify- und OpenAI-Backend-Konfiguration. |
| Play Screen | `gameModeScan.html` | Inline-Styles | `html5-qrcode` (CDN), `spotify-player.js` (Spotify SDK), `spotify.js`, Inline-Steuerung | Backend: Spotify-Konfig- & Token-Endpunkte aus `spotify.js`; Extern: `https://api.spotify.com/v1/...` für Geräte & Playback | QR-Scanner plus Spotify Remote Control für analoge Sessions. |
| Digital Mode | `gameModeDigital.html` | Umfangreiche Inline-Styles | `qrcode.min.js` (CDN), `spotify.js`, `openaiClient.js`, `ai.js`, umfangreiches Inline-Skript | Backend: `/api/spotify/*` (wie oben), `/api/openai/chat`; Extern: mehrere `https://api.spotify.com/v1/...` Calls | Kombiniert Spotify-Steuerung, KI-Hints & QR-Codes für volldigitales Spiel. |

## Alltag & Planung

| Feature | Einstieg (HTML) | Styles | Skripte | Backend/Externals | Hinweise |
|---------|-----------------|--------|---------|--------------------|----------|
| Kostenkalkulation | `bill-splitter.html` | Eigenes Stylesheet `bill-splitter.css` | `openaiClient.js`, `ai.js`, `bill-splitter.js` | Backend: `/api/openai/chat` (Bon-Scan-Feature); ansonsten rein clientseitige Berechnungen | KI-gestütztes Experiment zum Erkennen von Kassenbons. |

## Anime Charakter

| Feature | Einstieg (HTML) | Styles | Skripte | Backend/Externals | Hinweise |
|---------|-----------------|--------|---------|--------------------|----------|
| Rätsel Chat | `animeCharakterdle.html` | Gemeinsames Stylesheet `styles.css` + kleines Inline-Tuning | `papaparse` (CDN), `openaiClient.js`, `animeCharakterdle.js` | Backend: `/api/openai/chat`; lädt Dataset `anime-dataset/dataset/characters.csv` lokal | Nutzt KI-Chat basierend auf lokalem Charakter-Sample. |
| Dataset Verwaltung | `anime-dataset/public/index.html` | Umfangreiche Inline-Styles | Inline-Module-Skript, zusätzlich simpler Inline-Skript-Block | Backend: `/api/characters` (GET/PUT) für Laden & Persistieren; nutzt `fetch` gegen API | Verwaltungsoberfläche für Datensatz mit direkter Backend-Speicherung. |
| Dataset Guess Game | `anime-dataset/public/game.html` | Inline-Styles | `papaparse` (CDN), Modulskript (importiert `tags.js`) | Lädt CSV aus `anime-dataset/dataset/characters.csv`, keine Backend-Calls | Eigenständiges Ratespiel auf Basis lokaler Daten. |

## Dev / Legacy (nur mit `?dev` oder `?debug` sichtbar)

| Feature | Einstieg (HTML) | Styles | Skripte | Backend/Externals | Status |
|---------|-----------------|--------|---------|--------------------|--------|
| Anidle | `anidle.html` | Inline-Styles | Inline-Skript | Keine externen Abhängigkeiten | **Legacy – Kandidat für Archivierung.** |
| Anidle Debug | `anidleDebug.html` | Inline-Styles | Inline-Skript | Keine externen Abhängigkeiten | **Legacy – Kandidat für Archivierung.** |
| Standalone Konfiguration | `config.html` | Gemeinsames `styles.css` | `spotify.js`, `openaiClient.js`, `pages.js`, `navigation.js`, Inline-Setup | Backend: `/api/spotify/*`, `/api/openai/status`, `/api/openai/chat` (indirekt via Buttons); verwaltet lokalen `RIOT_API_KEY` | **Legacy – Kandidat für Archivierung.** |
| Debug Log | `debugLog.html` | Inline-Styles | `qrcode.min.js` (CDN), `spotify.js`, `openaiClient.js`, `ai.js`, `debugLog.js`, Inline-Hilfen | Backend: `/api/spotify/*`, `/api/openai/chat`; lokale Debug-Storage | **Legacy – Kandidat für Archivierung.** |

## Weitere Hinweise

- Die Startseite (`index.html`) lädt Navigation & Übersicht über `app.js`, `pages.js`, `navigation.js` und die globalen Styles `index.css`/`styles.css`.
- Konfigurationseinträge für Spotify und OpenAI befinden sich ausschließlich im Backend (.env); Frontend-Tools greifen über `spotify.js` und `openaiClient.js` auf die JSON-Endpunkte zu.
- Riot-spezifische Tools verlassen sich auf lokal gespeicherte API-Keys; ohne gepflegtes `config.html` (Legacy) müssen alternative Verwaltungswege geschaffen werden.
