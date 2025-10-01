# WWW-Portal (`www.behamot.de`)

Dieser Ordner liefert die statische Marketing-Seite, die unter `www.behamot.de` erreichbar ist. Beim Rendern des nginx-Templates wird der Inhalt nach `/usr/share/nginx/html/www` kopiert und direkt als statische Seite bedient.

## Struktur
- `index.html`: Landing-Page mit Links ins Dev-Portal.
- `styles.css`: zentrales Stylesheet.

Der Hostname wird gemeinsam mit `dev.behamot.de` über [`scripts/render-nginx-config.sh`](../../../scripts/render-nginx-config.sh) gesetzt. Zertifikats-Challenges werden automatisch über die im Template hinterlegte ACME-Location ausgeliefert.
