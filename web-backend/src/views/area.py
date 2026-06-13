import asyncio
import json
from typing import cast

from bokeh.core.types import ID
from bokeh.embed import json_item
from sqlalchemy import text
from starlette.exceptions import HTTPException
from starlette.responses import RedirectResponse, Response
from starlette.routing import Route

from .. import Request, charts, get_db
from ..data import (
    get_commons_thumbnail,
    get_plant,
    get_plant_generator_summary,
    get_wikidata,
    latest_stats_date,
    plant_source_stats,
    plant_stats,
    stats_power_line,
)
from ..templates import render_template
from ..util import cache_for, region_required


@region_required
@cache_for(hours=1)
async def region(request: Request, region):
    database = get_db(request)
    stats_date = await latest_stats_date(database)
    async with asyncio.TaskGroup() as tg:
        plants = tg.create_task(plant_stats(database, region["gid"], date=stats_date))
        sources = tg.create_task(plant_source_stats(database, region["gid"], date=stats_date))
        power_lines = tg.create_task(stats_power_line(database, region["union"], date=stats_date))
        grid_summary_chart = tg.create_task(charts.country.grid_summary(database, region["union"]))
        plant_summary_chart = tg.create_task(charts.country.plant_summary(database, region["union"]))

    return render_template(
        request,
        "area.html",
        {
            "request": request,
            "country": region["union"],
            "stats_date": stats_date,
            "plant_stats": plants.result(),
            "plant_source_stats": sources.result(),
            "power_lines": power_lines.result(),
            "country_grid_summary": json.dumps(
                json_item(grid_summary_chart.result(), cast(ID, "country-grid-summary"), charts.theme)
            ),
            "plant_summary": json.dumps(
                json_item(plant_summary_chart.result(), cast(ID, "plant-summary"), charts.theme)
            ),
            "canonical": request.url_for("region", region=region["union"]),
        },
    )


@region_required
@cache_for(hours=1)
async def plants_region(request: Request, region):
    database = get_db(request)
    gid = region["gid"]

    plants = (
        await database.execute(
            text(
                """SELECT osm_id, name, tags->'name:en' AS name_en, tags->'wikidata' AS wikidata,
                        tags->'plant:method' AS method, tags->'operator' AS operator,
                        convert_power(output) AS output,
                        source, ST_GeometryType(geometry) AS geom_type
                  FROM power_plant
                  WHERE ST_Contains(
                        (SELECT ST_Transform(geom, 3857) FROM countries.country_eez WHERE gid = :gid),
                        geometry)
                  AND tags -> 'construction:power' IS NULL
                  ORDER BY convert_power(output) DESC NULLS LAST, name ASC NULLS LAST """
            ),
            {"gid": gid},
        )
    ).fetchall()

    source = None
    if "source" in request.query_params:
        source = request.query_params["source"].lower()
        plants = [plant for plant in plants if source in plant._mapping["source"].lower().split(";")]

    min_output = None
    if "min_output" in request.query_params:
        try:
            min_output = int(request.query_params["min_output"])
            plants = [
                plant
                for plant in plants
                if plant._mapping["output"] and plant._mapping["output"] >= min_output
            ]
        except ValueError:
            pass

    return render_template(
        request,
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


@region_required
@cache_for(hours=1)
async def plants_construction_region(request: Request, region) -> Response:
    database = get_db(request)
    gid = region["gid"]

    plants = await database.execute(
        text(
            """SELECT osm_id, name, tags->'name:en' AS name_en, tags->'wikidata' AS wikidata,
                        tags->'plant:method' AS method, tags->'operator' AS operator,
                        tags->'start_date' AS start_date,
                        convert_power(output) AS output,
                        source, ST_GeometryType(geometry) AS geom_type
                  FROM power_plant
                  WHERE ST_Contains(
                        (SELECT ST_Transform(geom, 3857) FROM countries.country_eez WHERE gid = :gid),
                        geometry)
                  AND tags -> 'construction:power' IS NOT NULL
                  ORDER BY convert_power(output) DESC NULLS LAST, name ASC NULLS LAST """
        ),
        {"gid": gid},
    )

    return render_template(
        request,
        "plants_country.html",
        {
            "construction": True,
            "request": request,
            "plants": plants,
            "country": region["union"],
        },
    )


@cache_for(hours=1)
async def stats_object(request: Request) -> Response:
    database = get_db(request)
    try:
        id = int(request.path_params["id"])
    except ValueError:
        raise HTTPException(400)

    res = (
        await database.execute(
            text(
                """SELECT country_eez."union" FROM power_plant, countries.country_eez WHERE
                ST_Contains(ST_Transform(country_eez.geom, 3857), geometry)
                AND country_eez."union" != 'Antarctica'
                AND power_plant.osm_id = :id"""
            ),
            {"id": id},
        )
    ).fetchone()

    if not res:
        raise HTTPException(404)

    return RedirectResponse(request.url_for("plant_detail", region=res._mapping["union"], id=id))


@region_required
@cache_for(hours=1)
async def plant_detail(request: Request, region) -> Response:
    database = get_db(request)
    try:
        plant_id = int(request.path_params["id"])
    except ValueError:
        raise HTTPException(404, "Invalid plant ID")

    http_client = request.state["http_client"]

    plant = await get_plant(database, plant_id, region["gid"])
    if plant is None:
        raise HTTPException(404, "Nonexistent power plant")

    generator_summary = await get_plant_generator_summary(database, plant_id)

    if "wikidata" in plant["tags"]:
        wd = await get_wikidata(plant["tags"]["wikidata"], http_client)
    else:
        wd = None

    image_data = None
    if wd and "P18" in wd["claims"] and wd["claims"]["P18"][0]["mainsnak"]["datatype"] == "commonsMedia":
        image_data = await get_commons_thumbnail(
            wd["claims"]["P18"][0]["mainsnak"]["datavalue"]["value"], http_client, 400
        )

    ref_tags = []
    for k, v in plant["tags"].items():
        if k.startswith("ref:") or k in ["repd:id"]:
            for split_val in v.split(";"):
                ref_tags.append((k, split_val))

    return render_template(
        request,
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


routes = [
    Route("/stats/area/{region}", endpoint=region),
    Route("/stats/area/{region}/plants", endpoint=plants_region),
    Route("/stats/area/{region}/plants/construction", endpoint=plants_construction_region),
    Route("/stats/object/plant/{id}", endpoint=stats_object),
    Route("/stats/area/{region}/plants/{id}", endpoint=plant_detail),
]
