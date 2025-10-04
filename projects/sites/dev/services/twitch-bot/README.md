# Twitch Chat Steuerung (Frontend)

Dieses Frontend dient als Kontrollzentrale für den Twitch Bot-Service aus `projects/dev-backend/twitch-chat-controller`. Es ermöglicht, das API-Passwort zu hinterlegen, den gewünschten Kanal zu wählen, Chatnachrichten in Echtzeit einzusehen und über den Bot-Account in den Chat zu schreiben. Zusätzlich können OAuth-Token für den Bot automatisch im Backend gespeichert und verwaltet werden. Eine Befehlsverwaltung erlaubt das Konfigurieren eigener Chat-Kommandos.

## Aufbau

- **Konfiguration**: Formular für das API-Passwort (mit Passwortmanager-Kompatibilität), Anzeige des aktuellen Bot-Token-Status sowie Start des OAuth-Flows. Erfolgreiche Logins werden automatisch an das Backend übermittelt und dort gespeichert/erneuert.
- **Chat-Ansicht**: Baut eine SSE-Verbindung (`/api/twitch/chat/stream`) auf, zeigt eingehende Nachrichten an (inkl. Bot-Antworten) und erlaubt das Versenden neuer Nachrichten über `/api/twitch/chat/send`.
- **Befehle**: Oberfläche zum Pflegen des Befehlspräfixes sowie beliebig vieler Chat-Kommandos. Die Konfiguration wird über `/api/twitch/commands` geladen und gespeichert.

## Nutzung

1. Backend bereitstellen und sicherstellen, dass es unter der gewünschten Domain via `/api/twitch` erreichbar ist.
2. Seite unter `https://www.behamot.de/services/twitch-bot/` aufrufen.
3. API-Passwort eingeben und auf „Verbinden“ klicken.
4. Optional: Über „OAuth starten“ den Bot-Login durchführen. Das Backend speichert und erneuert das Token automatisch.
5. Channel auswählen (z. B. `behamot007`) und den Chat abonnieren.
6. Befehle anpassen und speichern, damit der Bot auf Chat-Kommandos reagieren kann.

Die Seite speichert lediglich den zuletzt verwendeten Channel in `localStorage`. Das Passwort wird aus Sicherheitsgründen nicht persistiert.
