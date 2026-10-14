#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["httpx", "psycopg2-binary"]
# ///
"""
Download Wikimedia Commons thumbnails for all OSM features in the local DB.

Queries every table that carries a wikidata tag, then for each ID:
  1. Batch-fetches the P18 (image) claim from the Wikidata API (50 IDs/request)
  2. Batch-fetches thumbnail URLs from the Wikimedia Commons API (50 files/request)
  3. Downloads each thumbnail image to data/images/<wikidata_id>.<ext>

Already-cached images are skipped on re-runs.

Usage:
    uv run scripts/fetch_images.py
    uv run scripts/fetch_images.py --db-url postgresql://osm:osm@localhost:5432/osm

Wikimedia API etiquette: https://www.mediawiki.org/wiki/API:Etiquette
  - Descriptive User-Agent with contact URL
  - No concurrent requests
  - 1 API request per second (Wikidata + Commons MediaWiki endpoints)
  - 1 image download per second (upload.wikimedia.org CDN)
"""

import argparse
import json
import re
import sys
import time
import urllib.parse
from pathlib import Path
from typing import Optional

import httpx
import psycopg2

REPO_ROOT = Path(__file__).resolve().parent.parent
IMAGES_DIR = REPO_ROOT / "data" / "images"
WIKIDATA_JSON_DIR = REPO_ROOT / "data" / "wikidata_json"

THUMBNAIL_WIDTH = 300
API_DELAY = 1.1    # seconds between MediaWiki API calls (Wikidata / Commons)
IMAGE_DELAY = 1.0  # seconds between image downloads from upload.wikimedia.org

# Must identify the bot per Wikimedia policy. Update the URL if you fork.
USER_AGENT = (
    "OpenInfraMap-LocalDev/1.0 "
    "(local dev image cache, single operator, not mass scraping; "
    "https://github.com/gambon2010/openinframap)"
)

# All tables whose `tags` hstore may carry a wikidata key.
TAGGED_TABLES = [
    "osm_power_plant",
    "osm_power_plant_relation",
    "osm_power_substation",
    "osm_power_substation_relation",
    "osm_power_generator",
    "osm_petroleum_site",
    "osm_mast",
    "osm_marker",
]

WIKIDATA_RE = re.compile(r"^Q[0-9]+$", re.IGNORECASE)


# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

def get_wikidata_ids(conn) -> set[str]:
    """Return all distinct Wikidata IDs found across every tagged table."""
    ids: set[str] = set()
    cur = conn.cursor()
    for table in TAGGED_TABLES:
        try:
            # `?` is the hstore "contains key" operator; psycopg2 uses %s for
            # its own placeholders so `?` is passed to Postgres unchanged.
            cur.execute(
                f"SELECT DISTINCT tags->'wikidata' FROM {table} WHERE tags ? 'wikidata'"
            )
            for (val,) in cur.fetchall():
                if val and WIKIDATA_RE.match(val):
                    ids.add(val.upper())
        except psycopg2.Error as e:
            print(f"  warning: could not query {table}: {e}", file=sys.stderr)
            conn.rollback()
    cur.close()
    return ids


# ---------------------------------------------------------------------------
# Local cache helpers
# ---------------------------------------------------------------------------

def local_path(wikidata_id: str) -> Optional[Path]:
    """Return the cached file path if it exists, otherwise None."""
    matches = list(IMAGES_DIR.glob(f"{wikidata_id}.*"))
    return matches[0] if matches else None


def chunks(lst: list, n: int):
    for i in range(0, len(lst), n):
        yield lst[i : i + n]


# ---------------------------------------------------------------------------
# Wikimedia API calls
# ---------------------------------------------------------------------------

def fetch_entity_data(client: httpx.Client, ids: list[str]) -> dict[str, dict]:
    """
    Batch-fetch labels, sitelinks and claims from Wikidata for up to 50 IDs.
    Saves each entity to data/wikidata_json/<id>.json for offline use.
    Returns {wikidata_id: entity_dict}.
    """
    resp = client.get(
        "https://www.wikidata.org/w/api.php",
        params={
            "action": "wbgetentities",
            "ids": "|".join(ids),
            # sitelinks/urls includes the full Wikipedia URL in each sitelink entry
            "props": "claims|labels|sitelinks/urls",
            "format": "json",
        },
    )
    resp.raise_for_status()
    result: dict[str, dict] = {}
    for entity_id, entity in resp.json().get("entities", {}).items():
        if "missing" in entity:
            continue
        uid = entity_id.upper()
        result[uid] = entity
        cache_file = WIKIDATA_JSON_DIR / f"{uid}.json"
        if not cache_file.exists():
            cache_file.write_text(json.dumps(entity))
    return result


def fetch_thumbnail_urls(client: httpx.Client, filenames: list[str]) -> dict[str, str]:
    """
    Batch-fetch thumbnail URLs from Wikimedia Commons for up to 50 filenames.
    Returns {commons_filename: thumb_url}.
    """
    resp = client.get(
        "https://commons.wikimedia.org/w/api.php",
        params={
            "action": "query",
            "titles": "|".join(f"File:{f}" for f in filenames),
            "prop": "imageinfo",
            "iiprop": "url",
            "iiurlwidth": str(THUMBNAIL_WIDTH),
            "format": "json",
        },
    )
    resp.raise_for_status()
    result: dict[str, str] = {}
    for page in resp.json()["query"]["pages"].values():
        if "imageinfo" not in page:
            continue
        filename = page["title"].removeprefix("File:")
        result[filename] = page["imageinfo"][0]["thumburl"]
    return result


def download_image(client: httpx.Client, url: str, wikidata_id: str) -> Path:
    resp = client.get(url, follow_redirects=True)
    resp.raise_for_status()
    ext = Path(urllib.parse.urlparse(url).path).suffix.lower() or ".jpg"
    dest = IMAGES_DIR / f"{wikidata_id}{ext}"
    dest.write_bytes(resp.content)
    return dest


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def collect_p361_ids(entities: dict[str, dict]) -> set[str]:
    """
    Return Wikidata IDs referenced by P361 ("part of") claims in the given
    entities that are not already cached on disk.

    P361 links a feature to its parent — e.g. an offshore wind turbine to its
    wind farm. The backend resolves these recursively to build the popup's
    "part of" section. Without pre-caching them the section is silently empty
    when offline.
    """
    ids: set[str] = set()
    for entity in entities.values():
        for claim in entity.get("claims", {}).get("P361", []):
            try:
                ref_id = claim["mainsnak"]["datavalue"]["value"]["id"].upper()
            except (KeyError, TypeError):
                continue
            if WIKIDATA_RE.match(ref_id) and not (WIKIDATA_JSON_DIR / f"{ref_id}.json").exists():
                ids.add(ref_id)
    return ids


def main() -> None:
    parser = argparse.ArgumentParser(description="Cache Wikimedia thumbnails locally.")
    parser.add_argument(
        "--db-url",
        default="postgresql://osm:osm@localhost:5432/osm",
        help="PostgreSQL connection URL (default: postgresql://osm:osm@localhost:5432/osm)",
    )
    parser.add_argument(
        "--json-only",
        action="store_true",
        help=(
            "Only fetch and cache entity JSON (labels, sitelinks, claims). "
            "Skips image download (~10 sec vs ~8 min). "
            "Sufficient for offline popup metadata; run without this flag later to add images."
        ),
    )
    parser.add_argument(
        "--count",
        action="store_true",
        help="Print '<IDs missing entity JSON> <IDs missing an image>' as the last line and exit (used by launch.sh).",
    )
    args = parser.parse_args()

    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    WIKIDATA_JSON_DIR.mkdir(parents=True, exist_ok=True)

    if not args.count:
        print("Connecting to database...")
    try:
        conn = psycopg2.connect(args.db_url)
    except psycopg2.OperationalError as e:
        sys.exit(f"ERROR: could not connect to database: {e}")

    if not args.count:
        print("Collecting wikidata IDs from all tagged tables...")
    all_ids = get_wikidata_ids(conn)
    conn.close()
    print(f"  {len(all_ids)} distinct wikidata IDs found")

    todo_json  = sorted(id_ for id_ in all_ids if not (WIKIDATA_JSON_DIR / f"{id_}.json").exists())
    todo_image = sorted(id_ for id_ in all_ids if not local_path(id_))
    if args.count:
        print(len(todo_json), len(todo_image))
        return
    todo = sorted(set(todo_json) | set(todo_image if not args.json_only else []))

    already_cached = len(all_ids) - len(set(todo_json) | set(todo_image))
    print(f"  {already_cached} fully cached  |  "
          f"{len(todo_json)} missing entity JSON  |  "
          f"{len(todo_image)} missing image"
          + ("  [--json-only: skipping images]" if args.json_only else ""))

    if not todo:
        print("Nothing to do.")
        return

    if not args.json_only:
        print(f"\nEstimated time: ~{len(todo_image) * IMAGE_DELAY / 60:.0f} min "
              f"(use --json-only for metadata-only run in ~10 sec)")

    headers = {"User-Agent": USER_AGENT}
    with httpx.Client(headers=headers, timeout=30) as client:

        # ----------------------------------------------------------------
        # Step 1 — fetch entity data from Wikidata (50 IDs/request)
        #          saves labels+sitelinks+claims to data/wikidata_json/
        #          items already cached on disk are read locally (no API call)
        # ----------------------------------------------------------------
        id_to_filename: dict[str, str] = {}
        all_fetched: dict[str, dict] = {}
        todo_api: list[str] = []
        for uid in todo:
            cache_file = WIKIDATA_JSON_DIR / f"{uid}.json"
            if cache_file.exists():
                try:
                    all_fetched[uid] = json.loads(cache_file.read_text())
                except (json.JSONDecodeError, OSError):
                    todo_api.append(uid)
            else:
                todo_api.append(uid)

        def _collect_p18(uid: str, entity: dict) -> None:
            if local_path(uid):
                return
            claims = entity.get("claims", {})
            if "P18" not in claims:
                return
            snak = claims["P18"][0]["mainsnak"]
            if snak.get("datatype") == "commonsMedia":
                id_to_filename[uid] = snak["datavalue"]["value"]

        for uid, entity in all_fetched.items():
            _collect_p18(uid, entity)

        print(f"\nStep 1{'/' + ('1' if args.json_only else '3')}  "
              f"Wikidata entity data "
              f"({len(todo_api)} API, {len(all_fetched)} from cache, 50/request, 1 req/sec)")
        batches = list(chunks(todo_api, 50))
        for i, batch in enumerate(batches, 1):
            print(f"  batch {i}/{len(batches)} ({len(batch)} IDs) ...", end=" ", flush=True)
            try:
                entities = fetch_entity_data(client, batch)
                all_fetched.update(entities)
                for uid, entity in entities.items():
                    _collect_p18(uid, entity)
                print(f"{len(entities)} fetched")
            except httpx.HTTPError as e:
                print(f"FAILED ({e})", file=sys.stderr)
            if i < len(batches):
                time.sleep(API_DELAY)

        # Follow P361 ("part of") links one level deep so the popup's
        # "part of" section is populated offline.
        p361_ids = collect_p361_ids(all_fetched)
        if p361_ids:
            print(f"\n  Following {len(p361_ids)} P361 'part of' references...")
            for i, batch in enumerate(chunks(sorted(p361_ids), 50), 1):
                time.sleep(API_DELAY)
                print(f"    batch {i}: {len(batch)} IDs ...", end=" ", flush=True)
                try:
                    entities = fetch_entity_data(client, batch)
                    print(f"{len(entities)} cached")
                except httpx.HTTPError as e:
                    print(f"FAILED ({e})", file=sys.stderr)

        if args.json_only:
            print(f"\nDone (--json-only) — entity JSON cached for {len(all_fetched)} IDs.")
            print(f"Run without --json-only to download {len(id_to_filename)} images.")
            return

        if not id_to_filename:
            print("Entity JSON saved. No new images to download.")
            return
        print(f"  {len(id_to_filename)} IDs need image downloads")

        # ----------------------------------------------------------------
        # Step 2 — get thumbnail URLs from Commons (50 files/request)
        # ----------------------------------------------------------------
        print(f"\nStep 2/3  Commons thumbnail URLs ({len(id_to_filename)} files, 50/request, 1 req/sec)")
        all_filenames = list(id_to_filename.values())
        filename_to_url: dict[str, str] = {}
        fn_batches = list(chunks(all_filenames, 50))
        for i, batch in enumerate(fn_batches, 1):
            if i > 1:
                time.sleep(API_DELAY)
            print(f"  batch {i}/{len(fn_batches)} ({len(batch)} files) ...", end=" ", flush=True)
            try:
                got = fetch_thumbnail_urls(client, batch)
                filename_to_url.update(got)
                print(f"got {len(got)} URLs")
            except httpx.HTTPError as e:
                print(f"FAILED ({e})", file=sys.stderr)

        download_map = {
            wid: filename_to_url[fn]
            for wid, fn in id_to_filename.items()
            if fn in filename_to_url
        }
        if not download_map:
            print("No thumbnail URLs resolved — nothing to download.")
            return

        # ----------------------------------------------------------------
        # Step 3 — download images (1/sec, CDN)
        # ----------------------------------------------------------------
        print(f"\nStep 3/3  Downloading {len(download_map)} images (1/sec)")
        ok = fail = 0
        for i, (wid, url) in enumerate(sorted(download_map.items()), 1):
            print(f"  [{i:3d}/{len(download_map)}] {wid} ...", end=" ", flush=True)
            try:
                path = download_image(client, url, wid)
                kb = path.stat().st_size // 1024
                print(f"OK  {path.name}  ({kb} KB)")
                ok += 1
            except (httpx.HTTPError, OSError) as e:
                print(f"FAILED: {e}", file=sys.stderr)
                fail += 1
            if i < len(download_map):
                time.sleep(IMAGE_DELAY)

    print(f"\nDone — {ok} images downloaded, {fail} failed, {already_cached} fully cached.")
    print(f"Images:      {IMAGES_DIR}")
    print(f"Entity JSON: {WIKIDATA_JSON_DIR}")


if __name__ == "__main__":
    main()
