# Nginx-Bereitstellung – End-to-End-Ablauf

Diese Dokumentation beschreibt den Weg von einem DNS-Eintrag bis zum gestarteten nginx-Container auf dem Produktionsserver.

## 1. DNS
- Für `dev.behamot.de` und `www.behamot.de` werden `A`-/`AAAA`-Records auf die Server-IP gesetzt (siehe [`domains.md`](domains.md)).
- Beide Hostnames zeigen auf dieselbe IP. nginx unterscheidet später anhand des `Host`-Headers.

## 2. Konfigurations-Rendering
- Das Skript [`scripts/render-nginx-config.sh`](../../scripts/render-nginx-config.sh) erwartet die beiden Hostnamen als Argumente.
- Es liest das Template [`docker/nginx/templates/dev_www.conf.tpl`](../../docker/nginx/templates/dev_www.conf.tpl) ein, ersetzt `{{DEV_SERVER_NAME}}` und `{{WWW_SERVER_NAME}}` und schreibt das Ergebnis nach `docker/nginx/default.conf`.
- Das Skript sollte nach jeder Anpassung der Domains oder Template-Logik ausgeführt werden.

## 3. Container-Start
1. `docker compose up -d frontend` lädt das gerenderte `default.conf` in den nginx-Container.
2. Beim Start wird das Volume `./projects/sites` unter `/usr/share/nginx/html` gemountet:
   - `/usr/share/nginx/html/dev` → Inhalte aus `projects/sites/dev` (SPA).
   - `/usr/share/nginx/html/www` → Inhalte aus `projects/sites/www` (Landing-Page).
3. Der Container lauscht auf Port 80 und leitet `/api/`-Requests intern an `backend:3000` weiter.
4. Für Zertifikate stellt der Compose-Stack zusätzlich den `certbot`-Service bereit, der die ACME-Challenge unter `/.well-known/acme-challenge/` bedient und anschließend ein `nginx -s reload` auslösen kann.

## 4. Wartung
- Bei neuen Domains: DNS anpassen, Template erweitern, Skript erneut ausführen, Container neu starten oder `docker compose exec frontend nginx -s reload` ausführen.
- Bei Content-Änderungen an `projects/sites/dev`/`www` genügt ein erneutes Kopieren/Deployen der statischen Dateien; nginx liest sie direkt vom Volume ein.
