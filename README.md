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

## Dependency notes

- `package.json` overrides `vite` to 8.3.5. `@angular/build` 22.2.4 pins vite
  8.3.0, which has known vulnerabilities in the dev server (`ng serve`); 8.3.5
  fixes them. Vite is not part of the production build. Remove the override
  once an `@angular/build` release pins vite 8.3.3 or later.
- TypeScript stays on 6.0: `@angular/compiler-cli` 22.2 accepts `>=6.0 <6.1`,
  so TypeScript 7 would not build.

## Licensing

MIT License; see [LICENSE](LICENSE). Copyright (c) 2026 Faris Skopak.
