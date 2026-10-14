#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# start.sh — start everything and open the map. No questions asked.
#
#   bash scripts/start.sh
#
# Starts the database and Tegola (Docker), opens the backend and frontend in
# their own terminal windows, and opens http://localhost:5173 once it's up.
# Anything already running is left alone. Needs a database built by
# scripts/launch.sh (first-time setup) or scripts/build-region.sh.
# ---------------------------------------------------------------------------

# shellcheck source=lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"
cd "$REPO_ROOT"

docker info >/dev/null 2>&1 || die "Docker isn't running. Start Docker, then re-run this script."

section "Starting the database and tile server..."
db_volume_exists || die "There's no map database yet. Run the first-time setup: bash scripts/launch.sh"
start_db
REGION=$(build_info region_name)
[[ -n "$REGION" ]] || die "The map database was never finished. Build it with: bash scripts/build-region.sh"
ok "Map database: $REGION (OSM data as of $(build_info osm_timestamp))"
docker compose --progress quiet up -d tegola </dev/null
ok "Tile server running on http://localhost:7800"

section "Starting the app..."
if ! start_app; then
    warn "Couldn't open a terminal window automatically (no supported terminal found)."
    echo ""
    print_manual_start
fi
echo ""
info "Stop the database and tile server with: docker compose stop"
