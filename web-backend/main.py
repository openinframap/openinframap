from starlette.responses import PlainTextResponse
from starlette.applications import Starlette
from starlette.templating import Jinja2Templates
from starlette.routing import Mount, Route
from starlette.staticfiles import StaticFiles
from starlette.exceptions import HTTPException

from template_functions import (
    format_power,
    osm_link,
    country_name,
    format_length,
    format_voltage,
    format_percent,
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


DEBUG = config("DEBUG", cast=bool, default=False)
templates = Jinja2Templates(directory="templates")

templates.env.filters["power"] = format_power
templates.env.filters["distance"] = format_length
templates.env.filters["voltage"] = format_voltage
templates.env.filters["percent"] = format_percent
templates.env.filters["country_name"] = country_name
templates.env.globals["osm_link"] = osm_link


app = Starlette(
    debug=DEBUG,
    on_startup=[database.connect],
    on_shutdown=[database.disconnect],
    routes=[
        Mount("/static", app=StaticFiles(directory="static"), name="static"),
        Route("/sitemap.xml", sitemap),
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
    return templates.TemplateResponse("exports.html", {"request": request})


@app.route("/copyright")
@cache_for(3600)
async def copyright(request):
    return templates.TemplateResponse("copyright.html", {"request": request})


@app.route("/stats")
@cache_for(86400)
async def stats(request):
    power_lines = await stats_power_line()
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "countries": await get_countries(),
            "power_lines": power_lines,
        },
    )


@app.route("/stats/area/{country}")
@country_required
@cache_for(3600)
async def country(request, country):
    plant_stats = await database.fetch_one(
        query="""SELECT SUM(convert_power(output)) AS output, COUNT(*)
                    FROM power_plant
                    WHERE ST_Contains(
                        (SELECT ST_Transform(geom, 3857) FROM countries.country_eez where gid = :gid),
                        geometry)
                    AND tags -> 'construction:power' IS NULL
                    """,
        values={"gid": country["gid"]},
    )

    plant_source_stats = await database.fetch_all(
        query="""SELECT first_semi(source) AS source, sum(convert_power(output)) AS output, count(*)
                    FROM power_plant
                    WHERE ST_Contains(
                            (SELECT ST_Transform(geom, 3857) FROM countries.country_eez WHERE gid = :gid),
                            geometry)
                    AND tags -> 'construction:power' IS NULL
                    GROUP BY first_semi(source)
                    ORDER BY SUM(convert_power(output)) DESC NULLS LAST""",
        values={"gid": country["gid"]},
    )

    power_lines = await stats_power_line(country["union"])

    return templates.TemplateResponse(
        "country.html",
        {
            "request": request,
            "country": country["union"],
            "plant_stats": plant_stats,
            "plant_source_stats": plant_source_stats,
            "power_lines": power_lines,
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


@app.route("/stats/area/{country}/plants/{id}")
@country_required
@cache_for(3600)
async def plant_detail(request, country):
    try:
        plant_id = int(request.path_params["id"])
    except ValueError:
        raise HTTPException(404, "Invalid plant ID")

    plant = await get_plant(plant_id, country["gid"])
    if plant is None:
        raise HTTPException(404, "Nonexistent power plant")

    generator_summary = await get_plant_generator_summary(plant_id)

    if "wikidata" in plant["tags"]:
        wd = await get_wikidata(plant["tags"]["wikidata"])
    else:
        wd = None

    image_data = None
    if (
        wd
        and "P18" in wd["claims"]
        and wd["claims"]["P18"][0]["mainsnak"]["datatype"] == "commonsMedia"
    ):
        image_data = await get_commons_thumbnail(
            wd["claims"]["P18"][0]["mainsnak"]["datavalue"]["value"], 400
        )

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
        },
    )


import wikidata  # noqa
