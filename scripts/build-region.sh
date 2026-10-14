#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# build-region.sh — build the local OpenInfraMap database for one region
#
# Interactive:
#   bash scripts/build-region.sh
#
# Unattended (e.g. for building the downloadable database dumps):
#   bash scripts/build-region.sh --region europe --yes
#   bash scripts/build-region.sh --pbf ~/planet.osm.pbf --yes
#
# Steps: pick a Geofabrik region → download it (resumable, checksum-verified)
# → filter it down to infrastructure with osmium → wipe the local database
# → import with imposm → create views → import EEZ country boundaries →
# restart Tegola → optionally cache Wikidata images.
#
# All questions are asked up front; after that it runs unattended.
# Downloads and filtered extracts are kept in data/osm/ and reused.
# ---------------------------------------------------------------------------

# shellcheck source=lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"
cd "$REPO_ROOT"

GEOFABRIK_INDEX_URL="https://download.geofabrik.de/index-v1-nogeom.json"
GEOFABRIK_INDEX="$OSM_DIR/geofabrik-index.json"
CONTINENTS=(africa antarctica asia australia-oceania central-america europe north-america russia south-america)
TEST_REGION=luxembourg
# The whole world isn't a Geofabrik region; it comes from openstreetmap.org (weekly).
PLANET_ID=planet
PLANET_URL="https://planet.openstreetmap.org/pbf/planet-latest.osm.pbf"

usage() {
    cat <<EOF
Usage: bash scripts/build-region.sh [options]

  --region ID     Geofabrik region id, e.g. europe, africa, france, california,
                  or "planet" for the whole world (very slow: ~95 GB download)
  --pbf FILE      Use an .osm.pbf file you already have instead of downloading
  --images        Also cache Wikidata images (slow: can take hours)
  --no-images     Don't cache Wikidata images and don't ask about it
  --no-filter     Import the extract as-is, without the osmium pre-filter
  --rebuild       Build from scratch even if data/exports/ has a ready-made export
  --refresh       Download a newer Geofabrik extract if there is one (by default
                  an extract you already downloaded is reused, and you're asked)
  --yes, -y       Don't ask questions; accept the defaults (wipes the database!)
  -h, --help      Show this help
EOF
}

REGION_ID=""
PBF_SOURCE=""
FETCH_IMAGES=""
USE_FILTER=1
REFRESH=""
REBUILD=0
while [[ $# -gt 0 ]]; do
    case "$1" in
        --region)    REGION_ID="${2:?--region needs a value}"; shift 2 ;;
        --pbf)       PBF_SOURCE="${2:?--pbf needs a value}"; shift 2 ;;
        --images)    FETCH_IMAGES=1; shift ;;
        --no-images) FETCH_IMAGES=0; shift ;;
        --no-filter) USE_FILTER=0; shift ;;
        --refresh)   REFRESH=1; shift ;;
        --rebuild)   REBUILD=1; shift ;;
        --yes|-y)    ASSUME_YES=1; shift ;;
        -h|--help)   usage; exit 0 ;;
        *)           usage; die "Unknown option: $1" ;;
    esac
done

BUILD_STARTED=0
BUILD_DONE=0
trap 'echo; warn "Interrupted. Re-run the script to continue — downloads resume where they stopped."; exit 130' INT
# Record unfinished builds in data/osm/build-history.log.
trap 'status=$?
      if [[ "$status" != 0 && "$BUILD_STARTED" == 1 && "$BUILD_DONE" == 0 ]]; then
          [[ "$status" == 130 ]] && log_build "$REGION_ID  interrupted during: ${CURRENT_STEP:-?}" \
                                 || log_build "$REGION_ID  FAILED during: ${CURRENT_STEP:-?} (exit $status)"
      fi' EXIT

# ---------------------------------------------------------------------------
# Geofabrik helpers
# ---------------------------------------------------------------------------

fetch_geofabrik_index() {
    mkdir -p "$OSM_DIR"
    # Refresh once a day; fall back to a stale copy when offline.
    if [[ -z "$(find "$GEOFABRIK_INDEX" -mmin -1440 2>/dev/null)" ]]; then
        curl -sfL --max-time 30 "$GEOFABRIK_INDEX_URL" -o "$GEOFABRIK_INDEX.tmp" \
            && mv "$GEOFABRIK_INDEX.tmp" "$GEOFABRIK_INDEX" \
            || rm -f "$GEOFABRIK_INDEX.tmp"
    fi
    [[ -f "$GEOFABRIK_INDEX" ]]
}

# geofabrik_query lookup ID  → "name<TAB>pbf url" (nothing if unknown)
# geofabrik_query search TEXT → "id<TAB>name<TAB>parent name" per match
geofabrik_query() {
    python3 - "$GEOFABRIK_INDEX" "$1" "$2" "$PLANET_URL" <<'PY'
import json, sys
index, mode, term, planet_url = sys.argv[1], sys.argv[2], sys.argv[3].lower(), sys.argv[4]
regions = {f["properties"]["id"]: f["properties"] for f in json.load(open(index))["features"]}
regions["planet"] = {"id": "planet", "name": "Whole world (planet)", "urls": {"pbf": planet_url}}
if mode == "lookup":
    r = regions.get(term)
    if r:
        print(f'{r["name"]}\t{r["urls"]["pbf"]}')
else:
    hits = [r for r in regions.values() if term in r["id"].lower() or term in r["name"].lower()]
    hits.sort(key=lambda r: (r["name"].lower() != term, r["name"]))
    for r in hits[:20]:
        parent = regions.get(r.get("parent", ""), {}).get("name", "")
        print(f'{r["id"]}\t{r["name"]}\t{parent}')
PY
}

remote_size() {
    curl -sIL --connect-timeout 3 --max-time 10 "$1" | tr -d '\r' | awk 'tolower($1)=="content-length:" {n=$2} END {print n+0}'
}

# Ids of regions with a ready-made export in data/exports/.
exported_regions() {
    local f
    for f in $(list_exports); do
        basename "$f" .json
    done
}

# Ids of regions already downloaded to data/osm/.
downloaded_regions() {
    local f
    for f in "$OSM_DIR"/*-latest.osm.pbf; do
        [[ -f "$f" ]] && basename "$f" -latest.osm.pbf
    done
}

file_date() {
    date -r "$1" '+%Y-%m-%d'
}

# Show what earlier runs left on disk, so nobody re-downloads by accident.
show_local_files() {
    local id f found=0
    section "Already on this machine"
    for f in $(list_exports); do
        found=1
        ok "$(printf '%-22s %7s  ready-made export, OSM data as of %s' "$(basename "$f" .json)" \
            "$(human_size "$(manifest_get "$f" size)")" "$(manifest_get "$f" osm_timestamp | cut -c1-10)")"
    done
    for id in $(downloaded_regions); do
        f="$OSM_DIR/$id-latest.osm.pbf"
        found=1
        if [[ -f "$OSM_DIR/$id-filtered.osm.pbf" ]]; then
            ok "$(printf '%-22s %7s  extract from %s, filtered' "$id" "$(human_size "$(stat -c%s "$f")")" "$(file_date "$f")")"
        else
            ok "$(printf '%-22s %7s  extract from %s' "$id" "$(human_size "$(stat -c%s "$f")")" "$(file_date "$f")")"
        fi
    done
    [[ "$found" == 1 ]] || info "No region downloads yet (they're kept in data/osm/)."
    if [[ -f "$EEZ_ZIP" ]]; then
        ok "EEZ country boundaries"
    else
        info "EEZ country boundaries: not downloaded yet"
    fi
    local cached
    cached=$(find "$DATA_DIR/wikidata_json" -name '*.json' 2>/dev/null | wc -l)
    [[ "$cached" -gt 0 ]] && ok "Wikidata cache: $cached entries, $(find "$DATA_DIR/images" -type f 2>/dev/null | wc -l) images"
    if [[ -s "$BUILD_LOG" ]]; then
        info ""
        info "Recent builds (data/osm/build-history.log):"
        tail -n 5 "$BUILD_LOG" | sed "s/^/      ${DIM}/; s/$/${RESET}/"
    fi
}

pick_region() {
    local online=1 choices=() i=1 id name url size note manifest
    fetch_geofabrik_index || online=0
    [[ "$online" == 1 ]] && choices=("${CONTINENTS[@]}" "$PLANET_ID" "$TEST_REGION")
    # Also offer regions exported or downloaded earlier that aren't in the standard list.
    for id in $(exported_regions) $(downloaded_regions); do
        [[ " ${choices[*]} " == *" $id "* ]] || choices+=("$id")
    done
    echo ""
    [[ "$online" == 1 ]] || warn "No internet connection — showing only what's already on this computer."
    echo "    Which region do you want to build?"
    echo ""
    for id in "${choices[@]}"; do
        name="" url="" size=0 note=""
        [[ "$online" == 1 ]] && { IFS=$'\t' read -r name url < <(geofabrik_query lookup "$id") || true; }
        manifest="$EXPORTS_DIR/$id.json"
        if [[ -f "$manifest" && -f "$EXPORTS_DIR/$id.oimdb" ]]; then
            [[ -n "$name" ]] || name=$(manifest_get "$manifest" region_name)
            size=$(manifest_get "$manifest" size)
            note="${GREEN}✓ ready-made export (OSM data as of $(manifest_get "$manifest" osm_timestamp | cut -c1-10)) — imports in minutes${RESET}${DIM}"
        else
            if [[ -n "$url" ]]; then
                size=$(remote_size "$url")
            elif [[ -f "$OSM_DIR/$id-latest.osm.pbf" ]]; then
                size=$(stat -c%s "$OSM_DIR/$id-latest.osm.pbf")
            fi
            [[ "$id" == "$TEST_REGION" ]] && note="tiny — good for a quick test"
            [[ "$id" == "$PLANET_ID" ]] && note="${YELLOW}slow — takes hours, see the warning${RESET}${DIM}"
            [[ -f "$OSM_DIR/$id-latest.osm.pbf" ]] && note="${GREEN}✓ downloaded $(file_date "$OSM_DIR/$id-latest.osm.pbf")${RESET}${DIM} ${note}"
        fi
        [[ -n "$name" ]] || name="$id"
        printf "    %3d) %-24s %7s  %s\n" "$i" "$name" "$(human_size "$size")" "${DIM}$note${RESET}"
        i=$((i + 1))
    done
    local search_choice=0 file_choice
    if [[ "$online" == 1 ]]; then
        search_choice=$i
        printf "    %3d) %s\n" "$search_choice" "Search for a country, state or province..."
        i=$((i + 1))
    fi
    file_choice=$i
    printf "    %3d) %s\n" "$file_choice" "Use an .osm.pbf file I already have"
    echo ""

    local answer
    while true; do
        read -r -p "    Choose [1-$file_choice]: " answer || die "Aborted."
        if [[ "$answer" =~ ^[0-9]+$ && "$answer" -ge 1 && "$answer" -le ${#choices[@]} ]]; then
            REGION_ID="${choices[$((answer - 1))]}"
            return
        elif [[ "$answer" == "$search_choice" ]]; then
            search_region && return
        elif [[ "$answer" == "$file_choice" ]]; then
            read -r -e -p "    Path to the .osm.pbf file: " PBF_SOURCE || die "Aborted."
            PBF_SOURCE="${PBF_SOURCE/#\~/$HOME}"
            [[ -f "$PBF_SOURCE" ]] && return
            warn "File not found: $PBF_SOURCE"
            PBF_SOURCE=""
        fi
    done
}

search_region() {
    local term answer
    read -r -p "    Search for: " term || die "Aborted."
    [[ -n "$term" ]] || return 1
    local -a ids=()
    local id name parent
    while IFS=$'\t' read -r id name parent; do
        ids+=("$id")
        printf "    %3d) %s %s\n" "${#ids[@]}" "$name" "${DIM}${parent:+(in $parent)}${RESET}"
    done < <(geofabrik_query search "$term")
    if [[ ${#ids[@]} -eq 0 ]]; then
        warn "No region matches \"$term\"."
        return 1
    fi
    read -r -p "    Choose [1-${#ids[@]}, Enter to go back]: " answer || die "Aborted."
    if [[ "$answer" =~ ^[0-9]+$ && "$answer" -ge 1 && "$answer" -le ${#ids[@]} ]]; then
        REGION_ID="${ids[$((answer - 1))]}"
        return 0
    fi
    return 1
}

# ---------------------------------------------------------------------------
# 1. Prerequisites
# ---------------------------------------------------------------------------
echo "${BOLD}======================================================${RESET}"
echo "${BOLD} Open Infrastructure Map — build the map database${RESET}"
echo "${BOLD}======================================================${RESET}"

section "Checking prerequisites..."
MISSING=0
check_cmd docker  "https://docs.docker.com/get-docker/"       || MISSING=1
check_cmd curl    "dnf install curl  /  apt install curl"     || MISSING=1
check_cmd python3 "dnf install python3  /  apt install python3" || MISSING=1
check_cmd unzip   "dnf install unzip  /  apt install unzip"   || MISSING=1
[[ "$MISSING" == 0 ]] || die "Install the missing tools above, then re-run this script."
docker info >/dev/null 2>&1 || die "Docker is installed but not running (or your user can't access it)."
docker compose version >/dev/null 2>&1 || die "Docker Compose v2 is required ('docker compose', not 'docker-compose')."

# ---------------------------------------------------------------------------
# 2. Questions — everything interactive happens here
# ---------------------------------------------------------------------------
show_local_files

section "Choosing a region..."
if [[ -z "$REGION_ID" && -z "$PBF_SOURCE" ]]; then
    [[ "$ASSUME_YES" == 1 ]] && die "--yes needs --region or --pbf."
    pick_region
fi

# A ready-made export of this region? Importing it takes minutes, no downloading.
if [[ -n "$REGION_ID" && -z "$PBF_SOURCE" && "$REBUILD" == 0 \
      && -f "$EXPORTS_DIR/$REGION_ID.json" && -f "$EXPORTS_DIR/$REGION_ID.oimdb" ]]; then
    EXPORT_DATE=$(manifest_get "$EXPORTS_DIR/$REGION_ID.json" osm_timestamp | cut -c1-10)
    info "There's a ready-made export of this region (OSM data as of $EXPORT_DATE)."
    if ask_yes_no "Import it? (No = download and rebuild from scratch)" y; then
        IMPORT_ARGS=("$EXPORTS_DIR/$REGION_ID.oimdb")
        [[ "$ASSUME_YES" == 1 ]] && IMPORT_ARGS+=(--yes)
        exec bash "$REPO_ROOT/scripts/import-db.sh" "${IMPORT_ARGS[@]}"
    fi
fi

PBF_URL=""
if [[ -n "$PBF_SOURCE" ]]; then
    [[ -f "$PBF_SOURCE" ]] || die "File not found: $PBF_SOURCE"
    PBF_SOURCE="$(cd "$(dirname "$PBF_SOURCE")" && pwd)/$(basename "$PBF_SOURCE")"
    REGION_ID="$(basename "$PBF_SOURCE" .osm.pbf | tr -c 'A-Za-z0-9_.\n-' '-')"
    REGION_NAME="$REGION_ID (local file)"
    DOWNLOAD_SIZE=0
else
    REGION_NAME="" PBF_URL=""
    if fetch_geofabrik_index; then
        IFS=$'\t' read -r REGION_NAME PBF_URL < <(geofabrik_query lookup "$REGION_ID") || true
    fi
    PBF_SOURCE="$OSM_DIR/$REGION_ID-latest.osm.pbf"
    if [[ -n "$PBF_URL" ]]; then
        DOWNLOAD_SIZE=$(remote_size "$PBF_URL")
    elif [[ -f "$PBF_SOURCE" ]]; then
        # Offline (or not a Geofabrik region): rebuild from the earlier download.
        REGION_NAME="${REGION_NAME:-$REGION_ID}"
        DOWNLOAD_SIZE=0
    else
        die "Unknown region '$REGION_ID', or no internet connection to download it."
    fi
fi
ok "$REGION_NAME"

if [[ "$REGION_ID" == "$PLANET_ID" ]]; then
    section "Building the whole world takes a while"
    warn "Download: ~$(human_size "$DOWNLOAD_SIZE") from openstreetmap.org — about 30 min on a fast"
    warn "          connection, 2–3 hours at 10 MB/s. It resumes if interrupted."
    warn "Filtering: roughly 30–60 min (osmium reads the whole file once)."
    warn "Import, views and stats: probably under an hour."
    warn "Disk: ~100 GB in data/osm/ plus 30–50 GB for the database (checked below)."
    info "Everything runs unattended after the questions, and finished steps aren't"
    info "repeated if you re-run, so it's fine to leave it overnight."
    ask_yes_no "Build the whole world?" y || die "Aborted — nothing was changed."
fi

# Decide now whether to download, so nothing is asked later on.
DO_DOWNLOAD=0
REMOTE_MD5=""
if [[ -n "$PBF_URL" ]]; then
    REMOTE_MD5=$(curl -sfL --max-time 30 "$PBF_URL.md5" | cut -d' ' -f1 || true)
    if [[ ! -f "$PBF_SOURCE" ]]; then
        DO_DOWNLOAD=1
        [[ -f "$PBF_SOURCE.part" ]] && info "Resuming an earlier, unfinished download."
    elif [[ -z "$REMOTE_MD5" ]]; then
        info "Using the extract downloaded on $(file_date "$PBF_SOURCE") (can't reach Geofabrik to check for a newer one)."
    elif [[ "$(cat "$PBF_SOURCE.md5" 2>/dev/null)" == "$REMOTE_MD5" ]]; then
        ok "Already downloaded, and it's the latest extract — no download needed."
    else
        info "You already have this region, downloaded on $(file_date "$PBF_SOURCE")."
        info "Geofabrik has a newer extract ($(human_size "$DOWNLOAD_SIZE"))."
        if [[ "$REFRESH" == 1 ]]; then
            DO_DOWNLOAD=1
        elif [[ "$ASSUME_YES" != 1 ]] && ask_yes_no "Download the newer one? (No = use the one you have)" n; then
            DO_DOWNLOAD=1
        else
            ok "Using the extract you already have."
        fi
    fi
fi

# Disk space: the raw extract plus the (much smaller) filtered copy.
mkdir -p "$OSM_DIR"
NEED=$(( DOWNLOAD_SIZE * 115 / 100 ))
[[ "$DO_DOWNLOAD" == 0 && -f "$PBF_SOURCE" ]] && NEED=$(( $(stat -c%s "$PBF_SOURCE") * 15 / 100 ))
FREE=$(free_bytes "$OSM_DIR")
info "Needs about $(human_size "$NEED") in data/osm/ — $(human_size "$FREE") free."
if [[ "$NEED" -gt "$FREE" ]]; then
    ask_yes_no "That probably won't fit. Continue anyway?" n || die "Not enough disk space in $OSM_DIR."
fi

# Docker needs room for the database. The filtered extract is ~1-2% of the
# raw one, and the database ends up ~17× the filtered extract (Russia: 53 MB
# filtered → 1 GB database); the extra 2 GB covers Postgres itself and the EEZ
# boundaries.
docker_need() {
    local input_bytes="$1" filtered="$2"
    [[ "$filtered" == 1 ]] || input_bytes=$(( input_bytes / 50 ))
    echo $(( input_bytes * 20 + 2 * 1024 * 1024 * 1024 ))
}
DOCKER_ROOT=$(docker info -f '{{.DockerRootDir}}' 2>/dev/null || true)
if [[ -n "$DOCKER_ROOT" ]] && DOCKER_FREE=$(free_bytes "$DOCKER_ROOT" 2>/dev/null); then
    RAW_SIZE=$DOWNLOAD_SIZE
    [[ -f "$PBF_SOURCE" ]] && RAW_SIZE=$(stat -c%s "$PBF_SOURCE")
    DOCKER_NEED=$(docker_need $(( RAW_SIZE / 50 )) 1)
    info "Needs roughly $(human_size "$DOCKER_NEED") for Docker ($DOCKER_ROOT) — $(human_size "$DOCKER_FREE") free."
    if [[ "$DOCKER_NEED" -gt "$DOCKER_FREE" ]]; then
        ask_yes_no "That probably won't fit. Continue anyway?" n || die "Not enough disk space for Docker."
    fi
fi

if db_volume_exists; then
    section "Existing database"
    start_db
    EXISTING_REGION=$(build_info region_name)
    if [[ -n "$EXISTING_REGION" ]]; then
        info "Your local database currently contains: ${BOLD}$EXISTING_REGION${RESET}"
    else
        info "There is an existing local database (possibly an unfinished build)."
    fi
    info "Building a new region ${BOLD}deletes it${RESET} and starts from scratch."
    ask_yes_no "Delete the existing database and continue?" y || die "Aborted — nothing was changed."
fi

section "Country boundaries"
HAVE_EEZ=0
ensure_eez_zip && HAVE_EEZ=1 && ok "EEZ boundaries found."

if [[ -z "$FETCH_IMAGES" && "$ASSUME_YES" == 1 ]]; then
    FETCH_IMAGES=0
elif [[ -z "$FETCH_IMAGES" ]]; then
    section "Wikidata images"
    info "Info popups can show photos and details from Wikidata. Caching them for"
    info "offline use makes ~2 requests per second, so it can take hours for a"
    info "continent. You can always do it later with: uv run scripts/fetch_images.py"
    FETCH_IMAGES=0
    if command -v uv &>/dev/null; then
        ask_yes_no "Cache Wikidata images at the end of the build?" n && FETCH_IMAGES=1
    else
        warn "uv isn't installed, so this step will be skipped."
    fi
fi

echo ""
info "${BOLD}That's all the questions.${RESET} The rest runs on its own — for a continent this"
info "can take a few hours, mostly downloading. Safe to interrupt and re-run."
START=$SECONDS
BUILD_STARTED=1
log_build "$REGION_ID  started ($REGION_NAME)"

# ---------------------------------------------------------------------------
# 3. Download
# ---------------------------------------------------------------------------
if [[ "$DO_DOWNLOAD" == 1 ]]; then
    section "Downloading $REGION_NAME from Geofabrik ($(human_size "$DOWNLOAD_SIZE"))..."
    # -C - resumes a partial download from an earlier interrupted run;
    # -R keeps Geofabrik's date on the file, so it shows when the data is from.
    curl -L --fail --progress-bar -R -C - -o "$PBF_SOURCE.part" "$PBF_URL" \
        || [[ "$(stat -c%s "$PBF_SOURCE.part" 2>/dev/null || echo 0)" == "$DOWNLOAD_SIZE" ]] \
        || die "Download failed. Re-run the script to resume it."
    if [[ -n "$REMOTE_MD5" ]]; then
        info "Verifying checksum..."
        if [[ "$(md5sum "$PBF_SOURCE.part" | cut -d' ' -f1)" != "$REMOTE_MD5" ]]; then
            rm -f "$PBF_SOURCE.part"
            die "The download is corrupt (Geofabrik may have published a new extract mid-download). Re-run the script."
        fi
    fi
    # Only replace the old extract once the new one is complete and verified.
    rm -f "$PBF_SOURCE.md5"
    mv "$PBF_SOURCE.part" "$PBF_SOURCE"
    [[ -n "$REMOTE_MD5" ]] && echo "$REMOTE_MD5" > "$PBF_SOURCE.md5"
    ok "Downloaded $(human_size "$(stat -c%s "$PBF_SOURCE")")."
fi

# Run osmium with the source extract mounted at /src.osm.pbf and data/osm at /osm.
docker compose --progress quiet --profile tools build osmium
osmium() {
    docker compose --progress quiet --profile tools run --rm -T --user "$(id -u):$(id -g)" \
        -v "$PBF_SOURCE:/src.osm.pbf:ro,z" -v "$OSM_DIR:/osm:z" osmium "$@"
}

OSM_TIMESTAMP=$(osmium fileinfo -g header.option.osmosis_replication_timestamp /src.osm.pbf 2>/dev/null || true)

# ---------------------------------------------------------------------------
# 4. Filter
# ---------------------------------------------------------------------------
IMPORT_PBF="$PBF_SOURCE"
if [[ "$USE_FILTER" == 1 ]]; then
    section "Filtering the extract down to infrastructure..."
    FILTERED="$OSM_DIR/$REGION_ID-filtered.osm.pbf"
    python3 "$REPO_ROOT/scripts/osm_filter.py" > "$OSM_DIR/filter.txt"
    # Reuse an earlier result when neither the extract nor the mapping changed.
    STAMP="$(stat -c '%s %Y' "$PBF_SOURCE") $(md5sum < "$OSM_DIR/filter.txt" | cut -d' ' -f1)"
    if [[ -f "$FILTERED" && "$(cat "$FILTERED.stamp" 2>/dev/null)" == "$STAMP" ]]; then
        ok "Already filtered."
    else
        osmium tags-filter --progress /src.osm.pbf -e /osm/filter.txt \
            -o "/osm/$(basename "$FILTERED")" --overwrite
        echo "$STAMP" > "$FILTERED.stamp"
        ok "$(human_size "$(stat -c%s "$PBF_SOURCE")") → $(human_size "$(stat -c%s "$FILTERED")")"
    fi
    IMPORT_PBF="$FILTERED"
fi

# Now that the real input size is known, check Docker has room for the database.
if [[ -n "$DOCKER_ROOT" ]] && DOCKER_FREE=$(free_bytes "$DOCKER_ROOT" 2>/dev/null); then
    DOCKER_NEED=$(docker_need "$(stat -c%s "$IMPORT_PBF")" "$USE_FILTER")
    if [[ "$DOCKER_NEED" -gt "$DOCKER_FREE" ]]; then
        die "The database needs about $(human_size "$DOCKER_NEED") in $DOCKER_ROOT but only $(human_size "$DOCKER_FREE") is free.
       Free up some space and re-run — the download and filtering won't be repeated."
    fi
fi

# ---------------------------------------------------------------------------
# 5. Fresh database + imposm import
# ---------------------------------------------------------------------------
section "Creating a fresh database..."
# -v removes this project's volumes only (database, imposm cache).
docker compose --progress quiet down -v --remove-orphans
start_db
ok "Postgres is ready."

section "Importing with imposm (the longest step)..."
docker compose --progress quiet run --rm --build \
    -v "$IMPORT_PBF:/data.osm.pbf:ro,z" \
    imposm import \
    -connection "postgis://$DB_USER:osm@db/$DB_NAME" \
    -mapping /mapping.json \
    -read /data.osm.pbf \
    -write \
    -optimize \
    -deployproduction \
    -overwritecache

section "Creating views..."
run_with_timer "Creating map views" run_sql_file schema/views.sql
run_with_timer "Creating stats tables" run_sql_file schema/stats.sql

# ---------------------------------------------------------------------------
# 6. EEZ country boundaries
# ---------------------------------------------------------------------------
if [[ "$HAVE_EEZ" == 1 ]]; then
    section "Importing country boundaries..."
    run_with_timer "Importing EEZ boundaries" import_eez
    # Per-country stats pages read from the stats schema; production refreshes
    # it on a schedule, here one snapshot of the freshly imported data is enough.
    run_with_timer "Computing per-country stats" run_sql_file schema/local-stats.sql
fi

# ---------------------------------------------------------------------------
# 7. Record what was built (used by launch.sh and the database dumps)
# ---------------------------------------------------------------------------
db_psql <<SQL
CREATE TABLE oim_build_info (key text PRIMARY KEY, value text NOT NULL);
INSERT INTO oim_build_info VALUES
    ('region_id',     '$REGION_ID'),
    ('region_name',   '${REGION_NAME//\'/\'\'}'),
    ('source',        '${PBF_URL:-local file}'),
    ('osm_timestamp', '${OSM_TIMESTAMP:-unknown}'),
    ('eez',           '$HAVE_EEZ'),
    ('git_commit',    '$(git rev-parse --short HEAD 2>/dev/null || echo unknown)'),
    ('schema_hash',   '$(schema_hash)'),
    ('built_at',      '$(date -u +%Y-%m-%dT%H:%M:%SZ)');
SQL

# ---------------------------------------------------------------------------
# 8. Tile server — recreate it so it doesn't serve tiles cached from old data
# ---------------------------------------------------------------------------
section "Starting the Tegola tile server..."
docker compose --progress quiet up -d --build --force-recreate tegola
ok "Running on http://localhost:7800"

# ---------------------------------------------------------------------------
# 9. Wikidata images
# ---------------------------------------------------------------------------
if [[ "$FETCH_IMAGES" == 1 ]]; then
    section "Caching Wikidata data and images (already-cached ones are skipped)..."
    uv run "$REPO_ROOT/scripts/fetch_images.py"
fi

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
ELAPSED=$((SECONDS - START))
BUILD_DONE=1
log_build "$REGION_ID  completed in $((ELAPSED / 3600))h $((ELAPSED % 3600 / 60))m (OSM data as of ${OSM_TIMESTAMP:-unknown})"
DB_SIZE=$(db_query "SELECT pg_size_pretty(pg_database_size('$DB_NAME'))")
echo ""
echo "${BOLD}======================================================${RESET}"
echo "${BOLD} ${GREEN}✓${RESET}${BOLD} $REGION_NAME is built${RESET}"
echo "${BOLD}======================================================${RESET}"
info "OSM data as of: ${OSM_TIMESTAMP:-unknown}"
info "Database size:  $DB_SIZE"
info "Took:           $((ELAPSED / 3600))h $((ELAPSED % 3600 / 60))m $((ELAPSED % 60))s"
[[ "$HAVE_EEZ" == 1 ]] || warn "No EEZ boundaries — search and area/stats pages won't work. Re-run to add them."
echo ""
info "Start the app with: bash scripts/start.sh"
