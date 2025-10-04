# Twitch Chat Controller Backend

Dieser Service stellt eine abgesicherte API bereit, um einen Twitch-Chat über einen Bot-Account zu beobachten und Nachrichten zu versenden. Die Kommunikation mit Twitch erfolgt ausschließlich serverseitig über `tmi.js`. Eine zusätzliche Passwortschicht verhindert unbefugte Nutzung der Schnittstellen.

## Features

- Server-Sent-Events Stream für Chatnachrichten (inkl. Outgoing-Messages des Bots)
- Versand von Chatnachrichten über einen hinterlegten Bot-Account
- OAuth-Autorisierungs-Flow inkl. automatischer Speicherung und Refresh der Bot-Tokens
- Konfigurierbares API-Passwort, das sowohl von der Web-Oberfläche als auch von externen Clients abgefragt wird
- Verwaltung benutzerdefinierter Chat-Befehle (inkl. Präfix, Cooldowns & Antworten)
- Automatischer OpenAI-Zuschauer, der anhand von Stream-Screenshots periodisch Chat-Nachrichten erzeugt

## Schnellstart

```bash
cd projects/dev-backend/twitch-chat-controller
npm install
cp .env.example .env
# .env mit eigenen Zugangsdaten füllen
npm start
```

Der Server lauscht standardmäßig auf Port `4010`. Über einen Reverse-Proxy (z. B. nginx) kann der Pfad `/api/twitch/*` an diesen Service weitergeleitet werden.

## Umgebungsvariablen

| Variable | Beschreibung |
|----------|--------------|
| `PORT` | (Optional) Abweichender Port für das Express-Backend (Standard: 4010). |
| `TWITCH_API_PASSWORD` | Obligatorisches Passwort, das jede Anfrage (außer dem OAuth-Callback) mitliefern muss. |
| `TWITCH_CLIENT_ID` | Client-ID der Twitch Application für OAuth. |
| `TWITCH_CLIENT_SECRET` | (Optional) Client-Secret der Twitch Application für OAuth. Ohne diesen Wert nutzt der Server automatisch den Authorization-Code-Flow mit PKCE. |
| `TWITCH_REDIRECT_URI` | Redirect-URL, die in der Twitch Application hinterlegt ist (z. B. `https://www.behamot.de/api/twitch/oauth/callback`). |
| `TWITCH_BOT_USERNAME` | Benutzername des Bot-Accounts, der den Chat steuert. |
| `TWITCH_BOT_OAUTH_TOKEN` | (Optional) OAuth-Token im Format `oauth:...` als Initialwert. Kann später durch den OAuth-Flow ersetzt werden. |
| `TWITCH_DEFAULT_CHANNEL` | (Optional) Kanal, der automatisch beim Start betreten werden soll. |
| `TWITCH_STATE_FILE` | (Optional) Pfad zu einer JSON-Datei, in der Laufzeitdaten (Tokens, Befehle) persistiert werden. Standard: `runtime-state.json`. |
| `OPENAI_API_KEY` | Secret für den automatischen Zuschauer, wird für Chat-Completions inklusive Bildanalyse benötigt. |
| `OPENAI_DEFAULT_MODEL` | (Optional) Vorbelegtes OpenAI-Modell (z. B. `gpt-4o-mini`). |

Eine minimal ausgefüllte `.env` kann z. B. wie folgt aussehen:

```ini
TWITCH_API_PASSWORD=ein-sicheres-passwort
TWITCH_CLIENT_ID=deine-client-id
# Optional: Nur notwendig, wenn du kein PKCE verwenden möchtest
TWITCH_CLIENT_SECRET=dein-client-secret
TWITCH_REDIRECT_URI=https://www.behamot.de/api/twitch/oauth/callback
TWITCH_BOT_USERNAME=deinbotname
# Optional: Anfangstoken, wird durch den OAuth-Flow überschrieben
TWITCH_BOT_OAUTH_TOKEN=oauth:xxxxxxxxxxxxxxxxxxxx
# Optional: Speicherort für Laufzeitdaten (Standard: runtime-state.json)
# TWITCH_STATE_FILE=/app/data/twitch-state.json
TWITCH_DEFAULT_CHANNEL=BehamotVT
OPENAI_API_KEY=sk-...
OPENAI_DEFAULT_MODEL=gpt-4o-mini
```

> Achte darauf, dass ein manuell gesetztes Bot-Token mit `oauth:` beginnt – sonst lehnt Twitch die Verbindung ab.

> Hinweis: Das API-Passwort muss im Frontend eingegeben werden. Für Streaming-Endpunkte kann das Passwort als `apiPassword` Query-Parameter gesetzt werden, damit EventSource-Verbindungen funktionieren.

> Laufzeitdaten (z. B. gespeicherte Bot-Tokens und Befehle) werden standardmäßig in `runtime-state.json` neben dem Server abgelegt. Mit `TWITCH_STATE_FILE` lässt sich der Speicherort in einen persistenten Pfad verlagern.

### Zugangsdaten beschaffen

1. **Twitch Developer Application anlegen**
   - Öffne <https://dev.twitch.tv/console/apps> und erstelle (oder wähle) eine Anwendung.
   - Hinterlege unter „OAuth Redirect URLs" exakt die Adresse aus `TWITCH_REDIRECT_URI` (z. B. `https://www.behamot.de/api/twitch/oauth/callback`).
    Diese URL muss direkt auf den Backend-Endpunkt `/api/twitch/oauth/callback` zeigen – der Server führt dort den Token-Tausch inklusive Client-Secret bzw. PKCE-Code-Verifier durch und sendet das Ergebnis zurück.
   - Kopiere die Werte „Client ID" und – falls du kein PKCE nutzen möchtest – „Client Secret" in `TWITCH_CLIENT_ID` bzw. `TWITCH_CLIENT_SECRET` deiner `.env`.
2. **Bot-Account vorbereiten**
   - Lege (falls noch nicht vorhanden) ein separates Twitch-Konto an, das den Chat steuern soll.
   - Erzeuge ein Chat-OAuth-Token für dieses Konto, z. B. über <https://twitchapps.com/tmi/> oder den integrierten OAuth-Flow der Weboberfläche mit den Scopes `chat:read chat:edit`.
   - Trage den Benutzernamen in `TWITCH_BOT_USERNAME` und – sofern du ein Start-Token nutzt – das generierte Token im Format `oauth:…` in `TWITCH_BOT_OAUTH_TOKEN` ein.
3. **API-Passwort festlegen**
   - Wähle ein beliebiges starkes Passwort und setze es als `TWITCH_API_PASSWORD`. Dieses Passwort muss anschließend im Frontend eingegeben werden, damit Buttons (z. B. „OAuth starten“) freigeschaltet werden.

Erst wenn alle Pflichtfelder gesetzt sind, meldet `/api/twitch/status` `oauthConfigured: true` – andernfalls bleibt der OAuth-Button im Frontend ausgegraut.

### Betrieb im Container

Für den produktiven Einsatz kann der Dienst über Docker Compose gestartet werden. Im Root-Projekt befindet sich eine `docker-compose.yml`, die einen Service `twitch-controller` definiert. Vor dem Start solltest du die oben genannten Umgebungsvariablen in deiner Shell oder einer `.env` Datei neben `docker-compose.yml` setzen:

```bash
TWITCH_API_PASSWORD=ein-sicheres-passwort \
TWITCH_CLIENT_ID=deine-client-id \
TWITCH_CLIENT_SECRET=dein-client-secret \
TWITCH_REDIRECT_URI=https://www.behamot.de/api/twitch/oauth/callback \
TWITCH_BOT_USERNAME=deinbotname \
TWITCH_BOT_OAUTH_TOKEN=oauth:xxxxxxxxxxxxxxxxxxxx \
docker compose up -d twitch-controller
```

Der neue Dockerfile im Verzeichnis `projects/dev-backend/twitch-chat-controller` stellt sicher, dass der Build funktioniert und der Container anschließend auf Port `4010` lauscht.

## API-Überblick

Alle Routen (bis auf den OAuth-Callback) verlangen das korrekte Passwort, entweder über den `Authorization: Bearer <passwort>` Header, den Header `x-api-password` oder über den Query-Parameter `apiPassword`.

| Methode | Route | Beschreibung |
|---------|-------|--------------|
| `GET` | `/api/twitch/status` | Statusinformationen zum Bot und der Twitch-Verbindung. |
| `GET` | `/api/twitch/config` | Liefert Standardkonfigurationen (Redirect-URL, Default-Channel, empfohlene Scopes). |
| `GET` | `/api/twitch/chat/stream?channel=<name>&apiPassword=<pw>` | Server-Sent-Events Stream der Chatnachrichten eines Kanals. |
| `GET` | `/api/twitch/chat/history?channel=<name>` | Liefert die letzten 50 gespeicherten Nachrichten. |
| `POST` | `/api/twitch/chat/send` | Sendet eine Nachricht in den angegebenen Channel. |
| `GET` | `/api/twitch/oauth/authorize` | Erstellt eine OAuth-Login-URL samt State. |
| `GET` | `/api/twitch/oauth/callback` | Ziel-URL für Twitch nach erfolgreichem Login. Antwortet mit einer HTML-Seite, die Tokens an das ursprüngliche Fenster meldet. |
| `POST` | `/api/twitch/oauth/apply` | Übernimmt ein frisch erhaltenes OAuth-Token und speichert es inkl. optionalem Refresh. |
| `GET` | `/api/twitch/commands` | Liefert das aktuelle Befehlspräfix sowie alle konfigurierten Kommandos. |
| `PUT` | `/api/twitch/commands` | Überschreibt Präfix und Befehle. |
| `GET` | `/api/twitch/openai` | Liefert Konfiguration und Laufzeitstatus des OpenAI-Zuschauers. |
| `PUT` | `/api/twitch/openai` | Aktualisiert Prompt, Intervall und Ziel-Channel des OpenAI-Zuschauers. |

### Kommando-Konfiguration

Die Befehlsverwaltung arbeitet mit einer Liste aus Objekten unterhalb des Schlüssels `items`. Jedes Kommando besitzt folgende Felder:

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `names` | `string[]` | Liste aller Alias-Namen ohne Präfix. Mehrere Namen verweisen auf denselben Befehl und teilen sich Cooldown & Rechte. |
| `response` | `string` | Nachricht, die der Bot sendet. Platzhalter wie `{user}`, `{channel}` oder `{message}` werden automatisch ersetzt. |
| `cooldownSeconds` | `number` | Mindestabstand in Sekunden zwischen manuellen Ausführungen. |
| `autoIntervalSeconds` | `number` | Optionales Intervall für automatische Ausführung. Der Bot sendet die Antwort in alle verbundenen Channels. |
| `minUserLevel` | `"everyone"\|"subscriber"\|"regular"\|"vip"\|"moderator"\|"super-moderator"\|"broadcaster"` | Erforderliche Twitch-Benutzerstufe. Nutzer unterhalb der Stufe erhalten einen Whisper-Hinweis und die auslösende Nachricht wird (sofern erlaubt) gelöscht. |
| `responseType` | `"say"\|"mention"\|"reply"\|"whisper"` | Legt fest, wie der Bot antwortet (klassische Chat-Nachricht, Erwähnung, Antwort-Thread oder Whisper). Whisper wird bei fehlenden Berechtigungen automatisch zu einer Chat-Nachricht degradiert. |
| `enabled` | `boolean` | Steuert, ob das Kommando ausgelöst werden kann und ob automatische Intervalle aktiv sind. |

Wird ein Eintrag deaktiviert oder die Rechteprüfung fehlschlägt, sendet der Bot keine Chat-Nachricht und informiert den Nutzer per Whisper über die fehlende Berechtigung. Der Chat-Bot versucht zusätzlich, die ursprüngliche Chat-Nachricht zu entfernen (`channel:moderate`-Scope erforderlich).

## Frontend-Integration

Die zugehörige Weboberfläche liegt unter `projects/sites/dev/services/twitch-bot`. Sie fragt das Passwort ab, öffnet bei Bedarf den OAuth-Login, übergibt neue Tokens automatisch an das Backend und verbindet sich anschließend via SSE mit dem gewünschten Kanal. Nachrichten können direkt aus dem Browser gesendet werden und erscheinen inklusive Bot-Markierung im Verlauf. Außerdem lassen sich dort Befehlspräfix und Chat-Kommandos konfigurieren. Ein zusätzlicher Tab steuert den OpenAI-Zuschauer (Prompt, Intervall, Ziel-Channel) und zeigt den Status des automatischen Chats an.

Stelle sicher, dass der Reverse-Proxy die Pfade

- `GET /api/twitch/*`
- `POST /api/twitch/*`

an diesen Service weiterleitet. Die OAuth-Redirect-URL muss identisch zur Konfiguration in der Twitch Developer Console sein und auf die öffentlich erreichbare Domain (`https://www.behamot.de/...`) zeigen.
