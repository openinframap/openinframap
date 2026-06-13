import asyncio
import json
import time
from typing import Optional

import pycountry
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection
from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse, Response
from starlette.routing import Route

from .. import Request, get_db
from ..util import cache_for

# Ensure the `create_indexes` script is run after changing this list.
SEARCH_LANGUAGES = {
    "en",
    "es",
    "el",
    "de",
    "fr",
    "hi",
    "ur",
    "zh",
    "ru",
    "pt",
    "ja",
    "it",
    "nl",
}


def country_alpha_2(alpha_3: str) -> str | None:
    country = pycountry.countries.get(alpha_3=alpha_3)
    if not country:
        return None
    return country.alpha_2


async def search_substations(
    database: AsyncConnection, query: str, language: str, limit: Optional[int] = 10
) -> list[dict]:
    results = await database.execute(
        text(
            f"""
        SELECT
            osm_id,
            name,
            tags->'name:{language}' AS loc_name,
            tags->'operator' AS operator,
            convert_voltage(voltage) AS voltage,
            country.iso_sov1 AS country,
            ST_AsGeoJSON(ST_Transform(ST_Centroid(geometry), 4326)) AS geometry
        FROM substation, countries.country_eez_sub AS country
        WHERE (
                (substr(lower(name), 1, 20) LIKE lower(:query))
                OR (substr(lower(tags->'name:{language}'), 1, 20) LIKE lower(:query))
              )
            AND ST_Intersects(substation.geometry, country.geom)
        ORDER BY convert_voltage(voltage) DESC NULLS LAST, name ASC NULLS LAST
        LIMIT :limit
        """
        ),
        {"query": f"{query}%", "limit": limit},
    )
    return [
        {
            "type": "substation",
            "id": row._mapping["osm_id"],
            "name": row._mapping["loc_name"] or row._mapping["name"],
            "local_name": row._mapping["name"],
            "operator": row._mapping["operator"],
            "voltage": int(row._mapping["voltage"]) if row._mapping["voltage"] else None,
            "country": country_alpha_2(row._mapping["country"]),
            "geometry": json.loads(row._mapping["geometry"]),
        }
        for row in results
    ]


async def search_plants(
    database: AsyncConnection, query: str, language: str, limit: Optional[int] = 10
) -> list[dict]:
    result = await database.execute(
        text(
            f"""
        SELECT
            osm_id,
            name,
            tags->'name:{language}' AS loc_name,
            convert_power(output) as output,
            source,
            tags -> 'operator' AS operator,
            country.iso_sov1 AS country,
            ST_AsGeoJSON(ST_Transform(ST_Centroid(geometry), 4326)) AS geometry
        FROM power_plant, countries.country_eez_sub AS country
        WHERE (substr(lower(name), 1, 20) LIKE lower(:query)
                OR (substr(lower(tags->'name:{language}'), 1, 20) LIKE lower(:query))
              )
            AND ST_Intersects(power_plant.geometry, country.geom)
        ORDER BY output DESC NULLS LAST, name ASC NULLS LAST
        LIMIT :limit
    """
        ),
        {"query": f"{query}%", "limit": limit},
    )
    return [
        {
            "type": "plant",
            "id": row._mapping["osm_id"],
            "name": row._mapping["loc_name"] or row._mapping["name"],
            "local_name": row._mapping["name"],
            "output": int(row._mapping["output"]) if row._mapping["output"] else None,
            "source": row._mapping["source"],
            "operator": row._mapping["operator"],
            "country": country_alpha_2(row._mapping["country"]),
            "geometry": json.loads(row._mapping["geometry"]),
        }
        for row in result
    ]


def sort_key(row: dict) -> int:
    if row["type"] == "substation" and row["voltage"]:
        return row["voltage"] // 1000

    if row["type"] == "plant" and row["output"]:
        return row["output"] // 1000000

    return 0


@cache_for(86400)
async def search(request: Request) -> Response:
    database = get_db(request)
    query = request.query_params.get("q")
    language = request.query_params.get("lang", "en")
    if language not in SEARCH_LANGUAGES:
        language = "en"

    limit_str = request.query_params.get("limit", "10")
    try:
        limit = min(int(limit_str), 100)
    except ValueError:
        raise HTTPException(400, "Invalid limit")

    if not query:
        raise HTTPException(400, "No query provided")

    start = time.monotonic_ns()
    async with asyncio.TaskGroup() as tg:
        substations = tg.create_task(search_substations(database, query, language, limit))
        plants = tg.create_task(search_plants(database, query, language, limit))

    results = sorted(await substations + await plants, key=sort_key, reverse=True)
    end = time.monotonic_ns()

    results = results[:limit]

    response = {"time": (end - start) / 1e9, "results": results}
    return JSONResponse(response)


routes = [Route("/search/typeahead", endpoint=search)]
