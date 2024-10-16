OpenInfraMap web backend, serving info and stats pages.

## Configuration

This app needs the `DATABASE_URL` defined with the details of the OpenInfraMap database:
	
	DATABASE_URL=postgresql://osm:osm@db/osm

You can define this in a `.env` file in this directory, which is useful for development.

## Development

	poetry install
	poetry run uvicorn main:app --reload
