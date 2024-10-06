from funcs import (
    table,
    relation_tables,
    generalized_table,
    str_col,
    int_col,
    bool_col,
    type_col,
)


table(
    "power_line",
    {
        "power": ["line", "minor_line", "cable", "minor_cable"],
        "construction:power": ["line", "minor_line", "cable", "minor_cable"],
        "disused:power": ["line", "minor_line", "cable", "minor_cable"],
    },
    "linestring",
    columns=[
        type_col,
        str_col("location"),
        str_col("line"),
        str_col("voltage"),
        str_col("frequency"),
        int_col("circuits"),
        str_col("construction:power", "construction"),
        str_col("disused:power", "disused"),
        bool_col("tunnel"),
    ],
)

relation_tables(
    "power_circuit_relation",
    {
        "route": ["power"],
        "power": ["circuit"],
        "construction:power": ["circuit"],
    },
    relation_types=["route", "power"],
    relation_columns=[
        str_col("name"),
        str_col("voltage"),
        str_col("frequency"),
        str_col("construction:power", "construction"),
    ],
)

generalized_table(
    "power_line_gen_100",
    "power_line",
    100,
    "coalesce(convert_voltage(voltage), 0) > 100000 AND ST_length(geometry) > 200 "
    "AND line NOT IN ('bay', 'busbar')",
)

generalized_table(
    "power_line_gen_500",
    "power_line",
    500,
    "coalesce(convert_voltage(voltage), 0) > 100000 AND ST_length(geometry) > 600 "
    "AND line NOT IN ('bay', 'busbar')",
)

table(
    "power_tower",
    {
        "power": ["tower", "pole", "portal"],
        "construction:power": ["tower", "pole", "portal"],
        "disused:power": ["tower", "pole", "portal"],
    },
    ["points", "linestrings"],
    columns=[
        type_col,
        bool_col("location:transition", "transition"),
        str_col("construction:power", "construction"),
        str_col("disused:power", "disused"),
    ],
)

table(
    "power_substation",
    {
        "power": ["substation"],
        "construction:power": ["substation"],
    },
    ["points", "polygons"],
    columns=[
        type_col,
        str_col("substation"),
        str_col("voltage"),
        str_col("frequency"),
        str_col("construction:power", "construction"),
        bool_col("tunnel"),
    ],
)

relation_tables(
    "power_substation_relation",
    {
        "power": ["substation"],
        "construction:power": ["substation"],
    },
    relation_types=["site"],
    relation_columns=[
        str_col("substation"),
        str_col("voltage"),
        str_col("frequency"),
        str_col("construction:power", "construction"),
        bool_col("tunnel"),
    ],
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
        str_col("construction:power", "construction"),
    ],
)

relation_tables(
    "power_plant_relation",
    {"power": ["plant"], "construction:power": ["plant"]},
    ["site"],
    relation_columns=[
        str_col("plant:output:electricity", "output"),
        str_col("plant:source", "source"),
        str_col("construction:power", "construction"),
    ],
)

table(
    "power_generator",
    {"power": ["generator"], "construction:power": ["generator"]},
    ["points", "polygons"],
    columns=[
        str_col("generator:source", "source"),
        str_col("generator:method", "method"),
        str_col("generator:type", "type"),
        str_col("generator:output:electricity", "output"),
        str_col("construction:power", "construction"),
    ],
)
