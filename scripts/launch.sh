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
# To build a different region later, run: bash scripts/build-region.sh
# ---------------------------------------------------------------------------

# shellcheck source=lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"
cd "$REPO_ROOT"

echo "${BOLD}======================================================${RESET}"
echo "${BOLD} Open Infrastructure Map — local dev setup${RESET}"
echo "${BOLD}======================================================${RESET}"

# ---------------------------------------------------------------------------
# 1. Prerequisites — report, never install
# ---------------------------------------------------------------------------
section "Checking prerequisites..."
MISSING=0
check_cmd docker  "https://docs.docker.com/get-docker/"         || MISSING=1
check_cmd node    "https://nodejs.org/"                         || MISSING=1
check_cmd npm     "comes with Node.js"                          || MISSING=1
check_cmd curl    "dnf install curl  /  apt install curl"       || MISSING=1
check_cmd python3 "dnf install python3  /  apt install python3" || MISSING=1
check_cmd unzip   "dnf install unzip  /  apt install unzip"     || MISSING=1
[[ "$MISSING" == 0 ]] || die "Install the missing tools above, then re-run this script."
# Optional: only needed for the Wikidata cache and to run the backend outside Docker.
check_cmd uv      "optional — https://docs.astral.sh/uv/ (for the offline Wikidata cache)" || true

# ---------------------------------------------------------------------------
# 2. Database — build one unless a finished build already exists
# ---------------------------------------------------------------------------
section "Checking the map database..."
REGION=""
if db_volume_exists; then
    start_db
    REGION=$(build_info region_name)
fi

if [[ -n "$REGION" ]]; then
    ok "Already built: $REGION (OSM data as of $(build_info osm_timestamp))"
    if ! ask_yes_no "Keep it?" y; then
        bash "$REPO_ROOT/scripts/build-region.sh" --no-images
    fi
else
    info "No map database yet — let's build one."
    bash "$REPO_ROOT/scripts/build-region.sh" --no-images
fi

# ---------------------------------------------------------------------------
# 3. Frontend .env
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
# Basemap tiles come from openinframap.org. To use your own Protomaps-schema
# tile server instead, set a full URL template:
# VITE_BASEMAP_URL=http://localhost:8080/region/{z}/{x}/{y}.mvt
EOF
fi

# ---------------------------------------------------------------------------
# 4. Backend .env
# ---------------------------------------------------------------------------
BACKEND_ENV="$REPO_ROOT/web-backend/.env"
if [[ -f "$BACKEND_ENV" ]]; then
    section "web-backend/.env already exists — skipping."
    # The backend now uses SQLAlchemy's async engine, which needs the asyncpg driver scheme.
    if grep -q '^DATABASE_URL=postgresql://' "$BACKEND_ENV"; then
        sed -i.bak 's#^DATABASE_URL=postgresql://#DATABASE_URL=postgresql+asyncpg://#' "$BACKEND_ENV"
        info "Updated DATABASE_URL to use postgresql+asyncpg:// (backup: .env.bak)"
    fi
else
    section "Creating web-backend/.env..."
    cat > "$BACKEND_ENV" <<'EOF'
DATABASE_URL=postgresql+asyncpg://osm:osm@localhost:5432/osm
EOF
fi

# ---------------------------------------------------------------------------
# 5. Tile server
# ---------------------------------------------------------------------------
section "Starting the Tegola tile server..."
docker compose --progress quiet up -d tegola </dev/null
ok "Running on http://localhost:7800"

# ---------------------------------------------------------------------------
# 6. Start the app — each server in its own terminal window
# ---------------------------------------------------------------------------
section "Starting the app"
STARTED=0
if port_in_use "$BACKEND_PORT" && port_in_use "$FRONTEND_PORT"; then
    ok "The app is already running: $APP_URL"
    STARTED=1
elif ask_yes_no "Start the app now? (backend in Docker, frontend in a new terminal window, then your browser)" y; then
    if start_app; then
        STARTED=1
    else
        warn "Couldn't open a terminal window automatically (no supported terminal found)."
    fi
fi

# ---------------------------------------------------------------------------
# 7. Wikidata cache — asked last: it's optional and can take a long time, and
#    the app can already run (and pick up cached files) while it fills
# ---------------------------------------------------------------------------
section "Wikidata cache for info popups"
offer_image_cache

# ---------------------------------------------------------------------------
# 8. Done
# ---------------------------------------------------------------------------
echo ""
echo "${BOLD}======================================================${RESET}"
echo "${BOLD} Setup complete!${RESET}"
echo "${BOLD}======================================================${RESET}"
echo ""
if [[ "$STARTED" == 1 ]]; then
    echo "The app is running at: $APP_URL"
else
    print_manual_start
fi
echo ""
echo "Later:"
echo "  bash scripts/start.sh              # start everything and open the map (no questions)"
echo "  bash scripts/build-region.sh       # switch to another region / refresh the data"
echo "  uv run scripts/fetch_images.py     # cache Wikidata text + images for offline popups (slow)"
echo ""
