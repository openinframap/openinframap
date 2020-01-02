import json
from funcs import tables, generalized_tables

import power  # noqa
import telecoms  # noqa
import petroleum  # noqa


data = {
    "areas": {"area_tags": ["building"]},
    "tags": {
        "load_all": True,
        # Exclusion list created by manually trawling the taginfo list of keys for a few pages
        "exclude": [
            "created_by",
            "source",
            "source:*",
            "tiger:*",
            "landuse",
            "highway",
            "amenity",
            "office",
            "shop",
            "addr:*",
            "natural",
            "surface",
            "waterway",
            "oneway",
            "service",
            "wall",
            "barrier",
            "maxspeed",
            "lanes",
            "access",
            "ele",
            "attribution",
            "tracktype",
            "place",
            "leisure",
            "railway",
            "bicycle",
            "foot",
            "bridge",
            "shop",
            "lit",
            "import",
            "note",
            "leaf_type",
            "crossing",
            "lacounty:*",
            "osak:*",
            "water",
            "yh:*",
            "tourism",
            "entrance",
            "NHD:*",
            "sport",
            "gauge",
            "leaf_cycle",
            "bus",
            "opening_hours",
            "wheelchair",
        ],
    },
    "tables": tables,
    "generalized_tables": generalized_tables
}

print(json.dumps(data, indent=3))
