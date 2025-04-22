import asyncio
import json
import time
import pycountry
from typing import Optional
from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse

from main import app
from config import database
from util import cache_for

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


async def search_substations(
    query: str, language: str, limit: Optional[int] = 10
) -> list[dict]:
    results = await database.fetch_all(
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
        """,
        {"query": f"{query}%", "limit": limit},
    )
    return [
        {
            "type": "substation",
            "id": row["osm_id"],
            "name": row["loc_name"] or row["name"],
            "local_name": row["name"],
            "operator": row["operator"],
            "voltage": int(row["voltage"]) if row["voltage"] else None,
            "country": pycountry.countries.get(alpha_3=row["country"]).alpha_2,
            "geometry": json.loads(row["geometry"]),
        }
        for row in results
    ]


async def search_plants(
    query: str, language: str, limit: Optional[int] = 10
) -> list[dict]:
    result = await database.fetch_all(
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
    """,
        {"query": f"{query}%", "limit": limit},
    )
    return [
        {
            "type": "plant",
            "id": row["osm_id"],
            "name": row["loc_name"] or row["name"],
            "local_name": row["name"],
            "output": int(row["output"]) if row["output"] else None,
            "source": row["source"],
            "operator": row["operator"],
            "country": pycountry.countries.get(alpha_3=row["country"]).alpha_2,
            "geometry": json.loads(row["geometry"]),
        }
        for row in result
    ]


def sort_key(row: dict) -> int:
    if row["type"] == "substation" and row["voltage"]:
        return row["voltage"] // 1000

    if row["type"] == "plant" and row["output"]:
        return row["output"] // 1000000

    return 0


@app.route("/search/typeahead")
@cache_for(86400)
async def search(request):
    query = request.query_params.get("q")
    language = request.query_params.get("lang", "en")
    if language not in SEARCH_LANGUAGES:
        language = "en"

    limit = request.query_params.get("limit", "10")
    try:
        limit = min(int(limit), 100)
    except ValueError:
        raise HTTPException(400, "Invalid limit")

    if not query:
        raise HTTPException(400, "No query provided")

    start = time.monotonic_ns()
    async with asyncio.TaskGroup() as tg:
        substations = tg.create_task(search_substations(query, language, limit))
        plants = tg.create_task(search_plants(query, language, limit))

    results = sorted(await substations + await plants, key=sort_key, reverse=True)
    end = time.monotonic_ns()

    results = results[:limit]

    response = {"time": (end - start) / 1e9, "results": results}
    return JSONResponse(response)
