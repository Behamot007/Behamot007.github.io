# Dev-Portal (`dev.behamot.de`)

Dieses Verzeichnis enthält das Single-Page-Frontend für das Dev-Portal. Der `docker/nginx`-Container bedient die Dateien aus `dev/` unter der Domain `dev.behamot.de`.

## Aufbau
- `index.html`, `index.css`, `app.js`: Einstiegspunkt und Shell der Anwendung.
- `shared/`, `services/`: Modulcode für gemeinsam genutzte Komponenten bzw. Fachbereiche.
- `config.*`: Build-Zeit-Konfiguration für Navigation und Layout.

Bei einem Deployment wird das Template [`docker/nginx/templates/dev_www.conf.tpl`](../../../docker/nginx/templates/dev_www.conf.tpl) über [`scripts/render-nginx-config.sh`](../../../scripts/render-nginx-config.sh) gerendert. Dabei wird der Hostname für das Dev-Portal eingesetzt und `/api/` automatisch an den Backend-Container weitergeleitet.
