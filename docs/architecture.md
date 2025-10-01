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
│       └── dev/                  # Zentrales Frontend (Marketing, Dashboards)
│           └── services/         # Fachservices (Arena, Hitster, Anime, Planning)
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
| `projects/sites/dev/`                    | `public/` (statische Assets), `src/` (Frontend-Quellcode), `package.json`, `README.md`          | `tests/`, `storybook/`, `docs/`                     |
| `projects/dev-backend/`                  | `src/`, `tests/`, `package.json` oder `requirements.txt`, `README.md`                           | `migrations/`, `docs/`                              |
| `projects/sites/dev/services/<service>/` | `src/`, `public/`, `tests/`, `README.md` (siehe Template), `package.json`/`requirements.txt`    | `docs/`, `infrastructure/`, `local/`                |
| `projects/sites/dev/services/<service>/src/`       | Fachlogik, Controller, Komponenten gemäß Technologiestack                                       | `__mocks__/`, `__fixtures__/`                       |
| `projects/sites/dev/services/<service>/public/`    | Statische Assets (Icons, Fonts, Bilder)                                                         | `locales/` für Übersetzungen                        |
| `projects/sites/dev/services/<service>/tests/`     | Unit-/Integrationstests, Testdaten                                                              | `e2e/` für End-to-End-Tests                         |
| `infra/`                                 | IaC-Definitionen (`terraform/`, `pulumi/`), Compose-Files, Deployment-Pipelines                  | `monitoring/`, `observability/`                     |
| `scripts/`                               | Wiederverwendbare Skripte, die dienstübergreifend genutzt werden (Shell, Node, Python)          | `README.md` mit Anwendungsbeispielen                |

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
