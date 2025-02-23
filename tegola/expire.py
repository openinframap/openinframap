"""
Watches for expiry files output by Imposm and tells Tegola to purge the affected tiles.
Expiry files are output by the `-expiretiles-dir` Imposm option.
"""

from pathlib import Path
import subprocess
import os
import click
import time
from inotify.adapters import InotifyTree
import logging
from datetime import datetime
import psycopg

log = logging.getLogger(__name__)


def expire(tile_list: Path, tegola_config: str, dry_run: bool):
    log.info("Handling expire for %s", tile_list)
    cmd = [
        "/opt/tegola",
        "cache",
        "purge",
        "tile-list",
        str(tile_list),
        "--config",
        tegola_config,
        "--max-zoom",
        "17",
        "--min-zoom",
        "7",
    ]
    if dry_run:
        log.info("Would run: %s", " ".join(cmd))
        return

    subprocess.run(cmd)
    os.remove(tile_list)


def expire_path(expire_dir: Path, tegola_config: str, dry_run: bool):
    path_list = expire_dir.glob("**/*.tiles")
    for tile_list in path_list:
        expire(tile_list, tegola_config, dry_run)


def current_dir() -> str:
    return datetime.now().strftime("%Y%m%d")


def clean_empty_dirs(expire_dir: Path, dry_run: bool):
    """Delete empty directories, except the one for the current day."""
    log.info("Cleaning empty directories in %s", expire_dir)

    for path in expire_dir.iterdir():
        if (
            path.is_dir()
            and not any(path.iterdir())
            and path.parts[-1] != current_dir()
        ):
            print("Removing directory", path)
            if not dry_run:
                path.rmdir()


def refresh_matviews():
    db_dsn = os.environ.get("DB_URI")
    if not db_dsn:
        log.warning("DB_URI not set, skipping materialized view refresh")
        return

    with psycopg.connect(db_dsn) as conn:
        with conn.cursor() as cur:
            cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY power_plant_relation")
            cur.execute(
                "REFRESH MATERIALIZED VIEW CONCURRENTLY power_substation_relation"
            )
            conn.commit()


@click.command()
@click.argument("expire_dir")
@click.option("--tegola-config", default="/etc/tegola/config.toml")
@click.option("--dry-run", is_flag=True)
def main(expire_dir, tegola_config, dry_run):
    log.info("Starting...")
    expire_dir = Path(expire_dir)
    expire_path(expire_dir, tegola_config, dry_run)
    clean_empty_dirs(expire_dir, dry_run)

    log.info("Watching for new changes...")
    inotify = InotifyTree(str(expire_dir))
    event_count = 0
    for _, type_names, path, filename in inotify.event_gen(yield_nones=False):
        if not ("IN_MOVED_TO" in type_names and filename.endswith(".tiles")):
            continue

        log.info("Received IN_MOVED_TO for tile file %s", filename)
        start = time.monotonic_ns()
        refresh_matviews()
        log.info(
            "Refreshed materialized views in %.2f ms",
            (time.monotonic_ns() - start) / 1e6,
        )
        # Still look for every file in the path in case we've missed any inotify events.
        expire_path(expire_dir, tegola_config, dry_run)
        log.info(
            "Finished handling expire in %.2f ms", (time.monotonic_ns() - start) / 1e6
        )

        # Cleanup empty dirs on every 10th event
        if event_count % 10 == 0:
            clean_empty_dirs(expire_dir, dry_run)
        event_count += 1


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    main()
