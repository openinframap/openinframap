#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# launch.sh — full local dev setup for a new contributor
#
# Run once from the repo root:
#   bash scripts/launch.sh
#
# Re-running is safe — every step checks whether it's already done.
# Missing packages are reported but never installed automatically.
# ---------------------------------------------------------------------------

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="$REPO_ROOT/data"
EEZ_ZIP="$DATA_DIR/EEZ_land_union_v4_202410.zip"
EEZ_DOWNLOAD_URL="https://marineregions.org/download_file.php?name=EEZ_land_union_v4_202410.zip"
DB_USER=osm
DB_NAME=osm

cd "$REPO_ROOT"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

open_browser() {
    local url="$1"
    if command -v xdg-open &>/dev/null; then
        xdg-open "$url" 2>/dev/null &
    elif command -v open &>/dev/null; then
        open "$url"
    else
        echo "    Open this URL in your browser:"
        echo "    $url"
    fi
}

check_cmd() {
    local cmd="$1" hint="$2"
    if command -v "$cmd" &>/dev/null; then
        printf "  %-12s OK\n" "$cmd"
    else
        printf "  %-12s MISSING — %s\n" "$cmd" "$hint"
        return 1
    fi
}

section() { echo ""; echo "==> $*"; }

# ---------------------------------------------------------------------------
# 1. Prerequisites — report, never install
# ---------------------------------------------------------------------------
echo "======================================================"
echo " Open Infrastructure Map — local dev setup"
echo "======================================================"

section "Checking prerequisites..."
MISSING=0
check_cmd docker     "https://docs.docker.com/get-docker/"          || MISSING=1
check_cmd uv         "https://docs.astral.sh/uv/"                   || MISSING=1
check_cmd node       "https://nodejs.org/"                          || MISSING=1
check_cmd npm        "comes with Node.js"                           || MISSING=1
check_cmd unzip      "dnf install unzip  /  apt install unzip"      || MISSING=1
check_cmd shp2pgsql  "dnf install postgis-client  /  apt install postgis"  || MISSING=1

if [[ "$MISSING" -eq 1 ]]; then
    echo ""
    echo "ERROR: Install the missing tools above, then re-run this script."
    exit 1
fi

# ---------------------------------------------------------------------------
# 2. PBF check + DB import (delegates to setup-local-db.sh)
# ---------------------------------------------------------------------------
section "Running database setup..."
bash "$REPO_ROOT/scripts/setup-local-db.sh"

# ---------------------------------------------------------------------------
# 3. EEZ country boundaries
# ---------------------------------------------------------------------------
EEZ_DONE=$(
    docker compose exec -T db \
        psql -U "$DB_USER" "$DB_NAME" -tAc \
        "SELECT 1 FROM pg_matviews
         WHERE schemaname = 'countries' AND matviewname = 'country_eez_sub'"
)

if [[ "$EEZ_DONE" == "1" ]]; then
    section "EEZ data already imported — skipping."
else
    section "EEZ country boundaries needed."
    echo ""
    echo "  The search endpoint and area/stats pages require an EEZ shapefile"
    echo "  from marineregions.org. It is free but needs a short download form."
    echo ""

    mkdir -p "$DATA_DIR"

    # Locate the zip — accept it in data/ or in ~/Downloads
    if [[ ! -f "$EEZ_ZIP" ]]; then
        DOWNLOADS_ZIP="$HOME/Downloads/EEZ_land_union_v4_202410.zip"
        if [[ -f "$DOWNLOADS_ZIP" ]]; then
            echo "  Found zip in ~/Downloads — copying to data/..."
            cp "$DOWNLOADS_ZIP" "$EEZ_ZIP"
        fi
    fi

    if [[ ! -f "$EEZ_ZIP" ]]; then
        echo "  Opening download page in your browser..."
        open_browser "$EEZ_DOWNLOAD_URL"
        echo ""
        echo "  Fill in the form and save the file as:"
        echo "    $EEZ_ZIP"
        echo ""
        echo "  (You can also save it to ~/Downloads — this script will find it there.)"
        echo ""
        read -r -p "  Press Enter once the download is complete..." || {
            echo ""
            echo "Aborted."
            exit 1
        }
        echo ""

        # Check again after user confirms
        if [[ -f "$HOME/Downloads/EEZ_land_union_v4_202410.zip" && ! -f "$EEZ_ZIP" ]]; then
            cp "$HOME/Downloads/EEZ_land_union_v4_202410.zip" "$EEZ_ZIP"
        fi

        if [[ ! -f "$EEZ_ZIP" ]]; then
            echo "ERROR: zip not found at $EEZ_ZIP"
            echo "       Place the downloaded zip there and re-run this script."
            exit 1
        fi
    fi

    # Extract — the zip may contain files at the root or inside a subdirectory
    echo "  Extracting zip..."
    unzip -o "$EEZ_ZIP" -d "$DATA_DIR"

    # Find the .shp wherever it landed
    EEZ_SHP=$(find "$DATA_DIR" -name "EEZ_land_union_v4_202410.shp" | head -1)
    if [[ -z "$EEZ_SHP" ]]; then
        echo "ERROR: EEZ_land_union_v4_202410.shp not found after extraction."
        echo "       Check the zip contents: unzip -l $EEZ_ZIP"
        exit 1
    fi

    echo "  Found shapefile: $EEZ_SHP"

    section "Creating countries schema..."
    docker compose exec -T db psql -U "$DB_USER" "$DB_NAME" \
        -c "CREATE SCHEMA IF NOT EXISTS countries;"

    section "Importing EEZ shapefile (takes about a minute)..."
    shp2pgsql -s 4326 -d "$EEZ_SHP" countries.country_eez \
        | docker compose exec -T db psql -U "$DB_USER" "$DB_NAME"

    section "Creating EEZ materialized views and indexes..."
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

CREATE INDEX country_eez_sub_geom    ON countries.country_eez_sub USING GIST (geom);
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
    echo "  EEZ import complete."
fi

# ---------------------------------------------------------------------------
# 4. Frontend .env
# ---------------------------------------------------------------------------
WEB_ENV="$REPO_ROOT/web/.env"
if [[ -f "$WEB_ENV" ]]; then
    section "web/.env already exists — skipping."
else
    section "Creating web/.env..."
    cat > "$WEB_ENV" <<'EOF'
VITE_TILE_BASE_URL=https://openinframap.org
VITE_TEGOLA_URL=http://localhost:7800
VITE_BACKEND_BASE_URL=http://localhost:8001
EOF
fi

# ---------------------------------------------------------------------------
# 5. Backend .env
# ---------------------------------------------------------------------------
BACKEND_ENV="$REPO_ROOT/web-backend/.env"
if [[ -f "$BACKEND_ENV" ]]; then
    section "web-backend/.env already exists — skipping."
    # The backend now uses SQLAlchemy's async engine, which needs the asyncpg driver scheme.
    if grep -q '^DATABASE_URL=postgresql://' "$BACKEND_ENV"; then
        sed -i.bak 's#^DATABASE_URL=postgresql://#DATABASE_URL=postgresql+asyncpg://#' "$BACKEND_ENV"
        echo "    Updated DATABASE_URL to use postgresql+asyncpg:// (backup: .env.bak)"
    fi
else
    section "Creating web-backend/.env..."
    cat > "$BACKEND_ENV" <<'EOF'
DATABASE_URL=postgresql+asyncpg://osm:osm@localhost:5432/osm
EOF
fi

# ---------------------------------------------------------------------------
# 6. Start Docker services
# ---------------------------------------------------------------------------
section "Starting Tegola tile server..."
docker compose up -d tegola

# ---------------------------------------------------------------------------
# 7. Wikidata image cache
# ---------------------------------------------------------------------------
section "Caching Wikidata entity data and images (skips already-cached)..."
uv run scripts/fetch_images.py

# ---------------------------------------------------------------------------
# 8. Done
# ---------------------------------------------------------------------------
echo ""
echo "======================================================"
echo " Setup complete!"
echo "======================================================"
echo ""
echo "Start the stack in two separate terminals:"
echo ""
echo "  Terminal 1 (backend):"
echo "    cd web-backend && uv run uvicorn src.main:app --reload --port 8001"
echo ""
echo "  Terminal 2 (frontend):"
echo "    cd web && npm install && npm run dev"
echo ""
echo "  Then open: http://localhost:5173"
echo ""
echo "What works:"
echo "  - Map with local infrastructure tiles (power, telecoms, etc.)"
echo "  - Wikidata info popups (offline — served from local cache)"
echo "  - Search"
echo "  - Area/stats pages"
echo ""
