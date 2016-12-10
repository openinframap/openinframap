# coding=utf-8
from __future__ import division, absolute_import, print_function, unicode_literals
import sys
import yaml
import json

srs = '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0.0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs +over'
dbname = "osm"
extent = "-20037508.34 -20037508.34 20037508.34 20037508.34"
geometry_field = "geometry"

tilestache_conf = {
    "cache": {
        "name": "Disk",
        "path": "/tmp/stache",
        "umask": "0000",
        "dirs": "portable",
        "gzip": ["xml", "json"]
    },
    "layers": {}
}

with open(sys.argv[1], 'r') as f:
    config = yaml.load(f)

for out_layer in config:
    mml = {"name": "OpenInfraMap %s" % out_layer['name'],
           "Layer": [],
           "Stylesheet": ["%s.mss" % out_layer['name']],
           "format": "png",
           "interactivity": False,
           "maxzoom": 18,
           "minzoom": 0,
           "srs": srs
           }
    for layer in out_layer['layers']:
        layer_config = {
            "Datasource": {
                "dbname": dbname,
                "extent": extent,
                "id": layer['name'],
                "key_field": "",
                "project": "openinframap",
                "geometry_field": geometry_field,
                "srs": srs,
                "table": "(%s) AS data" % layer['query'],
                "type": "postgis"
            },
            "class": "",
            "geometry": layer['geometry'],
            "id": layer['name'],
            "name": layer['name'],
            "srs": srs,
            "srs-name": "900913",
            "status": "on"
        }
        mml["Layer"].append(layer_config)

    with open('%s.mml' % out_layer['name'], 'w') as f:
        json.dump(mml, f, sort_keys=True, indent=2)

    tilestache_conf['layers'][out_layer['name']] = {
        "provider": {
            "name": "mapnik",
            "mapfile": "%s.xml" % out_layer['name']
        },
        "metatile": {
            "rows": 4,
            "columns": 4,
            "buffer": 64
        }
    }

with open('tilestache.json', 'w') as f:
    json.dump(tilestache_conf, f, sort_keys=True, indent=2)
