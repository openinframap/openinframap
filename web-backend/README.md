# Web Backend

Async Python web app (Starlette + uvicorn) serving stats pages, Wikidata
proxy endpoints, and search.

## Configuration

This app needs `DATABASE_URL` defined with the details of the OpenInfraMap database.
The URL must use the `postgresql+asyncpg://` scheme (SQLAlchemy async driver).

Copy the example env file:

```bash
cp .env.example .env
```

`.env.example` contains:

```
DATABASE_URL=postgresql+asyncpg://osm:osm@localhost:5432/osm
```

Adjust the connection string if your local Postgres is on a different port or has
different credentials.

## Running

Normally it runs in Docker as the `backend` Compose service (`bash scripts/start.sh`
starts it): `docker compose up -d backend`. That uses the database URL from
`docker-compose.yml`, not `.env`.

To work on the backend with auto-reload, stop the container and run it on the host:

```bash
docker compose stop backend
uv run uvicorn src.main:app --reload --port 8001
```

Either way it listens on `http://localhost:8001`.

## Offline Wikidata cache

This fork caches Wikidata entity metadata and Wikimedia Commons thumbnails locally so
feature popups work without an internet connection.

**How it works:**

- `GET /wikidata/{id}` checks `data/wikidata_json/{id}.json` before calling the Wikidata API.
  If the file exists, no network request is made.
- If a local image exists at `data/images/{id}.*`, it is served via the `/local-images/`
  static endpoint instead of the Wikimedia CDN URL.
- If no local cache exists and the network is unavailable, the endpoint returns 404 (the
  popup opens without image or links, rather than crashing).

**Building the cache:**

Run `scripts/fetch_images.py` from the repo root after importing the database:

```bash
uv run scripts/fetch_images.py --json-only   # metadata only (~10 sec)
uv run scripts/fetch_images.py               # metadata + images (~8 min)
```

See [docs/LOCAL_DEVELOPMENT.md](../docs/LOCAL_DEVELOPMENT.md) for the full setup guide.

## Linting and type checking

```bash
uv run ruff check    # lint
uv run mypy .        # type check
uv run pytest        # tests
```
