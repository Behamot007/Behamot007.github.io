# Twitch Chat Steuerung (Frontend)

Dieses Frontend dient als Kontrollzentrale für den Twitch Bot-Service aus `projects/dev-backend/twitch-chat-controller`. Es ermöglicht, ein API-Passwort einzugeben, den gewünschten Kanal zu wählen, Chatnachrichten in Echtzeit einzusehen und über den Bot-Account in den Chat zu schreiben. Zusätzlich kann ein OAuth-Testlauf gestartet werden, der die von Twitch zurückgelieferten Tokens im Browser anzeigt.

## Aufbau

- **Backend-Verbindung**: Eingabefelder für API-Basis-URL und Passwort. Nach erfolgreicher Verbindung werden Statusinformationen angezeigt und weitere Aktionen freigeschaltet.
- **OAuth-Test**: Startet den Autorisierungs-Flow über `/api/twitch/oauth/authorize`. Der Callback sendet die Tokens via `postMessage` zurück.
- **Chat-Ansicht**: Baut eine SSE-Verbindung (`/api/twitch/chat/stream`) auf, zeigt eingehende Nachrichten an und erlaubt das Versenden neuer Nachrichten über `/api/twitch/chat/send`.

## Nutzung

1. Backend bereitstellen und sicherstellen, dass es unter der gewünschten Domain via `/api/twitch` erreichbar ist.
2. Seite unter `https://www.behamot.de/services/twitch-bot/` aufrufen.
3. API-Basis (`https://www.behamot.de/api/twitch`) und Passwort eingeben, auf „Verbinden“ klicken.
4. Channel auswählen (z. B. `behamot007`) und den Chat abonnieren.
5. Optional: OAuth-Test starten, um Benutzer-Tokens für weitere Funktionen zu erhalten.

Die Seite speichert lediglich die API-Basis-URL und den zuletzt verwendeten Channel in `localStorage`. Das Passwort wird aus Sicherheitsgründen nicht persistiert.
