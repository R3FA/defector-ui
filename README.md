# defector-ui

Angular frontend for [defector-api](https://github.com/R3FA/defector-api):
automated visual quality control for machine parts using unsupervised anomaly
detection (PatchCore, MVTec AD).

Part of a bachelor's thesis project at the Faculty of Information Technologies,
University "Džemal Bijedić" in Mostar.

> **Status:** in development.

## Requirements

| | |
|---|---|
| Node | `^22.22.3 \|\| ^24.15.0 \|\| >=26.0.0` (Angular 22 engines) |
| npm | >= 8 |
| Backend | [defector-api](https://github.com/R3FA/defector-api) running on port 8000 |

Node 24.15.0 is the exact lower bound of the 24 range that Angular 22 accepts.
Do not downgrade Node below it.

## Setup

```bash
npm install
npm start
```

The dev server runs on http://localhost:4200 and proxies `/api/**` to
http://localhost:8000, so no CORS configuration is needed during development.
Restart `ng serve` after editing `src/proxy.conf.json`; the proxy config is read
only at startup.

Start the backend separately:

```bash
cd ../defector-api && source .venv/bin/activate
uvicorn defector.api.app:app --reload
```

## Stack

- Angular 22, standalone components, zoneless change detection
- Angular Material 22 (azure-blue theme)
- Vitest for unit tests

## Licensing

GNU General Public License v2.0; see [LICENSE](LICENSE).
