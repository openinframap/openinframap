from decimal import Decimal
from functools import wraps
from starlette.applications import Starlette
from starlette.exceptions import HTTPException
from starlette.templating import Jinja2Templates
from starlette.config import Config
from starlette.routing import Mount
from starlette.staticfiles import StaticFiles
from databases import Database

config = Config(".env")

DEBUG = config("DEBUG", cast=bool, default=False)
DATABASE_URL = config("DATABASE_URL")

database = Database(DATABASE_URL)

templates = Jinja2Templates(directory="templates")

app = Starlette(
    debug=DEBUG,
    on_startup=[database.connect],
    on_shutdown=[database.disconnect],
    routes=[Mount("/static", app=StaticFiles(directory="static"), name="static")],
)


def format_power(val):
    if val is None:
        return ""
    elif val >= 50e6:
        return "{:,.0f} MW".format(val / Decimal(1e6))
    elif val >= 1e6:
        return "{:.2f} MW".format(val / Decimal(1e6))
    else:
        return "{:.0f} kW".format(val / Decimal(1e3))


templates.env.filters["power"] = format_power


def osm_link(osm_id, geom_type):
    url = "https://www.openstreetmap.org/"
    if osm_id < 0:
        osm_id = -osm_id
        url += "relation"
    elif geom_type == "ST_Point":
        url += "node"
    else:
        url += "way"
    return url + "/" + str(osm_id)


templates.env.globals["osm_link"] = osm_link


def country_required(func):
    @wraps(func)
    async def wrap_country(request):
        country = request.path_params["country"]

        res = await database.fetch_one(
            query='SELECT gid, "union" FROM countries.country_eez WHERE "union" = :union',
            values={"union": country},
        )

        if not res:
            raise HTTPException(404)
        return await func(request, res)

    return wrap_country


@app.route("/")
async def main(request):
    countries = await database.fetch_all(
        query="""SELECT "union" FROM countries.country_eez
                 WHERE "union" != \'Antarctica\'
                    AND pol_type = \'Union EEZ and country\'
                 ORDER BY "union" ASC"""
    )

    return templates.TemplateResponse(
        "index.html", {"request": request, "countries": countries}
    )


@app.route("/area/{country}")
@country_required
async def country(request, country):
    plant_stats = await database.fetch_one(
        query="""SELECT SUM(convert_power(output)) AS output, COUNT(*)
                    FROM power_plant
                    WHERE ST_Contains(
                        (SELECT ST_Transform(geom, 3857) FROM countries.country_eez where gid = :gid),
                        geometry)
                    """,
        values={"gid": country["gid"]},
    )

    plant_source_stats = await database.fetch_all(
        query="""SELECT first_semi(source) AS source, sum(convert_power(output)) AS output, count(*)
                    FROM power_plant
                    WHERE ST_Contains(
                            (SELECT ST_Transform(geom, 3857) FROM countries.country_eez WHERE gid = :gid),
                            geometry)
                    GROUP BY first_semi(source)
                    ORDER BY SUM(convert_power(output)) DESC NULLS LAST""",
        values={"gid": country["gid"]},
    )

    return templates.TemplateResponse(
        "country.html",
        {
            "request": request,
            "country": country['union'],
            "plant_stats": plant_stats,
            "plant_source_stats": plant_source_stats,
        },
    )


@app.route("/area/{country}/plants")
@country_required
async def plants_country(request, country):
    gid = country[0]

    plants = await database.fetch_all(
        query="""SELECT osm_id, name, tags->'name:en' AS name_en, tags->'wikidata' AS wikidata,
                        convert_power(output) AS output,
                        source, ST_GeometryType(geometry) AS geom_type
                  FROM power_plant
                  WHERE ST_Contains(
                        (SELECT ST_Transform(geom, 3857) FROM countries.country_eez WHERE gid = :gid),
                        geometry)
                  ORDER BY convert_power(output) DESC NULLS LAST, name ASC NULLS LAST """,
        values={"gid": gid},
    )

    return templates.TemplateResponse(
        "plants_country.html",
        {"request": request, "plants": plants, "country": country["union"]},
    )
