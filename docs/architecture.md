# Open Infrastructure Map Architecture

## Web frontend
The [web frontend](/web) contains the web app, written in TypeScript using Maplibre GL JS, and served as static files. If you just want to develop the web frontend, this can be run alone, and will use other services from the production OpenInfraMap server.

## Web backend
The [web backend](/web-backend) serves the [stats pages](https://openinframap.org/stats), as well as
some additional non-JS web endpoints. It's an async python web app built using starlette.

## Database
The database runs [Postgres](https://www.postgresql.org/) with [PostGIS](https://postgis.net/) and
is populated from the OpenStreetMap replication feed by [Imposm 3](https://imposm.org/docs/imposm3/latest/).
[More info](/imposm)

Changes to the mapping require a re-import of the OpenStreetMap database, which takes
a while and is currently done very irregularly.

I will generally not make any changes to the mapping files unless I'm ready to run a re-import, so if you'd like some changes made to those, please raise an issue rather than a PR.

## Tile server
Map tiles are served with [Tegola](https://tegola.io/).

[Tile server documentation](/tegola).

## Other services
Imposm runs as a service with the `-expiretiles-dir` option:

    /usr/local/bin/imposm run -config /home/osm/imposm.json -expiretiles-dir /home/osm/imposm-expire

The low-zoom layers are seeded daily with:

    /usr/local/bin/tegola cache seed --bounds="-180,-85.0511,180,85.0511" --max-zoom 6 --overwrite --config /home/osm/styles/tegola/config.toml

Invalidated tiles are removed by the [expire.py](/tegola/expire.py) script, which also refreshes materialized views:

    /usr/bin/python3 /home/osm/styles/tegola/expire.py /home/osm/imposm-expire

Old diff files are removed periodically with:

    /usr/bin/find /home/osm/imposm_diff -type f -mtime +14 -exec rm {} \; > /dev/null
