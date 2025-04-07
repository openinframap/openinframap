import asyncio
import json
import time
from typing import Optional
from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse

from main import app
from config import database
from util import cache_for

# Ensure languages in this list have an index in the database.
SEARCH_LANGUAGES = {"en"}


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
            ST_AsGeoJSON(ST_Transform(ST_Centroid(geometry), 4326)) AS geometry
        FROM substation
        WHERE (substr(lower(name), 1, 20) LIKE lower(:query))
            OR (substr(lower(tags->'name:{language}'), 1, 20) LIKE lower(:query))
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
            ST_AsGeoJSON(ST_Transform(ST_Centroid(geometry), 4326)) AS geometry
        FROM power_plant
        WHERE substr(lower(name), 1, 20) LIKE lower(:query)
            OR (substr(lower(tags->'name:{language}'), 1, 20) LIKE lower(:query))
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

    if not query:
        raise HTTPException(400, "No query provided")

    start = time.monotonic_ns()
    async with asyncio.TaskGroup() as tg:
        substations = tg.create_task(search_substations(query, language))
        plants = tg.create_task(search_plants(query, language))

    results = sorted(await substations + await plants, key=sort_key, reverse=True)
    end = time.monotonic_ns()

    response = {"time": (end - start) / 1e9, "results": results}
    return JSONResponse(response)
