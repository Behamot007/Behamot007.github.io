# Service- & Feature-Inventar

Dieser Überblick fasst die aktuell ausgelieferten Navigationsgruppen aus `app.js` samt der zugehörigen Einstiegsseiten, Stylesheets, Skripte und Backend-Anbindungen zusammen.

## Hitster Digital

| Feature | Einstieg (HTML) | Styles | Skripte | Backend/Externals | Hinweise |
|---------|-----------------|--------|---------|--------------------|----------|
| Digital Mode | `projects/sites/dev/services/hitster/gameModeDigital.html` | Umfangreiche Inline-Styles | `qrcode.min.js` (CDN), `projects/sites/dev/shared/spotify.js`, `projects/sites/dev/shared/openaiClient.js`, `projects/sites/dev/shared/ai.js`, umfangreiches Inline-Skript | Backend: `/api/spotify/*`, `/api/openai/chat`; Extern: mehrere `https://api.spotify.com/v1/...` Calls | Kombiniert Spotify-Steuerung, KI-Hinweise & QR-Codes für volldigitales Spiel. |

## Alltag & Planung

| Feature | Einstieg (HTML) | Styles | Skripte | Backend/Externals | Hinweise |
|---------|-----------------|--------|---------|--------------------|----------|
| Kostenkalkulation | `projects/sites/dev/services/planning/bill-splitter.html` | Eigenes Stylesheet `projects/sites/dev/services/planning/bill-splitter.css` | `projects/sites/dev/shared/openaiClient.js`, `projects/sites/dev/shared/ai.js`, `projects/sites/dev/services/planning/bill-splitter.js` | Backend: `/api/openai/chat` (Bon-Scan-Feature); ansonsten rein clientseitige Berechnungen | KI-gestütztes Experiment zum Erkennen von Kassenbons. |

## Anime Rätsel

| Feature | Einstieg (HTML) | Styles | Skripte | Backend/Externals | Hinweise |
|---------|-----------------|--------|---------|--------------------|----------|
| Rätsel Chat | `projects/sites/dev/services/anime/animeCharakterdle.html` | Stylesheet `projects/sites/dev/services/anime/styles.css` + kleines Inline-Tuning | `projects/sites/dev/shared/openaiClient.js`, `projects/sites/dev/services/anime/animeCharakterdle.js` | Backend: `/api/openai/chat`, `/api/characters`; Datensätze kommen aus `projects/dev-backend/anime-dataset` | Nutzt KI-Chat basierend auf einem Backend-verwalteten Charakter-Sample. |

## Konfiguration

| Feature | Einstieg (HTML) | Styles | Skripte | Backend/Externals | Hinweise |
|---------|-----------------|--------|---------|--------------------|----------|
| Konfigurationsübersicht | `projects/sites/dev/index.html` (View `configView`) | `projects/sites/dev/index.css`, `projects/sites/dev/config.css` | `projects/sites/dev/app.js`, `projects/sites/dev/shared/openaiClient.js`, `projects/sites/dev/shared/spotify.js` | Backend: `/api/spotify/config`, `/api/openai/status` | Zeigt serververwaltete Statusmeldungen für Spotify- und OpenAI-Zugänge. |
| Standalone Konfiguration | `projects/sites/dev/config.html` | `projects/sites/dev/config.css` | `projects/sites/dev/shared/spotify.js`, `projects/sites/dev/shared/openaiClient.js`, `projects/sites/dev/pages.js`, `projects/sites/dev/navigation.js` | Backend: `/api/spotify/*`, `/api/openai/status` | Leichtgewichtige Statusübersicht ohne lokale Riot-Schlüsselverwaltung. |

## Weitere Hinweise

- Die Dev-Startseite (`projects/sites/dev/index.html`) lädt Navigation & Übersicht über `projects/sites/dev/app.js`, `projects/sites/dev/pages.js`, `projects/sites/dev/navigation.js` und die globalen Styles `projects/sites/dev/index.css`/`projects/sites/dev/config.css`.
- Spotify- und OpenAI-Konfigurationen liegen ausschließlich im Backend (.env); Frontend-Tools greifen über `spotify.js` und `openaiClient.js` auf die JSON-Endpunkte zu.
- Der ehemalige Riot-/Arena-Stack, Debug-Ansichten und Dataset-Verwaltung wurden entfernt und werden nicht mehr unterstützt.
