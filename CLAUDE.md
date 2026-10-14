# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Open Infrastructure Map is a web geospatial application displaying world infrastructure (power grids, telecom, water, petroleum) from OpenStreetMap. It has five main services: a TypeScript/MapLibre frontend, a Python/Starlette backend, a Go/Tegola tile server, a PostgreSQL/PostGIS database, and an Imposm-based OSM importer.

## Development Setup

Prerequisites: `docker`, `uv`, `node`, `npm`, `unzip`, `shp2pgsql`.

For a fresh setup, place a regional OSM PBF file at `data/region.osm.pbf` (e.g. from Geofabrik), then run:
```bash
bash scripts/launch.sh
```

This downloads EEZ boundary data, imports OSM data into Postgres, generates Tegola config, and creates `.env` files. The DB import can be re-run idempotently with `bash scripts/setup-local-db.sh`.

Start services:
```bash
# Terminal 1 - tile server (already started by launch.sh, or manually):
docker compose up tegola

# Terminal 2 - web backend:
cd web-backend && uv run uvicorn src.main:app --reload

# Terminal 3 - frontend:
cd web && npm install && npm run dev   # http://localhost:5173
```

## Commands

### Frontend (`web/`)
```bash
npm run dev       # Dev server on port 5173
npm run build     # Production build
npm run lint      # ESLint + Prettier
npm run test      # Vitest (+ Puppeteer integration tests)
npm run extract   # Extract i18n translation strings
```

### Backend (`web-backend/`)
```bash
uv run uvicorn src.main:app --reload --port 8001   # Dev server on port 8001
uv run ruff check                  # Lint
uv run mypy .                      # Type check
uv run pytest                      # Tests
```

### Tile server (`tegola/`)
```bash
# Regenerate Tegola config from YAML sources:
python3 ./generate_tegola_config.py ./tegola.yml ./layers.yml > ./config.toml
```

### Database
```bash
docker compose up db                     # Start PostGIS container
docker compose down -v                   # Wipe all volumes (full reset)
bash scripts/setup-local-db.sh          # Re-import OSM + rebuild schema (idempotent)
bash scripts/update-db.sh               # Wipe DB and reimport from data/region.osm.pbf
```

## Architecture

### Data flow
OSM PBF → **Imposm** (`/imposm`) → PostGIS DB (`/schema`) → **Tegola** (`/tegola`) → vector tiles → **MapLibre frontend** (`/web`). The **web-backend** (`/web-backend`) serves stats pages and API endpoints separately.

### Database schema (`/schema/`)
- `dev-init.sql` / `prod-init.sql` — run once at DB creation to install extensions and set up roles
- `functions.sql` — PL/pgSQL helper functions (must be loaded before `views.sql`)
- `views.sql` — materialized views that Tegola queries for tile rendering

### Tile server (`/tegola/`)
The `config.toml` Tegola reads is **generated** — never edit it directly. Edit `tegola.yml` (server config) and `layers.yml` (layer definitions), then regenerate with `generate_tegola_config.py`. A second Docker image (`Dockerfile.expiry`) handles cache invalidation via the imposm expiry list.

### Frontend (`/web/`)
MapLibre GL JS map with i18next for internationalisation. The dev server proxies tile requests; configure the tile server URL in `.env` (created by `launch.sh`). Tests use Vitest with Puppeteer for browser-level integration tests.

### Backend (`/web-backend/`)
Starlette ASGI app (code under `src/`, entry point `src.main:app`) using SQLAlchemy async + asyncpg for DB access. Bokeh + Pandas are used to generate SVG/HTML stats charts. Requires `DATABASE_URL` env var using the `postgresql+asyncpg://` scheme.

### Imposm (`/imposm/`)
Mapping YAML defines which OSM tags are imported into which DB tables. Runs as a Docker Compose service; the `imposm_diff` and `imposm_expiry` volumes support continuous replication updates.

## Environment Variables

Both services need a `.env` file (created by `launch.sh`):
- `web/.env` — `VITE_TILESERVER_URL` pointing to local Tegola (default `http://localhost:7800`)
- `web-backend/.env` — `DATABASE_URL` for the local PostGIS instance

## CI/CD

GitHub Actions workflows (`.github/workflows/`) run lint + type-check + tests on PRs, then build and push Docker images on pushes to `main`. Each service has its own workflow file (`web.yml`, `web-backend.yml`, `tileserver.yml`, `imposm.yml`, `web-router.yml`).
