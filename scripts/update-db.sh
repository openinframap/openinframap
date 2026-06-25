#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# update-db.sh — wipe and reimport the database from data/region.osm.pbf
#
# Use this when you:
#   - Replace data/region.osm.pbf with a newer or different extract
#   - Want to start fresh
#
# Run from the repo root:
#   bash scripts/update-db.sh
#
# EEZ data (for search + area pages) is reimported automatically if
# data/EEZ_land_union_v4_202410.zip is present.
# ---------------------------------------------------------------------------

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="$REPO_ROOT/data"
EEZ_ZIP="$DATA_DIR/EEZ_land_union_v4_202410.zip"
DB_USER=osm
DB_NAME=osm

cd "$REPO_ROOT"

# ---------------------------------------------------------------------------
# Confirm
# ---------------------------------------------------------------------------
echo "This will wipe the entire database and reimport from:"
echo "  $DATA_DIR/region.osm.pbf"
echo ""
echo "EEZ data will be reimported automatically if the zip is in data/."
echo ""
read -r -p "Continue? [y/N] " confirm || { echo "Aborted."; exit 1; }
if [[ "${confirm,,}" != "y" ]]; then
    echo "Aborted."
    exit 0
fi

# ---------------------------------------------------------------------------
# Wipe all database volumes
# ---------------------------------------------------------------------------
echo ""
echo "==> Stopping containers and wiping database volumes..."
docker compose down -v

# ---------------------------------------------------------------------------
# Reimport OSM data + views
# ---------------------------------------------------------------------------
echo ""
bash "$REPO_ROOT/scripts/setup-local-db.sh"

# ---------------------------------------------------------------------------
# Reimport EEZ (automatic if zip exists in data/)
# ---------------------------------------------------------------------------
EEZ_SHP=$(find "$DATA_DIR" -name "EEZ_land_union_v4_202410.shp" 2>/dev/null | head -1 || true)

if [[ -z "$EEZ_SHP" && -f "$EEZ_ZIP" ]]; then
    echo ""
    echo "==> Extracting EEZ zip..."
    unzip -o "$EEZ_ZIP" -d "$DATA_DIR"
    EEZ_SHP=$(find "$DATA_DIR" -name "EEZ_land_union_v4_202410.shp" | head -1)
fi

if [[ -n "$EEZ_SHP" ]]; then
    echo ""
    echo "==> Reimporting EEZ country boundaries..."
    docker compose exec -T db psql -U "$DB_USER" "$DB_NAME" \
        -c "CREATE SCHEMA IF NOT EXISTS countries;"

    shp2pgsql -s 4326 -d "$EEZ_SHP" countries.country_eez \
        | docker compose exec -T db psql -U "$DB_USER" "$DB_NAME"

    echo "==> Creating EEZ materialized views..."
    cat <<'SQL' | docker compose exec -T db psql -U "$DB_USER" "$DB_NAME"
CREATE MATERIALIZED VIEW countries.country_eez_sub AS
    SELECT country_eez.gid,
        country_eez."union",
        country_eez.mrgid_eez,
        country_eez.territory1,
        country_eez.mrgid_ter1,
        country_eez.iso_ter1,
        country_eez.iso_sov1,
        country_eez.pol_type,
        ST_Subdivide(ST_Transform(country_eez.geom, 3857)) AS geom
    FROM countries.country_eez
    WHERE country_eez."union"::text <> 'Antarctica'::text;

CREATE INDEX country_eez_sub_geom     ON countries.country_eez_sub USING GIST (geom);
CREATE INDEX country_eez_sub_iso_sov1 ON countries.country_eez_sub(iso_sov1);
CREATE INDEX country_eez_sub_iso_ter1 ON countries.country_eez_sub(iso_ter1);

CREATE MATERIALIZED VIEW countries.country_eez_3857 AS
    SELECT country_eez.gid,
        country_eez."union",
        country_eez.mrgid_eez,
        country_eez.territory1,
        country_eez.mrgid_ter1,
        country_eez.iso_ter1,
        country_eez.iso_sov1,
        country_eez.pol_type,
        ST_Transform(country_eez.geom, 3857) AS geom
    FROM countries.country_eez
    WHERE country_eez."union"::text <> 'Antarctica'::text;

CREATE INDEX country_eez_3857_geom ON countries.country_eez_3857 USING GIST (geom);
SQL
    echo "==> EEZ import complete."
else
    echo ""
    echo "NOTE: EEZ zip not found in data/ — skipping EEZ import."
    echo "      Search and area/stats pages will return errors until EEZ is imported."
    echo "      Run bash scripts/launch.sh to import it interactively."
fi

# ---------------------------------------------------------------------------
# Restart Tegola so it picks up the fresh database
# ---------------------------------------------------------------------------
echo ""
echo "==> Restarting Tegola..."
docker compose up -d tegola

# ---------------------------------------------------------------------------
# Wikidata image cache
# ---------------------------------------------------------------------------
echo ""
echo "==> Caching Wikidata entity data and images (skips already-cached)..."
uv run "$REPO_ROOT/scripts/fetch_images.py"

echo ""
echo "======================================================"
echo " Database update complete."
echo "======================================================"
echo ""
echo "If the backend is running, restart it to clear its connection pool:"
echo "  Ctrl+C in the uvicorn terminal, then:"
echo "  cd web-backend && uv run uvicorn main:app --reload"
echo ""
