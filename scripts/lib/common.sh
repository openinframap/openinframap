# shellcheck shell=bash
# ---------------------------------------------------------------------------
# Shared helpers for scripts/*.sh. Source it, don't run it.
# ---------------------------------------------------------------------------

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DATA_DIR="$REPO_ROOT/data"
OSM_DIR="$DATA_DIR/osm"
EEZ_NAME="EEZ_land_union_v4_202410"
EEZ_ZIP="$DATA_DIR/$EEZ_NAME.zip"
EEZ_DOWNLOAD_URL="https://marineregions.org/download_file.php?name=$EEZ_NAME.zip"
EEZ_INFO_URL="https://marineregions.org/sources.php#unioneezcountry"
BUILD_LOG="$OSM_DIR/build-history.log"
# Ready-made databases made by scripts/export-db.sh, imported by import-db.sh.
EXPORTS_DIR="$DATA_DIR/exports"
DOCKER_IMAGES_TAR="$EXPORTS_DIR/docker-images.tar.gz"
DB_USER=osm
DB_NAME=osm

# Set to 1 (e.g. via --yes) to accept the default answer of every prompt.
ASSUME_YES="${ASSUME_YES:-0}"

if [[ -t 1 ]]; then
    BOLD=$'\e[1m'; DIM=$'\e[2m'; RED=$'\e[31m'; GREEN=$'\e[32m'; YELLOW=$'\e[33m'; RESET=$'\e[0m'
else
    BOLD=""; DIM=""; RED=""; GREEN=""; YELLOW=""; RESET=""
fi

section() { CURRENT_STEP="$*"; echo ""; echo "${BOLD}==> $*${RESET}"; }
info()    { echo "    $*"; }
ok()      { echo "    ${GREEN}✓${RESET} $*"; }
warn()    { echo "    ${YELLOW}!${RESET} $*"; }
die()     { echo ""; echo "${RED}ERROR:${RESET} $*" >&2; exit 1; }

# ask_yes_no "Question?" [default y|n] — returns 0 for yes.
ask_yes_no() {
    local question="$1" default="${2:-n}" hint answer
    if [[ "$ASSUME_YES" == 1 ]]; then
        [[ "$default" == y ]]
        return
    fi
    [[ "$default" == y ]] && hint="[Y/n]" || hint="[y/N]"
    read -r -p "    $question $hint " answer || die "Aborted."
    answer="${answer:-$default}"
    [[ "${answer,,}" == y || "${answer,,}" == yes ]]
}

check_cmd() {
    local cmd="$1" hint="$2"
    if command -v "$cmd" &>/dev/null; then
        printf "    %-12s ${GREEN}OK${RESET}\n" "$cmd"
    else
        printf "    %-12s ${RED}MISSING${RESET} — %s\n" "$cmd" "$hint"
        return 1
    fi
}

# Append a line to data/osm/build-history.log, which survives database wipes.
log_build() {
    mkdir -p "$OSM_DIR"
    echo "$(date '+%Y-%m-%d %H:%M')  $*" >> "$BUILD_LOG"
}

# run_with_timer "Label" command [args...]
# Runs a quiet, slow command with a ticking elapsed-time counter so it's
# obvious nothing is frozen. Its output is only shown if it fails.
run_with_timer() {
    local label="$1" log pid start=$SECONDS status=0
    shift
    log=$(mktemp)
    "$@" >"$log" 2>&1 &
    pid=$!
    if [[ -t 1 ]]; then
        while kill -0 "$pid" 2>/dev/null; do
            printf "\r    %s... %ds " "$label" $((SECONDS - start))
            sleep 1
        done
        printf "\r\e[K"
    else
        info "$label..."
    fi
    wait "$pid" || status=$?
    if [[ "$status" != 0 ]]; then
        cat "$log" >&2
        rm -f "$log"
        die "$label failed (see above)."
    fi
    rm -f "$log"
    ok "$label ($(( SECONDS - start ))s)"
}

# Run a SQL file against the osm database (for use with run_with_timer).
run_sql_file() {
    db_psql < "$1"
}

human_size() {
    numfmt --to=iec --suffix=B "$1" 2>/dev/null || echo "$1 bytes"
}

# Free bytes on the filesystem holding $1.
free_bytes() {
    df -P -B1 "$1" | awk 'NR==2 {print $4}'
}

db_psql() {
    docker compose exec -T -e PGOPTIONS="-c client_min_messages=warning" db psql -v ON_ERROR_STOP=1 -q -U "$DB_USER" "$DB_NAME" "$@"
}

db_query() {
    docker compose exec -T db psql -U "$DB_USER" "$DB_NAME" -tAc "$1" </dev/null 2>/dev/null
}

# Start the db service and wait until the osm user can run queries. On a fresh
# volume the init scripts (schema/dev-init.sql) run before that's possible.
start_db() {
    docker compose --progress quiet up -d db </dev/null
    local elapsed=0
    until db_query "SELECT 1" >/dev/null; do
        [[ "$elapsed" -ge 180 ]] && die "Postgres did not become ready within 180s. Check: docker compose logs db"
        sleep 2
        elapsed=$((elapsed + 2))
    done
}

# Prints the value stored by build-region.sh for $1, or nothing if the
# database is missing or was never fully built.
build_info() {
    db_query "SELECT value FROM oim_build_info WHERE key = '$1'" || true
}

# Make sure the marineregions.org EEZ zip is in data/, asking the user to
# download it (it's behind a free form) if needed. Returns 1 if they skip.
ensure_eez_zip() {
    if [[ ! -f "$EEZ_ZIP" && -f "$HOME/Downloads/$EEZ_NAME.zip" ]]; then
        info "Found $EEZ_NAME.zip in ~/Downloads — copying to data/."
        mkdir -p "$DATA_DIR"
        cp "$HOME/Downloads/$EEZ_NAME.zip" "$EEZ_ZIP"
    fi
    [[ -f "$EEZ_ZIP" ]] && return 0

    if [[ "$ASSUME_YES" == 1 ]]; then
        warn "EEZ boundaries not found at data/$EEZ_NAME.zip — they will be skipped."
        return 1
    fi

    info "Country boundaries (EEZ) come from marineregions.org. They're free, but the"
    info "site asks you to fill in a short form, so this one download is manual."
    info ""
    info "Without them the map still works, but search and the country stats pages don't."
    info ""
    info "  1. Open:  ${BOLD}$EEZ_DOWNLOAD_URL${RESET}"
    info "     (about the dataset: $EEZ_INFO_URL)"
    info "  2. Fill in the form and download ${BOLD}$EEZ_NAME.zip${RESET} (~19 MB)"
    info "  3. Leave it in ~/Downloads, or save it as: $EEZ_ZIP"
    info ""
    if command -v xdg-open &>/dev/null; then
        xdg-open "$EEZ_DOWNLOAD_URL" >/dev/null 2>&1 &
        info "(Trying to open the page in your browser now.)"
    elif command -v open &>/dev/null; then
        open "$EEZ_DOWNLOAD_URL"
        info "(Trying to open the page in your browser now.)"
    fi
    local answer
    while true; do
        read -r -p "    Press Enter once the download has finished, or type 'skip' to build without them: " answer || die "Aborted."
        if [[ "$answer" == skip ]]; then
            warn "Skipping EEZ boundaries. Search and area/stats pages won't work."
            return 1
        fi
        if [[ -f "$HOME/Downloads/$EEZ_NAME.zip" && ! -f "$EEZ_ZIP" ]]; then
            mkdir -p "$DATA_DIR"
            cp "$HOME/Downloads/$EEZ_NAME.zip" "$EEZ_ZIP"
        fi
        [[ -f "$EEZ_ZIP" ]] && return 0
        warn "Still can't find $EEZ_NAME.zip in ~/Downloads or data/."
    done
}

# Import $EEZ_ZIP into the countries schema (see ensure_eez_zip).
import_eez() {
    local eez_dir="$DATA_DIR/$EEZ_NAME"
    local shp
    shp=$(find "$eez_dir" -name "$EEZ_NAME.shp" 2>/dev/null | head -1 || true)
    if [[ -z "$shp" ]]; then
        info "Extracting $EEZ_NAME.zip..."
        mkdir -p "$eez_dir"
        unzip -qo "$EEZ_ZIP" -d "$eez_dir"
        shp=$(find "$eez_dir" -name "$EEZ_NAME.shp" | head -1)
        [[ -n "$shp" ]] || die "$EEZ_NAME.shp not found in the zip. Check it with: unzip -l $EEZ_ZIP"
    fi

    db_psql -c "CREATE SCHEMA IF NOT EXISTS countries;
                DROP TABLE IF EXISTS countries.country_eez CASCADE;"
    # shp2pgsql ships with the PostGIS image, so the host doesn't need it
    # (the alpine image is missing libintl, which it needs to run).
    local log
    log=$(mktemp)
    if ! docker compose --progress quiet run --rm --no-deps -T \
        -v "$eez_dir:/eez:ro,z" \
        --entrypoint sh db -c \
        "apk add --no-cache -q libintl >&2 && shp2pgsql -s 4326 -c '/eez/${shp#"$eez_dir"/}' countries.country_eez" \
        2>"$log" | db_psql >/dev/null; then
        cat "$log" >&2
        rm -f "$log"
        die "EEZ import failed (see above)."
    fi
    rm -f "$log"
    db_psql < "$REPO_ROOT/schema/eez.sql"
}

compose_project() {
    docker compose config --format json </dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin)["name"])'
}

# True if this Compose project's database volume exists (built or not).
db_volume_exists() {
    docker volume inspect "$(compose_project)_postgres_data" >/dev/null 2>&1
}

# Docker images needed to run (db, tegola, backend) and build (imposm, osmium) offline.
project_images() {
    local project
    project=$(compose_project)
    docker compose config --format json </dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin)["services"]["db"]["image"])'
    echo "$project-tegola" "$project-backend" "$project-imposm" "$project-osmium" | tr ' ' '\n'
}

# Fingerprint of everything that decides what the database looks like. An
# export built with a different fingerprint may not match this checkout.
schema_hash() {
    cat "$REPO_ROOT"/imposm/*.py "$REPO_ROOT"/schema/{functions,views,stats,eez}.sql | md5sum | cut -c1-12
}

# manifest_get FILE.json KEY — read one field of an export manifest.
manifest_get() {
    python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get(sys.argv[2], ""))' "$1" "$2"
}

# Manifests of the exports in data/exports/, one path per line.
list_exports() {
    local f
    for f in "$EXPORTS_DIR"/*.json; do
        [[ -f "$f" && -f "${f%.json}.oimdb" ]] && echo "$f"
    done
}

# Offer to fill the Wikidata cache used by the info popups.
offer_image_cache() {
    local counts missing_json missing_images minutes choice
    if ! command -v uv &>/dev/null; then
        info "Skipped: filling the cache needs uv (https://docs.astral.sh/uv/). Without it,"
        info "popups fetch their details from Wikidata online."
        return
    fi
    if ! counts=$(uv run -q "$REPO_ROOT/scripts/fetch_images.py" --count 2>/dev/null | tail -1); then
        warn "Couldn't check the Wikidata cache. Fill it later with: uv run scripts/fetch_images.py"
        return
    fi
    read -r missing_json missing_images <<< "$counts"
    if [[ ! "$missing_json" =~ ^[0-9]+$ || ! "$missing_images" =~ ^[0-9]+$ ]]; then
        warn "Couldn't check the Wikidata cache. Fill it later with: uv run scripts/fetch_images.py"
        return
    fi
    if [[ "$missing_json" -eq 0 && "$missing_images" -eq 0 ]]; then
        ok "Wikidata cache is up to date."
        return
    fi
    # fetch_images.py downloads at most one image per second; metadata is batched.
    # Not every feature has a photo, so this is an upper bound.
    minutes=$(( (missing_images + 59) / 60 ))
    info "Info popups can show photos and details from Wikidata. In your region,"
    info "$missing_json features have no cached text and $missing_images have no cached photo,"
    info "so their popups need the internet for now."
    echo ""
    info "  1) Text and images  ${YELLOW}— slow: up to ~$minutes min (1 image per second, Wikimedia's limit)${RESET}"
    info "  2) Text only        — about 10 seconds; popups work offline, without photos"
    info "  3) Skip for now"
    echo ""
    read -r -p "    Choose [1-3, default 3]: " choice || choice=3
    case "${choice:-3}" in
        1) uv run "$REPO_ROOT/scripts/fetch_images.py" ;;
        2) uv run "$REPO_ROOT/scripts/fetch_images.py" --json-only ;;
        *) info "Skipped." ;;
    esac
    [[ "${choice:-3}" == 1 ]] || {
        info "To cache them later (safe to stop and re-run; cached items are skipped):"
        info "  uv run scripts/fetch_images.py              # text and images (slow)"
        info "  uv run scripts/fetch_images.py --json-only  # text only (fast)"
    }
}

# open_in_terminal "Title" "command" — run a command in a new terminal window
# that stays open afterwards. Returns 1 if no supported terminal is found.
open_in_terminal() {
    # The new window doesn't inherit this environment, so hand over PATH: it
    # may only find uv/node through the user's shell config (pyenv, nvm, ...).
    local title="$1" cmd
    cmd="export PATH=$(printf %q "$PATH"); $2; echo; echo '[$1 stopped — you can close this window]'; exec bash"
    if [[ "$(uname)" == Darwin ]]; then
        osascript -e "tell application \"Terminal\" to do script \"${cmd//\"/\\\"}\"" >/dev/null
        return
    fi
    [[ -n "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ]] || return 1
    if command -v ptyxis &>/dev/null; then
        ptyxis --new-window -- bash -c "$cmd" &>/dev/null &
    elif command -v gnome-terminal &>/dev/null; then
        gnome-terminal --title="$title" -- bash -c "$cmd" &>/dev/null
    elif command -v konsole &>/dev/null; then
        konsole -p tabtitle="$title" -e bash -c "$cmd" &>/dev/null &
    elif command -v xfce4-terminal &>/dev/null; then
        xfce4-terminal --title="$title" -x bash -c "$cmd" &>/dev/null &
    elif command -v kitty &>/dev/null; then
        kitty --title "$title" bash -c "$cmd" &>/dev/null &
    elif command -v alacritty &>/dev/null; then
        alacritty --title "$title" -e bash -c "$cmd" &>/dev/null &
    elif command -v x-terminal-emulator &>/dev/null; then
        x-terminal-emulator -e bash -c "$cmd" &>/dev/null &
    elif command -v xterm &>/dev/null; then
        xterm -T "$title" -e bash -c "$cmd" &>/dev/null &
    else
        return 1
    fi
}

# True if something answers HTTP on localhost:$1.
port_in_use() {
    curl -s -o /dev/null --max-time 2 "http://localhost:$1/"
}

APP_URL="http://localhost:5173"
BACKEND_PORT=8001
FRONTEND_PORT=5173

open_browser() {
    if command -v xdg-open &>/dev/null; then
        xdg-open "$1" >/dev/null 2>&1 &
    elif command -v open &>/dev/null; then
        open "$1"
    fi
}

# Start whichever of the backend (Docker) and frontend (a new terminal
# window) isn't running yet, then open the map in the browser once it answers.
# Returns 1 if the frontend window couldn't be opened (print_manual_start then helps).
start_app() {
    # Only run npm install when packages changed, so the app also starts offline.
    local frontend_cmd="cd $(printf %q "$REPO_ROOT/web") && { [ node_modules/.package-lock.json -nt package-lock.json ] || npm install; } && npm start"
    if port_in_use "$BACKEND_PORT"; then
        ok "Backend already running."
    else
        # Create the cache folders first, or Docker creates them owned by root.
        mkdir -p "$DATA_DIR/images" "$DATA_DIR/wikidata_json"
        docker compose --progress quiet up -d backend </dev/null
        ok "Backend started (Docker). Its log: docker compose logs -f backend"
    fi
    if port_in_use "$FRONTEND_PORT"; then
        ok "Frontend already running."
    else
        open_in_terminal "OpenInfraMap frontend" "$frontend_cmd" || return 1
        ok "Frontend started in a new window."
    fi

    # npm install can take a while the first time.
    local waited=0
    while ! port_in_use "$FRONTEND_PORT" && [[ "$waited" -lt 180 ]]; do
        [[ -t 1 ]] && printf "\r    Waiting for the map to come up... %ds " "$waited"
        sleep 2
        waited=$((waited + 2))
    done
    [[ -t 1 ]] && printf "\r\e[K"
    if port_in_use "$FRONTEND_PORT"; then
        ok "Opening the map in your browser: $APP_URL"
        open_browser "$APP_URL"
    else
        warn "The frontend hasn't answered yet — check its window, then open $APP_URL"
    fi
    info "To stop the app, press Ctrl+C in the frontend window (or close it),"
    info "then run: docker compose stop"
}

print_manual_start() {
    echo "Start the app:"
    echo ""
    echo "  Backend (Docker):"
    echo "    docker compose up -d backend"
    echo ""
    echo "  Frontend (in a terminal you keep open):"
    echo "    cd web && npm install && npm start"
    echo ""
    echo "  Then open: $APP_URL"
}
