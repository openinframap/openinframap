from pathlib import Path

from starlette.config import Config

config = Config(".env")

DATABASE_URL = config("DATABASE_URL")
DEBUG = config("DEBUG", cast=bool, default=False)

# Offline caches populated by scripts/fetch_images.py (repo-root data/ directory)
LOCAL_DATA_DIR = Path(__file__).parent.parent.parent / "data"
IMAGES_DIR = LOCAL_DATA_DIR / "images"
WIKIDATA_JSON_DIR = LOCAL_DATA_DIR / "wikidata_json"
