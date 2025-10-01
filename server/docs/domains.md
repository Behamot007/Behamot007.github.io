# Domain- und TLS-Planung

## DNS-Ziele

Für die Serverbereitstellung werden folgende Resource Records im DNS hinterlegt. Die Einträge verweisen auf die öffentliche IPv4-/IPv6-Adresse des Produktionsservers (hier als `SERVER_IPV4` bzw. `SERVER_IPV6` referenziert):

| Hostname           | Typ  | Wert            | Zweck                        |
|--------------------|------|-----------------|------------------------------|
| `dev.behamot.de`   | `A`  | `SERVER_IPV4`   | Zugriff auf das Dev-Portal   |
| `dev.behamot.de`   | `AAAA` | `SERVER_IPV6` | IPv6-Zugriff Dev-Portal      |
| `www.behamot.de`   | `A`  | `SERVER_IPV4`   | Öffentliches Portal (Alias)  |
| `www.behamot.de`   | `AAAA` | `SERVER_IPV6` | IPv6 für öffentliches Portal |

> **Hinweis:** Sobald der Server produktiv bereitsteht, sind die Platzhalter `SERVER_IPV4`/`SERVER_IPV6` durch die tatsächlichen IPs zu ersetzen. Beide Hostnamen zeigen auf dasselbe Ziel, damit nginx später anhand des Host-Headers das passende Zertifikat verwendet.

## TLS-Zertifikate

- **Quelle:** [Let’s Encrypt](https://letsencrypt.org/) via HTTP-01-Challenge.
- **Automatisierung:** Ein `certbot`-Container (siehe `server/scripts/renew-certificates.sh`) übernimmt die Ausstellung und Verlängerung der Zertifikate. Die Zertifikate werden unter `server/certbot/etc-letsencrypt` persistent gespeichert und können später von nginx eingebunden werden.
- **Domains:** `dev.behamot.de` und `www.behamot.de` (zusätzlich erweiterbar über die Umgebungsvariable `CERTBOT_DOMAINS`).

## Firewall- / Portfreigaben

Damit Zertifikatsanforderung und Webzugriff funktionieren, müssen folgende Ports geöffnet werden:

| Port | Protokoll | Zweck                           |
|------|-----------|---------------------------------|
| 80   | TCP       | HTTP, ACME HTTP-01 Challenge    |
| 443  | TCP       | HTTPS-Zugriff auf das Portal    |
| 22   | TCP       | (Optional) SSH für Administration |

Zusätzliche Dienste (z. B. Datenbank) bleiben weiterhin im internen Docker-Netzwerk und benötigen keine öffentlichen Freigaben.
