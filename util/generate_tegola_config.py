# coding=utf-8
from __future__ import division, absolute_import, print_function, unicode_literals
import sys
import yaml
import toml

dbname = "osm"
geometry_field = "geometry"

conf = {
    "webserver": {
        "port": ":8080"
    },
#    "cache": {
#        "type": "file",
#        "path": "/tmp/tegola"
#    },
    "providers": [{
        "name": "postgis",
        "type": "postgis",
        "host": "db",
        "port": 5432,
        "database": dbname,
        "user": "osm",
        "password": "osm",
        "srid": 3857,
        "max_connections": 20,
        "layers": []
    }
    ],
    "maps": [{
        "name": "openinframap",
        "layers": []
    }]
}


with open(sys.argv[1], 'r') as f:
    config = yaml.load(f)

for out_layer in config:
    for layer in out_layer['layers']:
        lname = out_layer['name'] + '_' + layer['name']
        provider_layer_config = {
            "name": lname,
            "sql": layer['query']
        }
        conf["providers"][0]['layers'].append(provider_layer_config)

        map_layer_config = {
            "provider_layer": "postgis.%s" % (lname),
            "min_zoom": 0,
            "max_zoom": 17
        }
        conf['maps'][0]['layers'].append(map_layer_config)

with open('config.toml', 'w') as f:
    toml.dump(conf, f)
