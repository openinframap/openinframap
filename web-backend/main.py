import asyncio
import contextlib
from typing import AsyncIterator, TypedDict
import httpx
from starlette.responses import PlainTextResponse, RedirectResponse
from starlette.applications import Starlette
from starlette.templating import Jinja2Templates
from starlette.routing import Mount, Route
from starlette.staticfiles import StaticFiles
from starlette.exceptions import HTTPException
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
import bokeh.resources
import json

from bokeh.embed import json_item

from template_functions import (
    format_power,
    osm_link,
    country_name,
    format_length,
    format_voltage,
    format_percent,
    format_external_url,
)
from config import database, config
from util import cache_for, country_required
from sitemap import sitemap
from data import (
    get_countries,
    stats_power_line,
    get_plant,
    get_plant_generator_summary,
    get_wikidata,
    get_commons_thumbnail,
)
import charts
import charts.country

DEBUG = config("DEBUG", cast=bool, default=False)
templates = Jinja2Templates(directory="templates")

templates.env.filters["power"] = format_power
templates.env.filters["distance"] = format_length
templates.env.filters["voltage"] = format_voltage
templates.env.filters["percent"] = format_percent
templates.env.filters["country_name"] = country_name
templates.env.globals["osm_link"] = osm_link
templates.env.filters["external_url"] = format_external_url
templates.env.globals["BOKEH_JS"] = bokeh.resources.INLINE


class State(TypedDict):
    http_client: httpx.AsyncClient


@contextlib.asynccontextmanager
async def lifespan(app: Starlette) -> AsyncIterator[State]:
    await database.connect()
    async with httpx.AsyncClient(
        headers={
            "User-Agent": "Open Infrastructure Map backend (https://openinframap.org)"
        }
    ) as client:
        yield {"http_client": client}
    await database.disconnect()


app = Starlette(
    debug=DEBUG,
    lifespan=lifespan,
    routes=[
        Mount("/static", app=StaticFiles(directory="static"), name="static"),
        Route("/sitemap.xml", sitemap),
    ],
    middleware=[
        Middleware(CORSMiddleware, allow_origin_regex="http://localhost.*"),
    ],
)


@app.route("/")
async def main(request):
    # Dummy response - this endpoint is served statically in production from the webpack build
    return PlainTextResponse("")


@app.route("/about")
@cache_for(3600)
async def about(request):
    return templates.TemplateResponse("about.html", {"request": request})


@app.route("/about/exports")
@cache_for(3600)
async def exports(request):
    return RedirectResponse("https://www.infrageomatics.com/products")


@app.route("/copyright")
@cache_for(3600)
async def copyright(request):
    return templates.TemplateResponse("copyright.html", {"request": request})


@app.route("/stats")
@cache_for(86400)
async def stats(request):
    async with asyncio.TaskGroup() as tg:
        power_lines = tg.create_task(stats_power_line())
        countries = tg.create_task(get_countries())
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "countries": countries.result(),
            "power_lines": power_lines.result(),
        },
    )


@app.route("/stats/charts")
@cache_for(86400)
async def stats_charts(request):
    async with asyncio.TaskGroup() as tg:
        lines_plot = tg.create_task(charts.line_length())
        plants_plot = tg.create_task(charts.plant_count())
        output_plot = tg.create_task(charts.plant_output())
        substation_plot = tg.create_task(charts.substation_count())

    return templates.TemplateResponse(
        "charts.html",
        {
            "request": request,
            "lines_plot": json.dumps(
                json_item(lines_plot.result(), "lines_plot", charts.theme)
            ),
            "plants_plot": json.dumps(
                json_item(plants_plot.result(), "plants_plot", charts.theme)
            ),
            "output_plot": json.dumps(
                json_item(output_plot.result(), "output_plot", charts.theme)
            ),
            "substation_plot": json.dumps(
                json_item(substation_plot.result(), "substations_plot", charts.theme)
            ),
        },
    )


@app.route("/stats/area/{country}")
@country_required
@cache_for(3600)
async def country(request, country):
    async with asyncio.TaskGroup() as tg:
        plant_stats = tg.create_task(
            database.fetch_one(
                query="""SELECT SUM(convert_power(output)) AS output, COUNT(*)
                        FROM power_plant, countries.country_eez_3857 AS eez
                        WHERE ST_Contains(eez.geom, geometry)
                            AND eez.gid = :gid
                            AND tags -> 'construction:power' IS NULL
                        """,
                values={"gid": country["gid"]},
            )
        )

        plant_source_stats = tg.create_task(
            database.fetch_all(
                query="""SELECT first_semi(source) AS source, sum(convert_power(output)) AS output, count(*)
                        FROM power_plant, countries.country_eez_3857 AS eez
                        WHERE ST_Contains(eez.geom, geometry)
                            AND eez.gid = :gid
                            AND tags -> 'construction:power' IS NULL
                        GROUP BY first_semi(source)
                        ORDER BY SUM(convert_power(output)) DESC NULLS LAST""",
                values={"gid": country["gid"]},
            )
        )

        power_lines = tg.create_task(stats_power_line(country["union"]))
        grid_summary_chart = tg.create_task(
            charts.country.grid_summary(country["union"])
        )
        plant_summary_chart = tg.create_task(
            charts.country.plant_summary(country["union"])
        )

    return templates.TemplateResponse(
        "country.html",
        {
            "request": request,
            "country": country["union"],
            "plant_stats": plant_stats.result()._mapping,
            "plant_source_stats": plant_source_stats.result(),
            "power_lines": power_lines.result(),
            "country_grid_summary": json.dumps(
                json_item(
                    grid_summary_chart.result(), "country-grid-summary", charts.theme
                )
            ),
            "plant_summary": json.dumps(
                json_item(plant_summary_chart.result(), "plant-summary", charts.theme)
            ),
            "canonical": request.url_for("country", country=country["union"]),
        },
    )


@app.route("/stats/area/{country}/plants")
@country_required
@cache_for(3600)
async def plants_country(request, country):
    gid = country[0]

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
            "country": country["union"],
            "source": source,
            "min_output": min_output,
            # Canonical URL for all plants without the source filter, to avoid confusing Google.
            "canonical": request.url_for("plants_country", country=country["union"]),
        },
    )


@app.route("/stats/area/{country}/plants/construction")
@country_required
@cache_for(3600)
async def plants_construction_country(request, country):
    gid = country[0]

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
            "country": country["union"],
        },
    )


@app.route("/stats/object/plant/{id}")
@cache_for(86400)
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

    return RedirectResponse(
        request.url_for("plant_detail", country=res["union"], id=id)
    )


@app.route("/stats/area/{country}/plants/{id}")
@country_required
@cache_for(3600)
async def plant_detail(request, country):
    try:
        plant_id = int(request.path_params["id"])
    except ValueError:
        raise HTTPException(404, "Invalid plant ID")

    http_client = request.state.http_client

    plant = await get_plant(plant_id, country["gid"])
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
            "country": country["union"],
            "wikidata": wd,
            "image_data": image_data,
            "ref_tags": ref_tags,
        },
    )


import wikidata  # noqa
import search  # noqa
