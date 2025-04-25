import asyncio
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from starlette.exceptions import HTTPException
from starlette.responses import RedirectResponse

from main import app, database, templates
from util import cache_for
from data import stats_power_line, plant_source_stats, plant_stats, latest_stats_date
import pycountry


def json_area_stats(lines: dict, plants, sources) -> dict:
    return {
        "lines": [
            {"min_voltage": k[0], "max_voltage": k[1], "length": v}
            for k, v in lines["lines"].items()
        ]
        + [{"min_voltage": None, "max_voltage": None, "length": lines["unspecified"]}],
        "plant_stats": plants,
        # "plant_source_stats": sources,
    }


@app.route("/stats/country/{iso2}.json")
@cache_for(hours=1)
async def country_json(request: Request) -> Response:
    iso2 = request.path_params["iso2"]
    if iso2.upper() != iso2:
        return RedirectResponse(
            request.url.replace(path=f"/stats/country/{iso2.upper()}.json")
        )

    country = pycountry.countries.get(alpha_2=iso2)
    if not country:
        raise HTTPException(404, detail="Country not found")

    stats_date = await latest_stats_date()
    async with asyncio.TaskGroup() as tg:
        lines = tg.create_task(
            stats_power_line(territory_iso3=country.alpha_3, date=stats_date)
        )
        plants = tg.create_task(
            plant_stats(territory_iso3=country.alpha_3, date=stats_date)
        )
        sources = tg.create_task(
            plant_source_stats(territory_iso3=country.alpha_3, date=stats_date)
        )

    return JSONResponse(
        json_area_stats(lines.result(), plants.result(), sources.result())
    )


@app.route("/stats/country/{iso2}")
@cache_for(hours=1)
async def country(request: Request) -> Response:
    iso2 = request.path_params["iso2"]
    if iso2.upper() != iso2:
        return RedirectResponse(
            request.url.replace(path=f"/stats/country/{iso2.upper()}")
        )

    country = pycountry.countries.get(alpha_2=iso2)
    if not country:
        raise HTTPException(404, detail="Country not found")

    stats_date = await latest_stats_date()
    async with asyncio.TaskGroup() as tg:
        country_parts = tg.create_task(
            database.fetch_all(
                """SELECT gid, "union" FROM countries.country_eez WHERE iso_sov1 = :iso3
                AND (iso_ter1 IS NULL OR iso_ter1 = iso_sov1)
                AND pol_type != 'Joint regime (EEZ)'
            """,
                values={"iso3": country.alpha_3},
            )
        )

        lines = tg.create_task(
            stats_power_line(territory_iso3=country.alpha_3, date=stats_date)
        )
        plants = tg.create_task(
            plant_stats(territory_iso3=country.alpha_3, date=stats_date)
        )
        sources = tg.create_task(
            plant_source_stats(territory_iso3=country.alpha_3, date=stats_date)
        )

    return templates.TemplateResponse(
        "country.html",
        {
            "stats_date": stats_date,
            "request": request,
            "country": country,
            "country_parts": country_parts.result(),
            "lines": lines.result(),
            "plant_stats": plants.result(),
            "plant_source_stats": sources.result(),
        },
    )
