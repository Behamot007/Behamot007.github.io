# Service- & Feature-Inventar

Dieser Überblick fasst die aktuell ausgelieferten Navigationsgruppen aus `app.js` samt der zugehörigen Einstiegsseiten, Stylesheets, Skripte und Backend-Anbindungen zusammen.

## Hitster Digital

| Feature | Einstieg (HTML) | Styles | Skripte | Backend/Externals | Hinweise |
|---------|-----------------|--------|---------|--------------------|----------|
| Digital Mode | `projects/services/hitster/gameModeDigital.html` | Umfangreiche Inline-Styles | `qrcode.min.js` (CDN), `dev-portal/shared/spotify.js`, `dev-portal/shared/openaiClient.js`, `dev-portal/shared/ai.js`, umfangreiches Inline-Skript | Backend: `/api/spotify/*`, `/api/openai/chat`; Extern: mehrere `https://api.spotify.com/v1/...` Calls | Kombiniert Spotify-Steuerung, KI-Hinweise & QR-Codes für volldigitales Spiel. |

## Alltag & Planung

| Feature | Einstieg (HTML) | Styles | Skripte | Backend/Externals | Hinweise |
|---------|-----------------|--------|---------|--------------------|----------|
| Kostenkalkulation | `projects/services/planning/bill-splitter.html` | Eigenes Stylesheet `projects/services/planning/bill-splitter.css` | `dev-portal/shared/openaiClient.js`, `dev-portal/shared/ai.js`, `projects/services/planning/bill-splitter.js` | Backend: `/api/openai/chat` (Bon-Scan-Feature); ansonsten rein clientseitige Berechnungen | KI-gestütztes Experiment zum Erkennen von Kassenbons. |

## Anime Rätsel

| Feature | Einstieg (HTML) | Styles | Skripte | Backend/Externals | Hinweise |
|---------|-----------------|--------|---------|--------------------|----------|
| Rätsel Chat | `projects/services/anime/animeCharakterdle.html` | Stylesheet `projects/services/anime/styles.css` + kleines Inline-Tuning | `papaparse` (CDN), `dev-portal/shared/openaiClient.js`, `projects/services/anime/animeCharakterdle.js` | Backend: `/api/openai/chat`; lädt Dataset `projects/services/anime/anime-dataset/dataset/characters.csv` lokal | Nutzt KI-Chat basierend auf einem lokalen Charakter-Sample. |

## Konfiguration

| Feature | Einstieg (HTML) | Styles | Skripte | Backend/Externals | Hinweise |
|---------|-----------------|--------|---------|--------------------|----------|
| Konfigurationsübersicht | `projects/dev-portal/index.html` (View `configView`) | `projects/dev-portal/index.css`, `projects/dev-portal/config.css` | `projects/dev-portal/app.js`, `dev-portal/shared/openaiClient.js`, `dev-portal/shared/spotify.js` | Backend: `/api/spotify/config`, `/api/openai/status` | Zeigt serververwaltete Statusmeldungen für Spotify- und OpenAI-Zugänge. |
| Standalone Konfiguration | `projects/dev-portal/config.html` | `projects/dev-portal/config.css` | `dev-portal/shared/spotify.js`, `dev-portal/shared/openaiClient.js`, `projects/dev-portal/pages.js`, `projects/dev-portal/navigation.js` | Backend: `/api/spotify/*`, `/api/openai/status` | Leichtgewichtige Statusübersicht ohne lokale Riot-Schlüsselverwaltung. |

## Weitere Hinweise

- Die Dev-Portal-Startseite (`projects/dev-portal/index.html`) lädt Navigation & Übersicht über `projects/dev-portal/app.js`, `projects/dev-portal/pages.js`, `projects/dev-portal/navigation.js` und die globalen Styles `projects/dev-portal/index.css`/`projects/dev-portal/config.css`.
- Spotify- und OpenAI-Konfigurationen liegen ausschließlich im Backend (.env); Frontend-Tools greifen über `spotify.js` und `openaiClient.js` auf die JSON-Endpunkte zu.
- Der ehemalige Riot-/Arena-Stack, Debug-Ansichten und Dataset-Verwaltung wurden entfernt und werden nicht mehr unterstützt.
