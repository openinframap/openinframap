This is the style and mapping configuration for [OpenInfraMap](https://openinframap.org).

The .mss (CartoCSS) files are transformed to Mapnik XML using Magnacarto.

The [mapping.yml](mapping.yml) file controls how the OSM subset is imported with
[imposm3](https://imposm.org/docs/imposm3/latest/).

It's currently quite tricky to test changes here, but I'm working on a Docker-based
system to make this easier.
