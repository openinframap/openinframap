import asyncio

import pycountry
from sqlalchemy import text
from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse, RedirectResponse, Response
from starlette.routing import Route

from .. import Request, get_db
from ..data import latest_stats_date, plant_source_stats, plant_stats, stats_power_line
from ..templates import render_template
from ..util import cache_for


def json_area_stats(lines: dict, plants, sources) -> dict:
    return {
        "lines": [{"min_voltage": k[0], "max_voltage": k[1], "length": v} for k, v in lines["lines"].items()]
        + [{"min_voltage": None, "max_voltage": None, "length": lines["unspecified"]}],
        "plant_stats": plants,
        # "plant_source_stats": sources,
    }


@cache_for(hours=1)
async def country_json(request: Request) -> Response:
    database = get_db(request)
    iso2 = request.path_params["iso2"]
    if iso2.upper() != iso2:
        return RedirectResponse(request.url.replace(path=f"/stats/country/{iso2.upper()}.json"))

    country = pycountry.countries.get(alpha_2=iso2)
    if not country:
        raise HTTPException(404, detail="Country not found")

    stats_date = await latest_stats_date(database)
    async with asyncio.TaskGroup() as tg:
        lines = tg.create_task(stats_power_line(database, territory_iso3=country.alpha_3, date=stats_date))
        plants = tg.create_task(plant_stats(database, territory_iso3=country.alpha_3, date=stats_date))
        sources = tg.create_task(
            plant_source_stats(database, territory_iso3=country.alpha_3, date=stats_date)
        )

    return JSONResponse(json_area_stats(lines.result(), plants.result(), sources.result()))


@cache_for(hours=1)
async def country(request: Request) -> Response:
    database = get_db(request)
    iso2 = request.path_params["iso2"]
    if iso2.upper() != iso2:
        return RedirectResponse(request.url.replace(path=f"/stats/country/{iso2.upper()}"))

    country = pycountry.countries.get(alpha_2=iso2)
    if not country:
        raise HTTPException(404, detail="Country not found")

    stats_date = await latest_stats_date(database)
    async with asyncio.TaskGroup() as tg:
        country_parts = tg.create_task(
            database.execute(
                text(
                    """SELECT gid, "union" FROM countries.country_eez WHERE iso_sov1 = :iso3
                AND (iso_ter1 IS NULL OR iso_ter1 = iso_sov1)
                AND pol_type != 'Joint regime (EEZ)'
            """
                ),
                {"iso3": country.alpha_3},
            )
        )

        lines = tg.create_task(stats_power_line(database, territory_iso3=country.alpha_3, date=stats_date))
        plants = tg.create_task(plant_stats(database, territory_iso3=country.alpha_3, date=stats_date))
        sources = tg.create_task(
            plant_source_stats(database, territory_iso3=country.alpha_3, date=stats_date)
        )

    return render_template(
        request,
        "country.html",
        {
            "stats_date": stats_date,
            "request": request,
            "country": country,
            "country_parts": country_parts.result().fetchall(),
            "lines": lines.result(),
            "plant_stats": plants.result(),
            "plant_source_stats": sources.result(),
        },
    )


routes = [
    Route("/stats/country/{iso2}.json", endpoint=country_json),
    Route("/stats/country/{iso2}", endpoint=country),
]
