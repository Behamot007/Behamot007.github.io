# Nginx-Templates

In diesem Ordner liegen Go-Template-kompatible Konfigurationsschnipsel für den Nginx-Container.

- `dev_www.conf.tpl`: erzeugt zwei Virtual Hosts (`dev.*`, `www.*`) inklusive Proxy-Pfad `/api/` und ACME-Challenge-Handling.

Die Template-Platzhalter werden über [`scripts/render-nginx-config.sh`](../../../scripts/render-nginx-config.sh) ersetzt und in `docker/nginx/default.conf` geschrieben. Bei Änderungen an den Domains oder zusätzlichen Hosts sollte das Template erweitert und das Skript erneut ausgeführt werden.
