from decimal import Decimal
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
        return ''
    elif val >= 50e6:
        return "{:.0f} MW".format(val / Decimal(1e6))
    elif val >= 1e6:
        return "{:.2f} MW".format(val / Decimal(1e6))
    else:
        return "{:.0f} kW".format(val / Decimal(1e3))


templates.env.filters["power"] = format_power


@app.route("/")
async def main(request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.route("/plants")
async def plants(request):

    countries = await database.fetch_all(
        query="""SELECT "union" FROM countries.country_eez
                 WHERE "union" != \'Antarctica\'
                    AND pol_type = \'Union EEZ and country\'
                 ORDER BY "union" ASC"""
    )

    return templates.TemplateResponse(
        "plants.html", {"request": request, "countries": countries}
    )


@app.route("/plants/{country}")
async def plants_country(request):
    country = request.path_params["country"]

    res = await database.fetch_one(
        query='SELECT gid, "union" FROM countries.country_eez WHERE "union" = :union',
        values={"union": country},
    )

    if not res:
        raise HTTPException(404)

    gid = res[0]

    plants = await database.fetch_all(
        query="""SELECT osm_id, name, convert_power(output) AS output, source
                  FROM power_plant
                  WHERE ST_Contains(
                        (SELECT ST_Transform(geom, 3857) FROM countries.country_eez WHERE gid = :gid),
                        geometry)
                  ORDER BY convert_power(output) DESC NULLS LAST, name ASC NULLS LAST """,
        values={"gid": gid},
    )

    return templates.TemplateResponse(
        "plants_country.html",
        {"request": request, "plants": plants, "country": country},
    )
