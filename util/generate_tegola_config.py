import sys
import yaml
import toml
from collections import defaultdict

dbname = "osm"
geometry_field = "geometry"
provider_name = "postgis"
default_map = "openinframap"

map_layers = defaultdict(list)

conf = {
    "webserver": {"port": ":8081"},
    #    "cache": {"type": "file", "path": "/tmp/tegola"},
    "providers": [
        {
            "name": provider_name,
            "type": "mvt_postgis",
            "host": "10.43.18.68",
            "port": 5432,
            "database": dbname,
            "user": "osm",
            "password": "osm",
            "srid": 3857,
            "max_connections": 20,
            "layers": [],
        }
    ],
    "maps": []
}


with open(sys.argv[1], "r") as f:
    config = yaml.load(f, Loader=yaml.SafeLoader)


def build_field(name, val):
    if val is None:
        return name
    else:
        return f"{val} AS {name}"


def get_field_sets(names):
    data = []
    for name in names:
        data += config["field_sets"][name]
    return data


def build_sql(data):
    sql = "SELECT "

    if "id_field" in data and data["id_field"] not in [
        f["name"] for f in data.get("fields", [])
    ]:
        sql += data["id_field"] + ", "

    sql += ", ".join(
        build_field(f["name"], f.get("sql"))
        for f in get_field_sets(data.get("field_sets", [])) + data.get("fields", [])
    )
    sql += f" FROM {data['from']}"
    if "where" in data:
        sql += f" WHERE {data['where']}"
    if "order_by" in data:
        sql += f" ORDER BY {data['order_by']}"
    return sql


for layer in config["layers"]:
    map_layers[layer.get('map', default_map)].append(
        {
            "min_zoom": layer.get("min_zoom", 2),
            "max_zoom": layer.get("max_zoom", 17),
            "provider_layer": provider_name + "." + layer["name"],
        }
    )

    layer_config = {
        "name": layer["name"],
        "sql": build_sql(layer),
        "geometry_type": layer["geometry_type"],
    }

    if "id_field" in layer:
        layer_config["id_fieldname"] = layer["id_field"]

    conf["providers"][0]["layers"].append(layer_config)


# with open('config.toml', 'w') as f:
#    toml.dump(conf, f)

for name, layers in map_layers.items():
    conf["maps"].append({"name": name, "layers": layers, "center": [0.0,0.0,2.0]})

print(toml.dumps(conf))
