import asyncio
import json
import time
from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse

from main import app
from config import database


async def search_substations(query: str) -> list[dict]:
    results = await database.fetch_all(
        """
        SELECT
            osm_id,
            name,
            tags->'operator' AS operator,
            convert_voltage(voltage) AS voltage,
            ST_AsGeoJSON(ST_Transform(ST_Centroid(geometry), 4326)) AS geometry
        FROM substation
        WHERE substr(lower(name), 1, 20) LIKE lower(:query)
        ORDER BY convert_voltage(voltage) DESC NULLS LAST, name ASC NULLS LAST
        LIMIT 10
        """,
        {"query": f"{query}%"},
    )
    return [
        {
            "type": "substation",
            "id": row["osm_id"],
            "name": row["name"],
            "operator": row["operator"],
            "voltage": int(row["voltage"]) if row["voltage"] else None,
            "geometry": json.loads(row["geometry"]),
        }
        for row in results
    ]


async def search_plants(query: str) -> list[dict]:
    result = await database.fetch_all(
        """
        SELECT
            osm_id,
            name,
            convert_power(output) as output,
            source,
            tags -> 'operator' AS operator,
            ST_AsGeoJSON(ST_Transform(ST_Centroid(geometry), 4326)) AS geometry
        FROM power_plant
            WHERE substr(lower(name), 1, 20) LIKE lower(:query)
        ORDER BY output DESC NULLS LAST, name ASC NULLS LAST
        LIMIT 10
    """,
        {"query": f"{query}%"},
    )
    return [
        {
            "type": "plant",
            "id": row["osm_id"],
            "name": row["name"],
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
async def search(request):
    query = request.query_params.get("q")
    if not query:
        raise HTTPException(400, "No query provided")

    start = time.monotonic_ns()
    async with asyncio.TaskGroup() as tg:
        substations = tg.create_task(search_substations(query))
        plants = tg.create_task(search_plants(query))

    results = sorted(await substations + await plants, key=sort_key, reverse=True)
    end = time.monotonic_ns()

    response = {"time": (end - start) / 1e9, "results": results}
    return JSONResponse(response)
