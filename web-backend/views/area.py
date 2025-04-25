import asyncio
import json
from starlette.exceptions import HTTPException
from starlette.responses import RedirectResponse

from bokeh.embed import json_item

from main import app, database, templates
from util import cache_for, region_required
from data import (
    stats_power_line,
    get_plant,
    get_plant_generator_summary,
    get_wikidata,
    get_commons_thumbnail,
    plant_source_stats,
    plant_stats,
    latest_stats_date,
)
import charts.country


@app.route("/stats/area/{region}")
@region_required
@cache_for(hours=1)
async def region(request, region):
    stats_date = await latest_stats_date()
    async with asyncio.TaskGroup() as tg:
        plants = tg.create_task(plant_stats(region["gid"], date=stats_date))
        sources = tg.create_task(plant_source_stats(region["gid"], date=stats_date))
        power_lines = tg.create_task(stats_power_line(region["union"], date=stats_date))
        grid_summary_chart = tg.create_task(
            charts.country.grid_summary(region["union"])
        )
        plant_summary_chart = tg.create_task(
            charts.country.plant_summary(region["union"])
        )

    return templates.TemplateResponse(
        "area.html",
        {
            "request": request,
            "country": region["union"],
            "stats_date": stats_date,
            "plant_stats": plants.result(),
            "plant_source_stats": sources.result(),
            "power_lines": power_lines.result(),
            "country_grid_summary": json.dumps(
                json_item(
                    grid_summary_chart.result(), "country-grid-summary", charts.theme
                )
            ),
            "plant_summary": json.dumps(
                json_item(plant_summary_chart.result(), "plant-summary", charts.theme)
            ),
            "canonical": request.url_for("region", region=region["union"]),
        },
    )


@app.route("/stats/area/{region}/plants")
@region_required
@cache_for(hours=1)
async def plants_region(request, region):
    gid = region[0]

    plants = await database.fetch_all(
        query="""SELECT osm_id, name, tags->'name:en' AS name_en, tags->'wikidata' AS wikidata,
                        tags->'plant:method' AS method, tags->'operator' AS operator,
                        convert_power(output) AS output,
                        source, ST_GeometryType(geometry) AS geom_type
                  FROM power_plant
                  WHERE ST_Contains(
                        (SELECT ST_Transform(geom, 3857) FROM countries.country_eez WHERE gid = :gid),
                        geometry)
                  AND tags -> 'construction:power' IS NULL
                  ORDER BY convert_power(output) DESC NULLS LAST, name ASC NULLS LAST """,
        values={"gid": gid},
    )

    source = None
    if "source" in request.query_params:
        source = request.query_params["source"].lower()
        plants = [
            plant for plant in plants if source in plant["source"].lower().split(";")
        ]

    min_output = None
    if "min_output" in request.query_params:
        try:
            min_output = int(request.query_params["min_output"])
            plants = [
                plant
                for plant in plants
                if plant["output"] and plant["output"] >= min_output
            ]
        except ValueError:
            pass

    return templates.TemplateResponse(
        "plants_country.html",
        {
            "request": request,
            "plants": plants,
            "country": region["union"],
            "source": source,
            "min_output": min_output,
            # Canonical URL for all plants without the source filter, to avoid confusing Google.
            "canonical": request.url_for("plants_region", region=region["union"]),
        },
    )


@app.route("/stats/area/{region}/plants/construction")
@region_required
@cache_for(hours=1)
async def plants_construction_region(request, region):
    gid = region[0]

    plants = await database.fetch_all(
        query="""SELECT osm_id, name, tags->'name:en' AS name_en, tags->'wikidata' AS wikidata,
                        tags->'plant:method' AS method, tags->'operator' AS operator,
                        tags->'start_date' AS start_date,
                        convert_power(output) AS output,
                        source, ST_GeometryType(geometry) AS geom_type
                  FROM power_plant
                  WHERE ST_Contains(
                        (SELECT ST_Transform(geom, 3857) FROM countries.country_eez WHERE gid = :gid),
                        geometry)
                  AND tags -> 'construction:power' IS NOT NULL
                  ORDER BY convert_power(output) DESC NULLS LAST, name ASC NULLS LAST """,
        values={"gid": gid},
    )

    return templates.TemplateResponse(
        "plants_country.html",
        {
            "construction": True,
            "request": request,
            "plants": plants,
            "country": region["union"],
        },
    )


@app.route("/stats/object/plant/{id}")
@cache_for(hours=1)
async def stats_object(request):
    try:
        id = int(request.path_params["id"])
    except ValueError:
        raise HTTPException(400)

    res = await database.fetch_one(
        """SELECT country_eez."union" FROM power_plant, countries.country_eez WHERE
                ST_Contains(ST_Transform(country_eez.geom, 3857), geometry)
                AND country_eez."union" != 'Antarctica'
                AND power_plant.osm_id = :id""",
        values={"id": id},
    )

    if not res:
        raise HTTPException(404)

    return RedirectResponse(request.url_for("plant_detail", region=res["union"], id=id))


@app.route("/stats/area/{region}/plants/{id}")
@region_required
@cache_for(hours=1)
async def plant_detail(request, region):
    try:
        plant_id = int(request.path_params["id"])
    except ValueError:
        raise HTTPException(404, "Invalid plant ID")

    http_client = request.state.http_client

    plant = await get_plant(plant_id, region["gid"])
    if plant is None:
        raise HTTPException(404, "Nonexistent power plant")

    generator_summary = await get_plant_generator_summary(plant_id)

    if "wikidata" in plant["tags"]:
        wd = await get_wikidata(plant["tags"]["wikidata"], http_client)
    else:
        wd = None

    image_data = None
    if (
        wd
        and "P18" in wd["claims"]
        and wd["claims"]["P18"][0]["mainsnak"]["datatype"] == "commonsMedia"
    ):
        image_data = await get_commons_thumbnail(
            wd["claims"]["P18"][0]["mainsnak"]["datavalue"]["value"], http_client, 400
        )

    ref_tags = []
    for k, v in plant["tags"].items():
        if k.startswith("ref:") or k in ["repd:id"]:
            for split_val in v.split(";"):
                ref_tags.append((k, split_val))

    return templates.TemplateResponse(
        "plant_detail.html",
        {
            "construction": True,
            "plant": plant,
            "request": request,
            "generator_summary": generator_summary,
            "country": region["union"],
            "wikidata": wd,
            "image_data": image_data,
            "ref_tags": ref_tags,
        },
    )
