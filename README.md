# Open Infrastructure Map
This is the main repository for [Open Infrastructure Map](https://openinframap.org), a map showing the world's
infrastructure from [OpenStreetMap](https://www.openstreetmap.org).

## Translations
We're aiming to make OpenInfraMap multilingual - if you can help translate, please
[contribute on Weblate](https://hosted.weblate.org/engage/open-infrastructure-map/).
[![Translation status](https://hosted.weblate.org/widget/open-infrastructure-map/multi-auto.svg)](https://hosted.weblate.org/engage/open-infrastructure-map/)

## Web frontend

The [web frontend](web) contains the web app, written in TypeScript using Maplibre GL JS, and served as static files.

## Web backend

The [web backend](web-backend) serves the [stats pages](https://openinframap.org/stats), as well as
some additional non-JS web endpoints. It's an async python web app built using starlette.

## Database

The database runs [Postgres](https://www.postgresql.org/) with [PostGIS](https://postgis.net/) and
is populated from the OpenStreetMap replication feed by [Imposm 3](https://imposm.org/docs/imposm3/latest/).
[More info](./imposm)

Changes to the mapping require a re-import of the OpenStreetMap database, which takes
a while and is currently done very irregularly.

I will generally not make any changes to the mapping files unless I'm ready to run a re-import, so if you'd like some changes made to those, please raise an issue rather than a PR.

## Tile Server

Map tiles are served with [Tegola](https://tegola.io/). There's a YAML-based language
which generates the Tegola config, from the `tegola.yml` and `layers.yml` files:

`python3 ./tegola/generate_tegola_config.py ./tegola/tegola.yml ./tegola/layers.yml > ./tegola/config.toml`

## Services

Imposm runs as a service with the `-expiretiles-dir` option:

	/usr/local/bin/imposm run -config /home/osm/imposm.json -expiretiles-dir /home/osm/imposm-expire

The low-zoom layers are seeded daily with:

	/usr/local/bin/tegola cache seed --bounds="-180,-85.0511,180,85.0511" --max-zoom 6 --overwrite --config /home/osm/styles/tegola/config.toml

Invalidated tiles are removed every minute:

	/usr/bin/python3 /home/osm/styles/tegola/expire.py /home/osm/imposm-expire

Materialised views are updated every 10 minutes with:

	/usr/bin/psql -h 10.43.18.68 osm < /home/osm/styles/refresh_matviews.sql  > /dev/null

Old diff files are removed periodically with:

	/usr/bin/find /home/osm/imposm_diff -type f -mtime +14 -exec rm {} \; > /dev/null
