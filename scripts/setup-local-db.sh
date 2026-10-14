#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# setup-local-db.sh — one-shot database bootstrap for offline local dev
#
# Run from the repo root:
#   bash scripts/setup-local-db.sh
#
# What it does:
#   1. Checks for a PBF file at data/region.osm.pbf
#   2. Starts the 'db' Docker Compose service
#   3. Waits until Postgres is accepting connections
#   4. Runs the imposm import (skipped if data is already present)
#   5. Applies schema/views.sql (skipped if materialized views exist)
#   6. Prints instructions for the EEZ shapefile (manual download required)
#
# Idempotency: re-running after a successful import detects the existing
# tables and skips the heavy steps. To start fresh, remove the volume:
#   docker compose down -v
# ---------------------------------------------------------------------------

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PBF_PATH="$REPO_ROOT/data/region.osm.pbf"
DB_USER=osm
DB_NAME=osm

cd "$REPO_ROOT"

# ---------------------------------------------------------------------------
# 1. Check for the PBF file
# ---------------------------------------------------------------------------
if [[ ! -f "$PBF_PATH" ]]; then
    echo ""
    echo "ERROR: PBF file not found at data/region.osm.pbf"
    echo ""
    echo "Download a Geofabrik regional extract, e.g. Netherlands (~200 MB):"
    echo ""
    echo "  mkdir -p data"
    echo "  curl -L https://download.geofabrik.de/europe/netherlands-latest.osm.pbf \\"
    echo "       -o data/region.osm.pbf"
    echo ""
    echo "Any other Geofabrik region works — rename the file to region.osm.pbf."
    echo "Then re-run this script."
    echo ""
    exit 1
fi

echo "==> Found PBF: $PBF_PATH"

# ---------------------------------------------------------------------------
# 2. Start the DB container
# ---------------------------------------------------------------------------
echo "==> Starting db container..."
docker compose up -d db

# ---------------------------------------------------------------------------
# 3. Wait for Postgres to be ready
#    On a fresh volume the postgis/postgis image runs init scripts (creating
#    the osm user/db) before Postgres accepts connections.  We wait until
#    we can actually run a query as the osm user, not just until pg_isready
#    returns (which can happen before the init scripts finish).
# ---------------------------------------------------------------------------
echo "==> Waiting for Postgres to be ready..."
MAX_WAIT=120
elapsed=0
until docker compose exec -T db psql -U "$DB_USER" "$DB_NAME" -c "SELECT 1" -q >/dev/null 2>&1; do
    if [[ "$elapsed" -ge "$MAX_WAIT" ]]; then
        echo ""
        echo "ERROR: Postgres did not become ready within ${MAX_WAIT}s."
        echo "       Check container logs with: docker compose logs db"
        exit 1
    fi
    echo "    ...not ready yet, retrying in 2s (${elapsed}s elapsed)"
    sleep 2
    elapsed=$((elapsed + 2))
done
echo "    Postgres is accepting connections."

# ---------------------------------------------------------------------------
# 4. Run the imposm import
#    Skip if osm_power_line already exists — that table is created by imposm
#    during a successful import/deployproduction.
# ---------------------------------------------------------------------------
TABLE_EXISTS=$(
    docker compose exec -T db \
        psql -U "$DB_USER" "$DB_NAME" -tAc \
        "SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'osm_power_line'"
)

if [[ "$TABLE_EXISTS" == "1" ]]; then
    echo "==> imposm tables already present — skipping import."
    echo "    Run 'docker compose down -v && bash scripts/setup-local-db.sh' to reimport."
else
    echo "==> Running imposm import (may take several minutes for a regional PBF)..."
    docker compose run --rm --build \
        -v "$PBF_PATH:/data.osm.pbf:z" \
        imposm import \
        -connection "postgis://osm:osm@db/osm" \
        -mapping /mapping.json \
        -read /data.osm.pbf \
        -write \
        -optimize \
        -deployproduction
    echo "==> imposm import complete."
fi

# ---------------------------------------------------------------------------
# 5. Apply schema/views.sql
#    The file contains CREATE MATERIALIZED VIEW (not idempotent), so skip if
#    power_substation_relation already exists.
# ---------------------------------------------------------------------------
VIEWS_EXIST=$(
    docker compose exec -T db \
        psql -U "$DB_USER" "$DB_NAME" -tAc \
        "SELECT 1 FROM pg_matviews WHERE matviewname = 'power_substation_relation'"
)

if [[ "$VIEWS_EXIST" == "1" ]]; then
    echo "==> schema/views.sql already applied — skipping."
else
    echo "==> Applying schema/views.sql..."
    docker compose exec -T db psql -U "$DB_USER" "$DB_NAME" < schema/views.sql
    echo "==> Views applied."
fi

# ---------------------------------------------------------------------------
# 6. Apply schema/stats.sql
#    Creates the stats schema and tables used by the web-backend /stats page.
#    Tables are empty locally (no historical data), but their existence is
#    required — the backend queries them on every /stats request.
#    Skip if the stats schema already exists.
# ---------------------------------------------------------------------------
STATS_EXIST=$(
    docker compose exec -T db \
        psql -U "$DB_USER" "$DB_NAME" -tAc \
        "SELECT 1 FROM information_schema.schemata WHERE schema_name = 'stats'"
)

if [[ "$STATS_EXIST" == "1" ]]; then
    echo "==> stats schema already present — skipping."
else
    echo "==> Applying schema/stats.sql..."
    docker compose exec -T db psql -U "$DB_USER" "$DB_NAME" < schema/stats.sql
    echo "==> Stats schema applied."
fi

# ---------------------------------------------------------------------------
# 7. Done
# ---------------------------------------------------------------------------
echo ""
echo "========================================================"
echo " Local database is ready."
echo "========================================================"
echo ""
echo "WHAT WORKS NOW:"
echo "  - Map tiles via Tegola (run 'docker compose up tegola')"
echo "  - Wikidata info popups (proxied through the web-backend)"
echo ""
echo "WHAT DOESN'T WORK YET — EEZ country boundaries (manual step):"
echo ""
echo "  The /search and /stats/area/* endpoints JOIN against a"
echo "  'countries.country_eez_sub' materialized view that must be imported"
echo "  separately. Without it those endpoints return 500 errors."
echo "  (/wikidata/* works fine without EEZ data.)"
echo ""
echo "  Step 1 — Download the shapefile:"
echo "    Go to https://marineregions.org/sources.php#unioneezcountry"
echo "    Download 'Marine and Land Zones: Union of the EEZ and land'"
echo "    (free, but requires filling in a short form with name/email)."
echo "    You want: EEZ_land_union_v4_202410.shp (plus .dbf / .prj / .shx)"
echo ""
echo "  Step 2 — Import into the DB:"
echo "    docker compose exec db psql -U osm osm -c 'CREATE SCHEMA IF NOT EXISTS countries;'"
echo "    shp2pgsql -s 4326 -d ./EEZ_land_union_v4_202410.shp countries.country_eez \\"
echo "      | docker compose exec -T db psql -U osm osm"
echo ""
echo "  Step 3 — Create the materialized views and indexes:"
echo "    (Copy the SQL block from imposm/README.md — the CREATE MATERIALIZED VIEW"
echo "     countries.country_eez_sub section — and run it in:)"
echo "    docker compose exec db psql -U osm osm"
echo ""
echo "STARTING THE STACK:"
echo "  Backend:  cd web-backend && cp .env.example .env && uv run uvicorn src.main:app --reload --port 8001"
echo "  Frontend: cd web && cp .env.example .env && npm install && npm run dev"
echo ""
