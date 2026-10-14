#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# export-db.sh — save the built database as a ready-made export
#
#   bash scripts/export-db.sh
#
# Writes data/exports/<region>.oimdb (the database) and <region>.json (what's
# in it). Copy the project folder to another computer and build-region.sh /
# launch.sh offer "Import ready-made" for that region: restoring takes minutes
# instead of re-downloading and re-processing the data.
#
# It can also save the project's Docker images (data/exports/docker-images.tar.gz)
# so a computer without internet access can start everything.
#
#   --docker-images      also save the Docker images (default: ask)
#   --no-docker-images   don't save them
#   --yes, -y            don't ask questions
# ---------------------------------------------------------------------------

# shellcheck source=lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"
cd "$REPO_ROOT"

SAVE_IMAGES=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        --docker-images)    SAVE_IMAGES=1; shift ;;
        --no-docker-images) SAVE_IMAGES=0; shift ;;
        --yes|-y)           ASSUME_YES=1; shift ;;
        -h|--help)          sed -n '4,20p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *)                  die "Unknown option: $1" ;;
    esac
done

echo "${BOLD}======================================================${RESET}"
echo "${BOLD} Open Infrastructure Map — export the map database${RESET}"
echo "${BOLD}======================================================${RESET}"

docker info >/dev/null 2>&1 || die "Docker isn't running."
section "Checking the database..."
db_volume_exists || die "There's no map database to export. Build one first: bash scripts/build-region.sh"
start_db
REGION_ID=$(build_info region_id)
[[ -n "$REGION_ID" ]] || die "The map database was never finished, so there's nothing to export."
REGION_NAME=$(build_info region_name)
OSM_TIMESTAMP=$(build_info osm_timestamp)
DB_SIZE=$(db_query "SELECT pg_database_size('$DB_NAME')")
ok "$REGION_NAME (OSM data as of $OSM_TIMESTAMP), $(human_size "$DB_SIZE") in Postgres"

DUMP="$EXPORTS_DIR/$REGION_ID.oimdb"
MANIFEST="$EXPORTS_DIR/$REGION_ID.json"
mkdir -p "$EXPORTS_DIR"
if [[ -f "$MANIFEST" ]]; then
    info "Replaces the existing export from $(manifest_get "$MANIFEST" exported_at)."
fi
# The compressed export is usually well under half the database size.
FREE=$(free_bytes "$EXPORTS_DIR")
if [[ $(( DB_SIZE / 2 )) -gt "$FREE" ]]; then
    ask_yes_no "Only $(human_size "$FREE") free in data/exports/ — that may not be enough. Continue?" n || die "Aborted."
fi

IMAGES=()
while read -r image; do IMAGES+=("$image"); done < <(project_images)
if [[ -z "$SAVE_IMAGES" ]]; then
    section "Docker images"
    info "A computer without internet can't download the Docker images this project"
    info "runs on. Saving them (~450 MB, shared by all exports) lets it start offline."
    SAVE_IMAGES=0
    ask_yes_no "Save the Docker images too?" y && SAVE_IMAGES=1
fi

# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------
section "Exporting..."
# Only the map data, country boundaries, stats and build info. Postgres and
# PostGIS themselves are recreated on import by schema/dev-init.sql.
dump_db() {
    docker compose exec -T db pg_dump -U "$DB_USER" -Fc -Z zstd:3 \
        -n public -n countries -n stats "$DB_NAME" > "$DUMP.part"
    mv "$DUMP.part" "$DUMP"
}
run_with_timer "Exporting the database" dump_db

checksum() {
    sha256sum "$DUMP" | cut -d' ' -f1 > "$DUMP.sha256.tmp"
}
run_with_timer "Computing a checksum" checksum

python3 - "$MANIFEST" <<PY
import json, sys
json.dump({
    "region_id": "$REGION_ID",
    "region_name": $(python3 -c 'import json,sys; print(json.dumps(sys.argv[1]))' "$REGION_NAME"),
    "osm_timestamp": "$OSM_TIMESTAMP",
    "built_at": "$(build_info built_at)",
    "exported_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "git_commit": "$(build_info git_commit)",
    "schema_hash": "$(build_info schema_hash)",
    "eez": "$(build_info eez)",
    "size": $(stat -c%s "$DUMP"),
    "sha256": "$(cat "$DUMP.sha256.tmp")",
}, open(sys.argv[1], "w"), indent=2)
PY
rm -f "$DUMP.sha256.tmp"
ok "$(human_size "$(stat -c%s "$DUMP")") → data/exports/$REGION_ID.oimdb"

if [[ "$SAVE_IMAGES" == 1 ]]; then
    # Make sure every image exists locally (all but db are built from this repo).
    docker compose --progress quiet --profile tools build tegola backend imposm osmium </dev/null
    save_images() {
        docker save "${IMAGES[@]}" | gzip -1 > "$DOCKER_IMAGES_TAR.part"
        mv "$DOCKER_IMAGES_TAR.part" "$DOCKER_IMAGES_TAR"
    }
    run_with_timer "Saving the Docker images" save_images
    ok "$(human_size "$(stat -c%s "$DOCKER_IMAGES_TAR")") → data/exports/$(basename "$DOCKER_IMAGES_TAR")"
fi

log_build "$REGION_ID  exported to data/exports/$REGION_ID.oimdb"

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
echo "${BOLD}======================================================${RESET}"
echo "${BOLD} ${GREEN}✓${RESET}${BOLD} Exported $REGION_NAME${RESET}"
echo "${BOLD}======================================================${RESET}"
echo ""
echo "To use it on another computer, copy this project folder (e.g. to a USB drive)"
echo "and run bash scripts/launch.sh there — it will offer \"Import ready-made\" for"
echo "$REGION_NAME. You can leave out data/osm/ (the raw downloads, $(du -sh "$OSM_DIR" 2>/dev/null | cut -f1)); it's only"
echo "needed to rebuild from scratch."
echo ""
