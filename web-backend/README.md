OpenInfraMap web backend, serving info and stats pages.

## Configuration

This app needs the `DATABASE_URL` defined with the details of the OpenInfraMap database:
	
	DATABASE_URL=postgresql://osm:osm@db/osm

You can define this in a `.env` file in this directory, which is useful for development.

## Development
You'll need [uv](https://docs.astral.sh/uv/) installed.

	uv run uvicorn main:app --reload
