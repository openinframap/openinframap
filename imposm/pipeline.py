from funcs import (
    table,
    str_col,
    type_col,
)

table(
    "pumping_station",
    {
        "man_made": ["pumping_station"],
        "construction:man_made": ["pumping_station"],
        "disused:man_made": ["pumping_station"]
    },
    "polygon",
    columns=[
        str_col("name"),
        str_col("pumping_station"),
        str_col("utility"),
        str_col("substance"),
        str_col("construction:man_made", "construction"),
        str_col("disused:man_made", "disused")
    ]
)

table(
    "pipeline",
    {
        "man_made": ["pipeline"],
        "construction:man_made": ["pipeline"],
        "disused:man_made": ["pipeline"]
    },
    "linestring",
    columns=[
        str_col("substance"),
        str_col("type"),
        str_col("construction:man_made", "construction"),
        str_col("disused:man_made", "disused"),
    ],
)

table(
    "pipeline_feature",
    {"pipeline": ["valve", "flare", "surge_tank"]},
    "point",
    columns=[
        str_col("valve"),
        str_col("actuator"),
        str_col("handle"),
        str_col("operator"),
        type_col
    ],
)

table(
    "pipeline_pump",
    {"man_made": ["pump"]},
    "point",
    columns=[
        type_col,
        str_col("pump_mechanism"),
        str_col("mechanical_driver"),
        str_col("mechanical_coupling"),
        str_col("handle"),
        str_col("operator"),
        str_col("substance"),
        str_col("flow_rate"),
        str_col("pressure")
    ],
)

table(
    "inlets",
    {"inlet": ["__any__"]},
    "point",
    columns=[
        type_col,
        str_col("name"),
        str_col("operator"),
        str_col("diameter"),
        str_col("substance"),
        str_col("flow_rate")
    ],
)

table(
    "outlets",
    {
        "outlet": ["__any__"],
        "man_made": ["outfall"],
    },
    "point",
    columns=[
        type_col,
        str_col("name"),
        str_col("operator"),
        str_col("diameter"),
        str_col("substance"),
        str_col("flow_rate")
    ],
)