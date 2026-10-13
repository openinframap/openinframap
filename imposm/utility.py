from funcs import (
    table,
    str_col,
    bool_col,
    type_col,
)

table(
    "utility_pole",
    {
        "man_made": ["utility_pole"],
        "construction:man_made": ["utility_pole"],
        "disused:man_made": ["utility_pole"]
    },
    "point",
    columns=[
        type_col,
        bool_col("location:transition", "transition"),
        str_col("construction:man_made", "construction"),
        str_col("disused:man_made", "disused")
    ]
)

table(
    "utility_marker",
    {"marker": ["__any__"]},
    "point",
    columns=[
        str_col("utility"),
        str_col("colour"),
        str_col("material"),
        str_col("operator"),
        type_col
    ]
)

table(
    "street_cabinet",
    {
        "man_made": ["street_cabinet"],
        "construction:man_made": ["street_cabinet"],
        "disused:man_made": ["street_cabinet"]
    },
    ["points", "polygons"],
    columns=[
        str_col("utility"),
        str_col("street_cabinet"),
        str_col("construction:man_made", "construction"),
        str_col("disused:man_made", "disused")
    ]
)