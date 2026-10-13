from funcs import table, type_col, str_col

table(
    "petroleum_site",
    {
        "industrial": [
            "oil",
            "fracking",
            "oil_storage",
            "petroleum_terminal",
            "hydrocarbons",
            "oil sands",
            "oil_sands",
            "gas",
            "gas_storage",
            "natural_gas",
            "wellsite",
            "well_cluster",
            "refinery",
        ],
        "pipeline": ["substation"],
    },
    "polygon",
    columns=[
        type_col,
        str_col("name"),
        str_col("utility")
    ],
)

table(
    "petroleum_well",
    {"man_made": ["petroleum_well", "oil_well"]},
    "point",
    columns=[type_col],
)

table(
    "offshore_platform",
    {"man_made": ["offshore_platform"]},
    ["points", "polygons"],
)
