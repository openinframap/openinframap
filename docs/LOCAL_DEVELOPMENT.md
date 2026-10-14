# Local Development

This guide gets you from a fresh clone to a fully offline working stack
(frontend + backend + database + cached Wikidata images). After setup, no
requests go to `openinframap.org` at runtime.

---

## Prerequisites

| Tool | Minimum version | Notes |
|------|----------------|-------|
| Docker + Compose v2 | Docker 24 | `docker compose` (not `docker-compose`) |
| [uv](https://docs.astral.sh/uv/) | any recent | Optional: for the Wikidata cache script, and to run the backend outside Docker |
| Node.js + npm | Node 20 | Used by the frontend |
| curl, python3, unzip | any | Used by the setup scripts |
| Free disk space | depends on region | The raw Geofabrik extract (46 MB for Luxembourg, 33 GB for Europe) plus a few GB for Docker. The script checks before starting. |

---

## Step-by-step setup

### 1. Clone the repository

```bash
git clone <your-fork-url>
cd openinframap
```

### 2. Build the map database

```bash
bash scripts/build-region.sh
```

It asks which region you want (a continent, a tiny test region, or any
country/state from [Geofabrik](https://download.geofabrik.de) by name, or the whole
world — a ~95 GB download from planet.openstreetmap.org that takes a few hours
to build), then:

- Downloads the extract to `data/osm/` (resumable, checksum-verified, reused on re-runs)
- Filters it down to infrastructure with osmium (`scripts/osm_filter.py` derives the
  filter from the imposm mapping, so the imported data is identical, just ~100× faster)
- **Wipes** the local database and imports the region with imposm
- Applies `schema/views.sql` and `schema/stats.sql`
- Imports the EEZ country boundaries (see [below](#eez-country-boundaries))
- Restarts Tegola
- Optionally caches Wikidata images (step 4)

All questions come first; after that it runs unattended. For a quick test pick
**Luxembourg** (under a minute). Run it again any time to switch region or
refresh the data.

Unattended, e.g. on a server:

```bash
bash scripts/build-region.sh --region europe --yes
bash scripts/build-region.sh --pbf ~/my-extract.osm.pbf --yes
```

`bash scripts/launch.sh` runs this automatically if no database exists yet,
and also creates the `.env` files and offers to start the app (steps 4 and 5)
in new terminal windows and open it in your browser. After the first setup,
`bash scripts/start.sh` starts everything and opens the map without asking
anything.

### 3. Cache Wikidata images and metadata (optional but recommended)

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

### 4. Start the backend

The backend runs in Docker (`start.sh` and `launch.sh` do this for you):

```bash
docker compose up -d backend
docker compose logs -f backend   # its log
```

It listens on `http://localhost:8001` and reads the Wikidata cache from `data/`.

**Developing the backend?** Stop the container (`docker compose stop backend`)
and run it on the host instead, with auto-reload:

```bash
cd web-backend
cp .env.example .env
uv run uvicorn src.main:app --reload --port 8001
```

### 5. Configure and start the frontend

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
npm start
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

### Works after image cache step (step 3)

- **Offline Wikidata popups** — labels, Wikipedia/Commons links, thumbnails all served from disk;
  no network required
- **P361 "part of" hierarchy** — parent entities (e.g. a wind farm for a turbine) are also cached

### EEZ country boundaries

The EEZ (maritime boundary) shapefile comes from
[marineregions.org](https://www.marineregions.org/sources.php#unioneezcountry), which asks you to
fill in a short form, so it's the one manual download. `build-region.sh` opens the page for you and
picks the zip up from `~/Downloads` or `data/`. Once it's there, every later build imports it
automatically. Without it, these don't work:

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

There is no continuous diff update. To refresh with the latest Geofabrik extract,
re-run the build. Downloads are kept in `data/osm/` and reused, so a wiped or
rebuilt database never means re-downloading. If Geofabrik has a newer extract,
the script asks whether to download it (the default is to keep yours; pass
`--refresh` to always take the newer one). The script lists what's already
downloaded when it starts, and `data/osm/build-history.log` records every build
and whether it finished.

```bash
bash scripts/build-region.sh

# Then re-run the image cache script to pick up any new wikidata IDs:
uv run scripts/fetch_images.py
```

---

## Sharing a built database (export / import)

Building a big region takes time, and the whole world takes hours. Once it's
built, save it as a ready-made export:

```bash
bash scripts/export-db.sh
```

This writes `data/exports/<region>.oimdb` (the database, compressed; Luxembourg
is 23 MB) and `<region>.json` (region, OSM data date, checksum). It also offers
to save the project's Docker images to `data/exports/docker-images.tar.gz`
(~250 MB, shared by all exports) so a computer **without internet access** can
run it.

To use it on another computer, copy the project folder (e.g. to a USB drive)
and run `bash scripts/launch.sh` (or `bash scripts/build-region.sh`) there. The
region menu marks the region as **"✓ ready-made export — imports in minutes"**;
choosing it restores the database instead of downloading and processing the
data. You can leave `data/osm/` (the raw downloads) out of the copy: it's only
needed to rebuild from scratch. Keep `data/images/` and `data/wikidata_json/`
for offline popups, and `data/EEZ_*` for future rebuilds.

```bash
bash scripts/import-db.sh data/exports/russia.oimdb   # import directly
bash scripts/build-region.sh --region russia --rebuild   # ignore the export, rebuild
```

The import checks the file's checksum (catching a damaged copy) and warns if
the export was made with a different version of the import mapping or views.
Without internet access, the menu only lists exports, earlier downloads and
local `.osm.pbf` files.

**Offline limits:** the background map still comes from openinframap.org (set
`VITE_BASEMAP_URL` for your own tile server). Everything else runs offline: the
database, Tegola and the backend come from the saved Docker images, and the
frontend from the copied `web/node_modules/` (Node.js and npm must be installed).

---

## Troubleshooting

_Fill this in as you encounter issues._
