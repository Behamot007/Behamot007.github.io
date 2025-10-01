# Server Deployment

Dieses Projekt nutzt eine gerenderte Nginx-Konfiguration, um unterschiedliche Domains für die Entwicklungs- und Live-Umgebung bereitzustellen. Die Konfiguration basiert auf der Vorlage unter `docker/nginx/templates/dev_www.conf.tpl` und kann mit folgendem Skript erzeugt werden:

```bash
scripts/render-nginx-config.sh dev.behamot.de www.behamot.de
```

Der erste Parameter steht für die Entwicklungs-Domain (inklusive Proxy-Pass auf `/api`), der zweite Parameter für die öffentliche Domain. Das Skript schreibt das Ergebnis nach `docker/nginx/default.conf` und sollte immer vor einem Deployment ausgeführt werden. Die GitHub-Deploy-Pipeline ruft das Skript automatisch mit den Domains `dev.behamot.de` und `www.behamot.de` auf.

## Automatisiertes Startup-Skript

Für Server, auf denen ein Host-Nginx als Reverse Proxy eingesetzt wird, steht mit `server/scripts/startup.sh` ein ausführbares Startup-Skript zur Verfügung. Es kombiniert sämtliche manuellen Schritte in einem automatisierten Ablauf:

1. stellt sicher, dass `.env` aus der Vorlage existiert,
2. rendert die Container-nginx-Konfiguration mit den gewünschten Domains,
3. erzeugt ein `docker-compose.override.yml`, das den Backend-Port auf `127.0.0.1:${BACKEND_PORT}` bindet,
4. baut und startet den Docker-Compose-Stack (`docker compose up -d --build`),
5. schreibt optional eine Host-Nginx-Konfiguration inklusive ACME-Weiterleitung und `/api`-Proxy und lädt Nginx neu.

Standardmäßig richtet das Skript die Domains `dev.behamot.de` und `www.behamot.de` ein. Über Umgebungsvariablen lassen sich sämtliche Pfade und Hostnamen anpassen:

```bash
sudo DEV_DOMAIN=dev.example.com \
     WWW_DOMAIN=www.example.com \
     FRONTEND_PORT=8080 \
     BACKEND_PORT=3000 \
     server/scripts/startup.sh
```

Für Systeme ohne Host-Nginx kann die Generierung der Host-Konfiguration deaktiviert werden:

```bash
GENERATE_HOST_NGINX=false server/scripts/startup.sh
```

Das Skript erwartet funktionsfähige Installationen von Docker (inkl. Compose-Plugin) und Nginx. Vor dem Reload wird automatisch `nginx -t` aufgerufen. Bei erfolgreichem Lauf stehen die Container auf den gewünschten Subdomains bereit.
