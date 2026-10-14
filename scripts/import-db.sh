#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# import-db.sh — load a ready-made export instead of building from scratch
#
#   bash scripts/import-db.sh data/exports/russia.oimdb
#
# Exports are made by scripts/export-db.sh. build-region.sh and launch.sh list
# the ones in data/exports/ and call this script, so you rarely run it directly.
# Works without internet access if data/exports/docker-images.tar.gz is there.
#
#   --yes, -y   don't ask before replacing the current database
# ---------------------------------------------------------------------------

# shellcheck source=lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"
cd "$REPO_ROOT"

DUMP=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        --yes|-y)  ASSUME_YES=1; shift ;;
        -h|--help) sed -n '4,13p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
        -*)        die "Unknown option: $1" ;;
        *)         DUMP="$1"; shift ;;
    esac
done
[[ -n "$DUMP" ]] || die "Usage: bash scripts/import-db.sh data/exports/<region>.oimdb"
DUMP="${DUMP%.json}"; DUMP="${DUMP%.oimdb}.oimdb"
MANIFEST="${DUMP%.oimdb}.json"
[[ -f "$DUMP" ]] || die "Export not found: $DUMP"
[[ -f "$MANIFEST" ]] || die "The export's description is missing: $MANIFEST"

REGION_ID=$(manifest_get "$MANIFEST" region_id)
REGION_NAME=$(manifest_get "$MANIFEST" region_name)
OSM_TIMESTAMP=$(manifest_get "$MANIFEST" osm_timestamp)

echo "${BOLD}======================================================${RESET}"
echo "${BOLD} Open Infrastructure Map — import a ready-made database${RESET}"
echo "${BOLD}======================================================${RESET}"
section "Importing $REGION_NAME"
info "OSM data as of $OSM_TIMESTAMP, exported $(manifest_get "$MANIFEST" exported_at)"
info "$(human_size "$(stat -c%s "$DUMP")") — $DUMP"

docker info >/dev/null 2>&1 || die "Docker isn't running. Start Docker, then re-run this script."

# ---------------------------------------------------------------------------
# Docker images — load them from the export folder when they're missing
# (e.g. on a computer without internet access). This has to
# happen before anything starts a container, or Docker tries to download them.
# ---------------------------------------------------------------------------
MISSING_IMAGES=0
while read -r image; do
    docker image inspect "$image" >/dev/null 2>&1 || MISSING_IMAGES=1
done < <(project_images)
if [[ "$MISSING_IMAGES" == 1 && -f "$DOCKER_IMAGES_TAR" ]]; then
    load_images() {
        gunzip -c "$DOCKER_IMAGES_TAR" | docker load
    }
    run_with_timer "Loading Docker images from data/exports/" load_images
fi


# A different import mapping or views means the export doesn't match this code.
EXPORT_HASH=$(manifest_get "$MANIFEST" schema_hash)
if [[ -n "$EXPORT_HASH" && "$EXPORT_HASH" != "$(schema_hash)" ]]; then
    warn "This export was made with a different version of the project (commit"
    warn "$(manifest_get "$MANIFEST" git_commit)). It will probably work, but some map layers may be"
    warn "missing or broken. Rebuilding the region from scratch avoids that."
    ask_yes_no "Import it anyway?" y || die "Aborted — nothing was changed."
fi

if db_volume_exists; then
    start_db
    EXISTING=$(build_info region_name)
    info "This replaces your current database${EXISTING:+ ($EXISTING)}."
    ask_yes_no "Continue?" y || die "Aborted — nothing was changed."
fi

START=$SECONDS

# ---------------------------------------------------------------------------
# Verify, then restore into a fresh database
# ---------------------------------------------------------------------------
verify() {
    [[ "$(sha256sum "$DUMP" | cut -d' ' -f1)" == "$(manifest_get "$MANIFEST" sha256)" ]] \
        || { echo "The export file is damaged (checksum mismatch) — copy it again." >&2; return 1; }
}
run_with_timer "Checking the export isn't damaged" verify

section "Restoring..."
log_build "$REGION_ID  import started from $(basename "$DUMP")"
trap 'status=$?; [[ "$status" == 0 ]] || log_build "$REGION_ID  import FAILED (exit $status)"' EXIT
docker compose --progress quiet down -v --remove-orphans
start_db
ok "Fresh database ready."

restore() {
    # A fresh database already has PostGIS, its spatial_ref_sys table and the
    # helper functions from schema/functions.sql, so leave out of the restore
    # every function that already exists. (Functions from views.sql, which
    # Tegola needs, aren't there yet and do get restored.)
    db_query "SELECT DISTINCT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
              WHERE n.nspname = 'public'" > "$EXPORTS_DIR/.existing-functions"
    docker compose exec -T db pg_restore -l < "$DUMP" \
        | awk 'NR == FNR { existing[$1] = 1; next }
               ($4 == "FUNCTION" || $4 == "AGGREGATE") && $5 == "public" {
                   name = $6; sub(/\(.*/, "", name); if (name in existing) next }
               / SCHEMA - public / || / TABLE DATA public spatial_ref_sys / { next }
               { print }' "$EXPORTS_DIR/.existing-functions" - \
        > "$EXPORTS_DIR/.restore-list"
    rm -f "$EXPORTS_DIR/.existing-functions"
    docker compose cp "$EXPORTS_DIR/.restore-list" db:/tmp/restore-list
    rm -f "$EXPORTS_DIR/.restore-list"
    docker compose exec -T db pg_restore -U "$DB_USER" -d "$DB_NAME" \
        --no-owner --no-privileges --exit-on-error -L /tmp/restore-list < "$DUMP"
}
run_with_timer "Restoring the database" restore

# Recreate Tegola so it doesn't serve tiles cached from the old data.
docker compose --progress quiet up -d --force-recreate tegola </dev/null
ok "Tile server running on http://localhost:7800"

ELAPSED=$((SECONDS - START))
log_build "$REGION_ID  imported in $((ELAPSED / 60))m $((ELAPSED % 60))s (OSM data as of $OSM_TIMESTAMP)"
echo ""
echo "${BOLD}======================================================${RESET}"
echo "${BOLD} ${GREEN}✓${RESET}${BOLD} $REGION_NAME is imported${RESET}"
echo "${BOLD}======================================================${RESET}"
info "Took $((ELAPSED / 60))m $((ELAPSED % 60))s."
info "Start the app with: bash scripts/start.sh"
