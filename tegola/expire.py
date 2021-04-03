# expire.py - reads expiry files output by Imposm and tells Tegola to purge the affected tiles
# Expiry files are output by the `-expiretiles-dir` Imposm option.
from pathlib import Path
import subprocess
import os
import sys

if len(sys.argv) != 2:
    print("Usage:", sys.argv[0], "<imposm expire dir>")
    sys.exit(1)


expire_dir = sys.argv[1]

pathlist = Path(expire_dir).glob("**/*.tiles")
for path in pathlist:
    print("Handling expire for", path)
    subprocess.run(
        [
            "tegola",
            "cache",
            "purge",
            "tile-list",
            path,
            "--config",
            "/home/osm/styles/tegola/config.toml",
            "--max-zoom",
            "17",
            "--min-zoom",
            "7",
        ]
    )
    os.remove(path)


# Clean expire dir by removing empty directories
for path in Path(expire_dir).iterdir():
    if path.is_dir() and not any(path.iterdir()):
        print("Removing directory", path)
        path.rmdir()
