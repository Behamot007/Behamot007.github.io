# Service- & Feature-Inventar

Dieser Überblick fasst die aktuell ausgelieferten Navigationsgruppen aus `app.js` samt der zugehörigen Einstiegsseiten, Stylesheets, Skripte und Backend-Anbindungen zusammen.

## Hitster Digital

| Feature | Einstieg (HTML) | Styles | Skripte | Backend/Externals | Hinweise |
|---------|-----------------|--------|---------|--------------------|----------|
| Digital Mode | `gameModeDigital.html` | Umfangreiche Inline-Styles | `qrcode.min.js` (CDN), `spotify.js`, `openaiClient.js`, `ai.js`, umfangreiches Inline-Skript | Backend: `/api/spotify/*`, `/api/openai/chat`; Extern: mehrere `https://api.spotify.com/v1/...` Calls | Kombiniert Spotify-Steuerung, KI-Hinweise & QR-Codes für volldigitales Spiel. |

## Alltag & Planung

| Feature | Einstieg (HTML) | Styles | Skripte | Backend/Externals | Hinweise |
|---------|-----------------|--------|---------|--------------------|----------|
| Kostenkalkulation | `bill-splitter.html` | Eigenes Stylesheet `bill-splitter.css` | `openaiClient.js`, `ai.js`, `bill-splitter.js` | Backend: `/api/openai/chat` (Bon-Scan-Feature); ansonsten rein clientseitige Berechnungen | KI-gestütztes Experiment zum Erkennen von Kassenbons. |

## Anime Rätsel

| Feature | Einstieg (HTML) | Styles | Skripte | Backend/Externals | Hinweise |
|---------|-----------------|--------|---------|--------------------|----------|
| Rätsel Chat | `animeCharakterdle.html` | Gemeinsames Stylesheet `styles.css` + kleines Inline-Tuning | `papaparse` (CDN), `openaiClient.js`, `animeCharakterdle.js` | Backend: `/api/openai/chat`; lädt Dataset `anime-dataset/dataset/characters.csv` lokal | Nutzt KI-Chat basierend auf einem lokalen Charakter-Sample. |

## Konfiguration

| Feature | Einstieg (HTML) | Styles | Skripte | Backend/Externals | Hinweise |
|---------|-----------------|--------|---------|--------------------|----------|
| Konfigurationsübersicht | `index.html` (View `configView`) | `index.css`, `styles.css` | `app.js`, `openaiClient.js`, `spotify.js` | Backend: `/api/spotify/config`, `/api/openai/status` | Zeigt serververwaltete Statusmeldungen für Spotify- und OpenAI-Zugänge. |
| Standalone Konfiguration | `config.html` | `styles.css` | `spotify.js`, `openaiClient.js`, `pages.js`, `navigation.js` | Backend: `/api/spotify/*`, `/api/openai/status` | Leichtgewichtige Statusübersicht ohne lokale Riot-Schlüsselverwaltung. |

## Weitere Hinweise

- Die Startseite (`index.html`) lädt Navigation & Übersicht über `app.js`, `pages.js`, `navigation.js` und die globalen Styles `index.css`/`styles.css`.
- Spotify- und OpenAI-Konfigurationen liegen ausschließlich im Backend (.env); Frontend-Tools greifen über `spotify.js` und `openaiClient.js` auf die JSON-Endpunkte zu.
- Der ehemalige Riot-/Arena-Stack, Debug-Ansichten und Dataset-Verwaltung wurden entfernt und werden nicht mehr unterstützt.
