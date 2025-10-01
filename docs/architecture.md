# Architekturübersicht

Diese Architekturübersicht beschreibt die angestrebte Zielstruktur des Repositories und legt verbindliche Konventionen für die Ablage von Quellcode, Assets und Dokumentation fest.

## Zielstruktur

```
/
├── docs/
│   ├── architecture.md           # Architekturleitfaden (dieses Dokument)
│   └── service-inventory.md      # Übersicht vorhandener Services
├── projects/
│   ├── dev-backend/              # Gemeinsames Backend für Auth, Nutzer- und Tooling-APIs
│   └── sites/
│       ├── dev/                  # Zentrales Dev-Portal (SPA, Dashboards)
│       │   └── services/         # Fachservices (Arena, Hitster, Anime, Planning)
│       └── www/                  # Statisches Marketing-Frontend
├── infra/                        # Infrastruktur, IaC, Deployment-Skripte
└── scripts/                      # Wiederverwendbare Hilfsskripte (CI, Wartung)
```

## Naming-Konventionen

- **Verzeichnisse**: Kleinbuchstaben mit Bindestrich (`kebab-case`), z. B. `sites/dev`, `data-sync-worker`.
- **Dateien**:
  - HTML-Dateien: `feature-name.page.html`
  - CSS-Dateien: `feature-name.styles.css`
  - JavaScript-Module: `feature-name.module.js` oder `*.service.js` für Services.
  - Tests: `*.spec.js` für Unit-Tests, `*.e2e.js` für End-to-End-Tests.
- **Assets**: Bilder als `*.webp` oder `*.svg`. Dateinamen beschreibend und in `kebab-case`, z. B. `hero-banner.webp`.
- **Konfigurationsdateien**: `*.config.json` oder `*.config.js` mit Präfix für den jeweiligen Service (`arena.config.json`).

## Erwartete Inhalte je Ordner

| Ordner                                   | Pflichtinhalte                                                                                  | Optionale Inhalte                                  |
|------------------------------------------|-------------------------------------------------------------------------------------------------|-----------------------------------------------------|
| `projects/sites/dev/`                    | SPA-Einstieg (`index.html`, `app.js`), `shared/`, `services/`, `README.md`          | `tests/`, `storybook/`, `docs/`                     |
| `projects/sites/www/`                    | Statische Landing-Page (`index.html`, `styles.css`), `README.md`                    | Zusätzliche Assets (`/assets`), Lokalisierungen     |
| `projects/dev-backend/`                  | `src/`, `tests/`, `package.json` oder `requirements.txt`, `README.md`                           | `migrations/`, `docs/`                              |
| `projects/sites/dev/services/<service>/` | `src/`, `public/`, `tests/`, `README.md` (siehe Template), `package.json`/`requirements.txt`    | `docs/`, `infrastructure/`, `local/`                |
| `projects/sites/dev/services/<service>/src/`       | Fachlogik, Controller, Komponenten gemäß Technologiestack                                       | `__mocks__/`, `__fixtures__/`                       |
| `projects/sites/dev/services/<service>/public/`    | Statische Assets (Icons, Fonts, Bilder)                                                         | `locales/` für Übersetzungen                        |
| `projects/sites/dev/services/<service>/tests/`     | Unit-/Integrationstests, Testdaten                                                              | `e2e/` für End-to-End-Tests                         |
| `infra/`                                 | IaC-Definitionen (`terraform/`, `pulumi/`), Compose-Files, Deployment-Pipelines                  | `monitoring/`, `observability/`                     |
| `scripts/`                               | Wiederverwendbare Skripte, die dienstübergreifend genutzt werden (Shell, Node, Python); insbesondere `render-nginx-config.sh` zur Domain-Konfiguration | `README.md` mit Anwendungsbeispielen                |
| `docker/nginx/templates/`                | Template-Dateien für Virtual Hosts (`dev`/`www`), referenziert von `render-nginx-config.sh`      | Weitere Host-Templates, Kommentare zur Nutzung      |

Die Domains `dev.*` und `www.*` werden zentral über das Template `docker/nginx/templates/dev_www.conf.tpl` gesteuert. Änderungen am Routing erfolgen ausschließlich über dieses Template sowie das Render-Skript aus `scripts/`.

## Template für Service-READMEs

Jeder Service innerhalb von `projects/sites/dev/services/` muss eine `README.md` enthalten, die sich an folgendem Template orientiert:

```markdown
# <Service-Name>

## Zweck
- Kurzbeschreibung des Funktionsumfangs und der Zielnutzer:innen.
- Auflistung wichtiger Domänenbegriffe oder Geschäftsprozesse.

## Externe Abhängigkeiten
- APIs (z. B. Spotify, OpenAI) mit Links zur Dokumentation.
- Datenbanken oder Queues (z. B. PostgreSQL, Redis) inklusive Verbindungsdetails.
- Interne Services, auf die zugegriffen wird (z. B. `dev-backend`, `infra/monitoring`).

## Deploy-Hinweise
- Build- bzw. Startbefehle (`npm run build`, `docker compose up`, etc.).
- Erwartete Umgebungsvariablen samt Kurzbeschreibung.
- Besondere Migrations- oder Seed-Schritte.
- Hinweise zur Observability (Monitoring, Logging, Alerts).
```

Die Struktur wird regelmäßig überprüft und bei neuen Services oder Technologien erweitert. Änderungen an den Konventionen sind in Pull Requests zu dokumentieren.
