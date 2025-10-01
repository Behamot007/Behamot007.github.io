# Server Deployment

Dieses Projekt nutzt eine gerenderte Nginx-Konfiguration, um unterschiedliche Domains für die Entwicklungs- und Live-Umgebung bereitzustellen. Die Konfiguration basiert auf der Vorlage unter `docker/nginx/templates/dev_www.conf.tpl` und kann mit folgendem Skript erzeugt werden:

```bash
scripts/render-nginx-config.sh dev.behamot.de www.behamot.de
```

Der erste Parameter steht für die Entwicklungs-Domain (inklusive Proxy-Pass auf `/api`), der zweite Parameter für die öffentliche Domain. Das Skript schreibt das Ergebnis nach `docker/nginx/default.conf` und sollte immer vor einem Deployment ausgeführt werden. Die GitHub-Deploy-Pipeline ruft das Skript automatisch mit den Domains `dev.behamot.de` und `www.behamot.de` auf.
