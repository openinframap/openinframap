This is the style and mapping configuration for [OpenInfraMap](https://openinframap.org).

The mapping file controls how the OSM subset is imported with
[imposm3](https://imposm.org/docs/imposm3/latest/). It's generated from the files in [mapping](mapping)
by calling `python3 ./mapping/main.py > ./mapping.json`.

The `layers.yml` file is used to generate the Tegola config using
`python3 ./tegola/generate_tegola_config.py ./tegola/layers.yml > ./config.toml`.

## Services

Imposm runs as a service with the `-expiretiles-dir` option:

	/usr/local/bin/imposm run -config /home/osm/imposm.json -expiretiles-dir /home/osm/imposm-expire

The low-zoom layers are seeded daily with:

	/usr/local/bin/tegola cache seed --bounds="-180,-85.0511,180,85.0511" --min-zoom 2 --max-zoom 6 --overwrite --config /home/osm/styles/config.toml

Invalidated tiles are removed every minute:

	/usr/bin/python3 /home/osm/styles/tegola/expire.py /home/osm/imposm-expire

Materialised views are updated every 10 minutes with:

	/usr/bin/psql -h 10.43.18.68 osm < /home/osm/styles/refresh_matviews.sql  > /dev/null

Old diff files are removed periodically with:

	/usr/bin/find /home/osm/imposm_diff -type f -mtime +14 -exec rm {} \; > /dev/null
