# Open Infrastructure Map — Offline Local Dev Fork

This is a fork of [openinframap/openinframap](https://github.com/openinframap/openinframap)
configured for **fully offline local development**.

The goal is a stack where, after initial setup, nothing calls `openinframap.org` at runtime.
All external service URLs are controlled by environment variables and default to production,
so the project still works out of the box for contributors who just clone without a `.env`.

## What's different from upstream

| Area | Change |
|------|--------|
| **Backend/frontend URLs** | Configurable via `VITE_BACKEND_BASE_URL` / `VITE_TILE_BASE_URL` in `web/.env` |
| **Dev server routing** | Vite proxies `/stats`, `/about`, `/static`, `/local-images` to the local backend |
| **Search** | OpenCage geocoder (online-only) disabled; DB search + coordinate parsing only |
| **Background toggle** | Hidden — single tile source for local dev |
| **Wikidata image cache** | `scripts/fetch_images.py` pre-downloads thumbnails and entity JSON to `data/` |
| **Offline Wikidata popups** | Backend serves cached entity JSON and images; falls back to remote if not cached |
| **Setup scripts** | `scripts/launch.sh` (first-time setup), `scripts/start.sh` (start everything + open the map), `scripts/build-region.sh` (interactive region download + import), `scripts/export-db.sh` / `scripts/import-db.sh` (share a built database, e.g. on a USB drive) |

## Getting started

See **[docs/LOCAL_DEVELOPMENT.md](./docs/LOCAL_DEVELOPMENT.md)** for the full setup guide.

The short version:

```bash
# First time: pick a region, build the database, create .env files,
# then start the app and open it in your browser
bash scripts/launch.sh

# Every time after that: start everything and open the map
bash scripts/start.sh
```

## Upstream project

The upstream project is [Open Infrastructure Map](https://openinframap.org), a map of the
world's infrastructure from [OpenStreetMap](https://www.openstreetmap.org).

[![IRC](https://img.shields.io/badge/IRC-%23osm--infrastructure-brightgreen)](https://webchat.oftc.net/?channels=osm-infrastructure)
[![Matrix](https://img.shields.io/matrix/osm-infrastructure:matrix.org?server_fqdn=matrix.org&logo=matrix)](https://matrix.to/#/#osm-infrastructure:matrix.org)

For architecture details see [docs/architecture.md](./docs/architecture.md).
For contributing to upstream see [openinframap/openinframap](https://github.com/openinframap/openinframap).
