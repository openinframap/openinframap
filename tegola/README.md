# OpennfraMap Tileserver

Map tiles are served with [Tegola](https://tegola.io/). There's a YAML-based language
which generates the Tegola config, from the `tegola.yml` and `layers.yml` files

## Build

You can generate Tegola config with:

```sh
python3 ./generate_tegola_config.py ./tegola.yml ./layers.yml > ./config.toml`
```

### Docker

Two images are to be considered, one to serve tiles and one to handle expiry logs coming from imposm.

Docker allows to build several images based upon independant configurations, with:

```sh
docker build --build-arg TEGOLA_CONFIG=. -f Dockerfile -t openinframap/tileserver .
docker build --build-arg TEGOLA_CONFIG=. -f Dockerfile.expiry -t openinframap/tileserverexpiry .
```

It is possible to omit TEGOLA_CONFIG arg to use `tegola.yml` and `layers.yml` from this directory.  
Any other value sould refer to a directory available in docker builder scope container another `tegola.yml` and `layers.yml`.

## Run

Tegola is started with:

```sh
/opt/tegola serve --config ./config.toml
```

### Docker

You should run both container, main and expiry as to serve tiles and handle expiry logs coming from imposm

```sh
docker run -d --rm -v /tmp:/tmp -e BOUNDS=-180,-85.0511,180,85.0511 -e DB_URI=postgres://user:password@host:port/database openinframap/tileserver

docker run -d --rm -v /tmp:/tmp -e BOUNDS=-180,-85.0511,180,85.0511 -e DB_URI=postgres://user:password@host:port/database openinframap/tileserverexpiry
```

`BOUNDS` states which extent is served by the tileserver  
`DB_URI` sets connection to the database