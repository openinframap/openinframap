from funcs import table, relation_tables, str_col, int_col, bool_col, type_col


table(
    "power_line",
    {"power": ["line", "minor_line", "cable", "minor_cable"]},
    "linestring",
    columns=[
        str_col("location"),
        str_col("line"),
        str_col("voltage"),
        str_col("frequency"),
        int_col("circuits"),
        bool_col("tunnel"),
    ],
)

table(
    "power_tower",
    {"power": ["tower", "pole", "portal"]},
    ["points", "linestrings"],
    columns=[type_col, bool_col("location:transition", "transition")],
)

table(
    "power_substation",
    {"power": ["substation", "sub_station"]},
    ["points", "polygons"],
    columns=[
        type_col,
        str_col("substation"),
        str_col("voltage"),
        str_col("frequency"),
        bool_col("tunnel"),
    ],
)

relation_tables(
    "power_substation_relation",
    {"power": ["substation", "sub_station"]},
    relation_types=["site"],
    relation_columns=[str_col("voltage")],
)


table(
    "power_switchgear",
    {
        "power": [
            "switch",
            "transformer",
            "compensator",
            "insulator",
            "terminal",
            "converter",
        ]
    },
    ["points", "polygons"],
    columns=[str_col("voltage"), type_col],
)


table(
    "power_plant",
    {"power": ["plant"], "construction:power": ["plant"]},
    "polygon",
    columns=[
        str_col("plant:output:electricity", "output"),
        str_col("plant:source", "source"),
        str_col("construction_power", "construction"),
    ],
)

relation_tables(
    "power_plant_relation",
    {"power": ["plant"], "construction:power": ["plant"]},
    ["site"],
    relation_columns=[
        str_col("plant:output:electricity", "output"),
        str_col("plant:source", "source"),
        str_col("construction_power", "construction"),
    ],
)

table("power_generator", {"power": ['generator']}, ["points", "polygons"], columns=[
    str_col("generator:source", "source"),
    str_col("generator:method", "method"),
    str_col("generator:type", "type"),
    str_col("generator:output", "output")
])
