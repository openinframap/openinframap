from funcs import table, type_col


table("telecom_cable", {"communication": ["line", "cable"]}, "linestring")

table(
    "telecom_building",
    {
        "building": ["data_center", "data_centre", "telephone_exchange"],
        "telecom": ["data_center", "data_centre", "central_office", "exchange"],
        "office": ["telecommunication"],
        "man_made": ["telephone_office"],
    },
    ["points", "polygons"],
    columns=[type_col],
)

table(
    "telecom_location",
    {"telecom": ["connection_point", "distribution_point"]},
    ["points", "polygons"],
    columns=[type_col],
)

table(
    "mast", {"man_made": ["mast", "tower", "communications_tower"]}, "point", columns=[type_col]
)
