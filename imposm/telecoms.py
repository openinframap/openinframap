from funcs import table, type_col, str_col


table(
    "telecom_cable",
    {
        "communication": ["line", "cable"],
        "construction:communication": ["line", "cable"],
        "disused:communication": ["line", "cable"],
    },
    "linestring",
    columns=[
        type_col,
        str_col("telecom:medium")
    ]
)

table(
    "telecom_building",
    {
        "building": ["data_center", "data_centre", "telephone_exchange"],
        "telecom": ["data_center", "data_centre", "central_office", "exchange"],
        "office": ["telecommunication"],
        "man_made": ["telephone_office"],
        "construction:telecom": ["data_center", "data_centre", "central_office", "exchange"],
        "disused:telecom": ["data_center", "data_centre", "central_office", "exchange"]
    },
    ["points", "polygons"],
    columns=[
        type_col,
        str_col("telecom:medium")
    ],
)

table(
    "telecom_location",
    {"telecom": ["connection_point", "distribution_point"]},
    ["points", "polygons"],
    columns=[
        type_col,
        str_col("telecom:medium")
    ],
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
