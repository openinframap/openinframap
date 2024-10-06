from funcs import table, type_col, str_col


table(
    "telecom_cable",
    {
        "communication": ["line", "cable"],
        "construction:communication": ["line", "cable"],
    },
    "linestring",
)

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
    "mast",
    {
        "man_made": ["mast", "tower", "communications_tower"],
        "tower:type": ["communication"],
    },
    ["points", "polygons"],
    columns=[type_col],
)

table(
    "telecom_antenna",
    {
        "man_made": ["antenna"],
    },
    ["points", "polygons"],
    columns=[type_col],
)

table(
    "utility_pole",
    {"man_made": ["utility_pole"]},
    "point",
    columns=[str_col("utility")],
)

table(
    "street_cabinet",
    {"man_made": ["street_cabinet"]},
    ["points", "polygons"],
    columns=[str_col("utility")],
)
