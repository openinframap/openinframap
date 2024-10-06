from funcs import table, type_col, str_col

table(
    "water_treatment_plant",
    {"man_made": ["water_works", "desalination_plant"]},
    "polygon",
    columns=[type_col, str_col("name")],
)

table(
    "wastewater_plant",
    {"man_made": ["wastewater_plant"]},
    "polygon",
    columns=[type_col, str_col("name")],
)

table(
    "pumping_station",
    {"man_made": ["pumping_station"]},
    "polygon",
    columns=[str_col("name"), str_col("pumping_station"), str_col("substance")],
)

table("water_tower", {"man_made": ["water_tower"]}, ["points", "polygons"])

table("water_well", {"man_made": ["water_well"]}, ["points", "polygons"])

table(
    "pressurised_waterway",
    {"waterway": ["pressurised"]},
    "linestring",
    columns=[str_col("name")],
)

table(
    "water_reservoir",
    {"man_made": ["reservoir_covered"], "water": ["reservoir"]},
    "polygon",
    columns=[type_col, str_col("name")],
)
