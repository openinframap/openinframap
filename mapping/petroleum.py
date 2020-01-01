from funcs import table, type_col, str_col

table(
    "marker",
    {"pipeline": ["marker"], "power": ["marker"], "marker": ["__any__"]},
    "point",
    columns=[type_col],
)

table(
    "pipeline",
    {"man_made": ["pipeline"], "construction:man_made": ["pipeline"]},
    "linestring",
    columns=[
        str_col("substance"),
        str_col("type"),
        str_col("construction:man_made", "construction"),
    ],
)

table(
    "petroleum_site",
    {
        "industrial": [
            "oil",
            "fracking",
            "oil_storage",
            "hydrocarbons",
            "oil sands",
            "oil_sands",
            "gas",
            "natural_gas",
            "wellsite",
            "well_cluster",
        ]
    },
    "polygon",
    columns=[type_col],
)

table(
    "pipeline_feature",
    {"pipeline": ["valve", "substation", "flare"]},
    "point",
    columns=[type_col],
)

table(
    "petroleum_well",
    {"man_made": ["petroleum_well", "oil_well"]},
    "point",
    columns=[type_col],
)
