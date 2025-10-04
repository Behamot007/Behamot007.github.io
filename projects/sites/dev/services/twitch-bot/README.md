# Twitch Chat Steuerung (Frontend)

Dieses Frontend dient als Kontrollzentrale für den Twitch Bot-Service aus `projects/dev-backend/twitch-chat-controller`. Es ermöglicht, das API-Passwort zu hinterlegen, den gewünschten Kanal zu wählen, Chatnachrichten in Echtzeit einzusehen und über den Bot-Account in den Chat zu schreiben. Zusätzlich können OAuth-Token für den Bot automatisch im Backend gespeichert und verwaltet werden. Eine Befehlsverwaltung erlaubt das Konfigurieren eigener Chat-Kommandos.

## Aufbau

- **Konfiguration**: Formular für das API-Passwort (mit Passwortmanager-Kompatibilität), Anzeige des aktuellen Bot-Token-Status sowie Start des OAuth-Flows. Erfolgreiche Logins werden automatisch an das Backend übermittelt und dort gespeichert/erneuert.
- **Chat-Ansicht**: Baut eine SSE-Verbindung (`/api/twitch/chat/stream`) auf, zeigt eingehende Nachrichten an (inkl. Bot-Antworten) und erlaubt das Versenden neuer Nachrichten über `/api/twitch/chat/send`.
- **Befehle**: Oberfläche zum Pflegen des Befehlspräfixes sowie beliebig vieler Chat-Kommandos inklusive Alias-Verwaltung, Benutzerstufen, Antworttypen und optionalen Automatik-Intervallen. Die Konfiguration wird über `/api/twitch/commands` geladen und gespeichert.
- **Währung**: Tab zur Verwaltung eines kanalweiten Punktesystems. Hier lässt sich der Name der Währung festlegen, ebenso wie die Vergaberate (X Punkte pro Y Minuten aktiver Zuschauer). Der Statusbereich zeigt an, wie viele Konten existieren und welcher Gesamtsaldo aktuell gespeichert ist. Änderungen werden über `/api/twitch/currency` persistiert; Erfolg oder Fehler werden zusätzlich in der Browser-Konsole protokolliert.
- **OpenAI Zuschauer**: Steuert die automatische KI-Interaktion. Hier lassen sich System-Prompt, Screenshot-Intervall und Ziel-Channel festlegen; Status und letzte Antwort kommen aus `/api/twitch/openai`.

## Nutzung

1. Backend bereitstellen und sicherstellen, dass es unter der gewünschten Domain via `/api/twitch` erreichbar ist.
2. Seite unter `https://www.behamot.de/services/twitch-bot/` aufrufen.
3. API-Passwort eingeben und auf „Verbinden“ klicken.
4. Optional: Über „OAuth starten“ den Bot-Login durchführen. Das Backend speichert und erneuert das Token automatisch.
5. Channel auswählen (z. B. `behamot007`) und den Chat abonnieren.
6. Währungssystem konfigurieren (Name, Vergaberate) und speichern, um das Punktesystem zu aktivieren. Anschließend können Befehle optional Kosten definieren, die automatisch vom Nutzerkonto abgebucht werden.
7. Befehle anpassen und speichern, damit der Bot auf Chat-Kommandos reagieren kann.
8. Optional: Im Tab „OpenAI Zuschauer“ Automatik aktivieren, Prompt anpassen und das Intervall festlegen. Der Bot sendet dann in den Standard- oder angegebenen Channel periodisch KI-generierte Nachrichten.

Die Seite speichert lediglich den zuletzt verwendeten Channel in `localStorage`. Das Passwort wird aus Sicherheitsgründen nicht persistiert.
