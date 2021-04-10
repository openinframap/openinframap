This is a Docker implementation to run tegola with expired tiles removal for [OpenInfraMap](https://openinframap.org).

## Build

Build is done using the provided Dockerfile at the root of this repository (not in this directory).

```
docker build [--build-arg TEGOLA_CONFIG=tegola] -f tegola.Dockerfile -t oim/tegola:latest .
```

Build argument `TEGOLA_CONFIG` gives directory name to get `tegola.yaml` and `layers.yaml` files. It is useful for switching between different configurations in the same repository.

Build script will produce an up to date `config.toml` file according to `tegola.yaml` and `layers.yaml` files.  
There is no need to generate this file manually.

## Volumes

Tegola stores its cache internally and cache is cleared on shutdown.

If tiles expiry is required, Tegola should access to remote imposm3 volume to get expired tiles information

## Run

This image runs a Tegola server providing the configured layers at build time.  
Tegola connects to remote PostGis

Use the following
```
docker run -it -v /data/files/imposm3:/data/files/imposm3 [-e BOUNDS=-180,-85.0511,180,85.0511 -e DB_HOST=localhost -e DB_PORT=5432 -e DB_DATABASE=osm -e DB_USER=user -e DB_PWD=password] oim/tegola:latest
```

It requires to access to imposm3 files to get expired tiles log.

Use it with following environment variables:
* BOUNDS : Geo bounds inside which the server serves tiles
* DB_URI : DB URI to access the database tegola connects to