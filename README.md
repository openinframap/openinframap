This is the style and mapping configuration for [OpenInfraMap](https://openinframap.org).

The mapping file controls how the OSM subset is imported with
[imposm3](https://imposm.org/docs/imposm3/latest/). It's generated from the files in [mapping](mapping)
by calling `python3 ./mapping/main.py > ./mapping.json`.

The `layers.yml` file is used to generate the Tegola config using
`python3 ./util/generate_tegola_config.py ./layers.yml > ./config.toml`.
