# Local Development

This guide gets you from a fresh clone to a fully offline working stack
(frontend + backend + database + cached Wikidata images). After setup, no
requests go to `openinframap.org` at runtime.

---

## Prerequisites

| Tool | Minimum version | Notes |
|------|----------------|-------|
| Docker + Compose v2 | Docker 24 | `docker compose` (not `docker-compose`) |
| [uv](https://docs.astral.sh/uv/) | any recent | Python package manager for the backend and scripts |
| Node.js + npm | Node 20 | Used by the frontend |
| shp2pgsql | any | Only needed for the optional EEZ import; part of PostGIS client tools (`postgis-client` / `postgis` package) |
| Free disk space | ~6 GB | PBF ~200 MB, Docker volumes ~2 GB, node_modules ~1 GB, Wikidata image cache ~100 MB |

---

## Step-by-step setup

### 1. Clone the repository

```bash
git clone <your-fork-url>
cd openinframap
```

### 2. Download a regional PBF

The import script expects a PBF at `data/region.osm.pbf`. Any Geofabrik
extract works; Netherlands is a good size for testing (~200 MB):

```bash
mkdir -p data
curl -L https://download.geofabrik.de/europe/netherlands-latest.osm.pbf \
     -o data/region.osm.pbf
```

Any other region from https://download.geofabrik.de works — just rename the
file to `region.osm.pbf`. The map will be empty outside the imported region.

### 3. Bootstrap the database

```bash
bash scripts/setup-local-db.sh
```

This script:
- Starts the `db` Docker Compose service (PostGIS)
- Waits for Postgres to be ready
- Runs imposm to import the PBF (skipped if already imported)
- Applies `schema/views.sql` and `schema/stats.sql` (skipped if already applied)
- Prints instructions for the optional EEZ import (see below)

Re-running after a successful import is safe — it detects existing data and
skips the heavy steps.

### 4. Cache Wikidata images and metadata (optional but recommended)

This pre-downloads Wikidata entity metadata and Wikimedia Commons thumbnails
so feature popups work fully offline.

```bash
# Fast: cache entity JSON only (~10 sec, gives offline popup metadata)
uv run scripts/fetch_images.py --json-only

# Full: also download thumbnail images (~8 min at 1 image/sec)
uv run scripts/fetch_images.py
```

The script is idempotent — re-running skips already-cached items.
Files are saved to `data/wikidata_json/` and `data/images/` (both gitignored).

See [Wikidata image cache](#wikidata-image-cache) for more details.

### 5. Configure and start the backend

```bash
cd web-backend
cp .env.example .env
uv run uvicorn src.main:app --reload --port 8001
```

The backend listens on `http://localhost:8001`. Leave this terminal running.

### 6. Configure and start the frontend

In a separate terminal:

```bash
cd web
cp .env.example .env
```

Edit `web/.env` and set:

```
VITE_BACKEND_BASE_URL=http://localhost:8001
```

`VITE_TILE_BASE_URL` can be left at the production default unless you are
running a local tile server (see [Tile server](#tile-server) below).

Then start the dev server:

```bash
npm run dev
```

Open http://localhost:5173.

---

## Environment files

### `web/.env`

```
# Tile server — defaults to https://openinframap.org (production tiles).
# Override if running a local Tegola instance.
VITE_TILE_BASE_URL=https://openinframap.org

# Web-backend — point at your local uvicorn process.
VITE_BACKEND_BASE_URL=http://localhost:8001

# Optional: point directly at a local Tegola instance.
# VITE_TEGOLA_URL=http://localhost:7800
```

### `web-backend/.env`

```
DATABASE_URL=postgresql+asyncpg://osm:osm@localhost:5432/osm

# Uncomment to disable HTTP cache headers (useful in dev):
# DEBUG=true
```

---

## What works, what doesn't

### Works out of the box (no extra steps)

- **Map loads** — tiles come from production `openinframap.org` by default
- **Search** — DB-backed search against your local database (`/search/typeahead`); coordinate parsing
- **Backend pages** — `/stats`, `/about`, `/copyright` proxied from the local backend through Vite
- **Wikidata popups** — falls back to live Wikidata API if no local cache exists

### Works after image cache step (step 4)

- **Offline Wikidata popups** — labels, Wikipedia/Commons links, thumbnails all served from disk;
  no network required
- **P361 "part of" hierarchy** — parent entities (e.g. a wind farm for a turbine) are also cached

### Works after EEZ import (optional)

The EEZ (maritime boundary) shapefile must be imported manually — it requires a form submission at
[marineregions.org](https://www.marineregions.org/sources.php#unioneezcountry). See the output of
`setup-local-db.sh` for step-by-step instructions.

- **Area/country stats pages** (`/stats/area/*`) — require `countries.country_eez_sub`
- **Country attribution** on features — same dependency

### Doesn't work regardless

- **Map data outside the imported region** — tiles will be blank; only the area covered by your PBF
  is in the local database
- **Live OSM diff updates** — imposm is run once for the initial import; the database does not
  update automatically
- **OpenCage geocoding** — disabled in this fork (online-only service); DB search still works

---

## Wikidata image cache

When a user clicks a feature with a `wikidata` tag (e.g. a power plant), the popup calls
`/wikidata/{id}` on the backend. Normally this proxies to `wikidata.org` and
`commons.wikimedia.org`. With the local cache:

1. The backend checks `data/wikidata_json/{id}.json` for entity metadata (labels, sitelinks, claims)
2. If a local image exists in `data/images/{id}.*`, it is served at `/local-images/{id}.*`
3. Only if no local cache exists does the backend call Wikimedia's APIs

The cache is built by `scripts/fetch_images.py`, which respects
[Wikimedia's API etiquette](https://www.mediawiki.org/wiki/API:Etiquette):
descriptive User-Agent, no concurrent requests, 1 API request/sec, batch queries (50 IDs/request).

```bash
uv run scripts/fetch_images.py --json-only   # metadata only, ~10 sec
uv run scripts/fetch_images.py               # metadata + images, ~8 min
```

---

## Tile server

By default `VITE_TILE_BASE_URL` falls back to `https://openinframap.org`, so the map renders using
production tiles. This is intentional — it keeps the out-of-the-box experience working without
running Tegola.

To run tiles locally (requires a completed database import):

```bash
docker compose up tegola
```

Then set in `web/.env`:

```
VITE_TILE_BASE_URL=http://localhost:7800
```

---

## Updating the data

There is no continuous diff update. To refresh with a newer PBF:

```bash
bash scripts/update-db.sh   # wipes and reimports from data/region.osm.pbf

# Then re-run the image cache script to pick up any new wikidata IDs:
uv run scripts/fetch_images.py
```

`update-db.sh` wipes the Postgres volume and reimports from scratch. To also
wipe Docker volumes manually:

```bash
docker compose down -v
bash scripts/setup-local-db.sh
```

---

## Copying the database to another machine

A full Europe import takes 10+ hours. If you need to set up a second machine,
copy the pre-built Docker volume instead of reimporting from scratch.

**Check current database size:**

```bash
docker run --rm -v openinframap_postgres_data:/data alpine du -sh /data
```

**On the source machine** — archive the volume (stop the DB first to avoid torn writes):

```bash
docker compose stop db
docker run --rm \
  -v openinframap_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres_data.tar.gz -C /data .
docker compose start db
```

This produces `postgres_data.tar.gz` in the repo root (~2–4 GB compressed;
Postgres data compresses well). Transfer it to the target machine via scp,
rsync, or a USB drive.

**On the target machine** — restore before running `launch.sh`:

```bash
# Clone the repo and place the archive in the repo root, then:
docker volume create openinframap_postgres_data
docker run --rm \
  -v openinframap_postgres_data:/data \
  -v $(pwd):/backup \
  alpine sh -c "cd /data && tar xzf /backup/postgres_data.tar.gz"
```

Then run the normal setup script — it detects the existing database and skips
the import:

```bash
bash scripts/launch.sh
```

**Wikidata cache** — the `data/wikidata_json/` and `data/images/` directories
are plain files (not Docker volumes). Copy them alongside the archive if you
want offline Wikidata popups on the target machine without re-downloading:

```bash
# On source:
tar czf wikidata_cache.tar.gz data/wikidata_json/ data/images/

# On target (from repo root):
tar xzf wikidata_cache.tar.gz
```

**Optional: copy the imposm cache** — saves time if you ever need to reimport.
Not required for normal operation.

```bash
# On source:
docker compose stop
docker run --rm \
  -v openinframap_imposm_cache:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/imposm_cache.tar.gz -C /data .
docker compose start db tegola

# On target:
docker volume create openinframap_imposm_cache
docker run --rm \
  -v openinframap_imposm_cache:/data \
  -v $(pwd):/backup \
  alpine sh -c "cd /data && tar xzf /backup/imposm_cache.tar.gz"
```

---

## Troubleshooting

_Fill this in as you encounter issues._
