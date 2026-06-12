import asyncio
import logging
import re
from itertools import chain
from typing import Optional

import httpx
from async_lru import alru_cache
from more_itertools import windowed
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection
from starlette.exceptions import HTTPException

VOLTAGE_SCALE = [0, 10, 25, 52, 132, 220, 330, 550]

logger = logging.getLogger(__name__)


async def get_countries(database: AsyncConnection):
    return await database.execute(
        text(
            """SELECT "union" FROM countries.country_eez
                 WHERE "union" != \'Antarctica\'
                    AND pol_type IN (\'Union EEZ and country\', \'Landlocked country\')
                 ORDER BY "union" ASC"""
        )
    )


async def get_plant(database: AsyncConnection, plant_id: int, country_gid: int):
    res = (
        await database.execute(
            text(
                """SELECT osm_id, ST_GeometryType(geometry) AS geom_type, name, tags->'name:en' AS name_en,
                    source,
                    convert_power(tags->'plant:output:electricity') AS output,
                    hstore_to_json(tags) AS tags
                FROM power_plant, countries.country_eez
                 WHERE gid = :country_gid
                 AND power_plant.osm_id = :plant_id
                 AND ST_Contains(country_eez.geom, ST_Transform(power_plant.geometry, 4326))"""
            ),
            {"plant_id": plant_id, "country_gid": country_gid},
        )
    ).fetchone()
    if res is None:
        return None

    return res._mapping


async def get_plant_generator_summary(database: AsyncConnection, plant_id):
    res = await database.execute(
        text(
            """SELECT g.source,
            convert_power(g.tags->'generator:output:electricity') AS output,
            sum(convert_power(g.tags->'generator:output:electricity')) AS total_output, count(*)
        FROM osm_power_generator g, osm_power_plant p
        WHERE p.osm_id = :plant_id and ST_Contains(p.geometry, g.geometry)
        GROUP BY g.source, convert_power(g.tags->'generator:output:electricity')"""
        ),
        {"plant_id": plant_id},
    )
    if not res and plant_id < 0:
        res = await database.execute(
            text(
                """SELECT tags->'generator:source' AS source,
                    convert_power(tags->'generator:output:electricity') AS output,
                    sum(convert_power(tags->'generator:output:electricity')) AS total_output, count(*)
                 FROM osm_power_plant_relation_member
                 WHERE osm_id = :plant_id
                     AND tags->'power' = 'generator'
                 GROUP BY source, convert_power(tags->'generator:output:electricity')
                """
            ),
            {"plant_id": plant_id},
        )
    return res.fetchall()


async def latest_stats_date(database: AsyncConnection):
    res = (await database.execute(text("SELECT max(time) FROM stats.power_line"))).fetchone()
    return res[0] if res else None


def coalesce_result(result, value):
    if result is None:
        return value

    res = result.result().fetchone()
    if res is None:
        return value
    return res[0] or value


async def stats_power_line(database: AsyncConnection, union=None, territory_iso3=None, date=None) -> dict:
    stats_date = date or await latest_stats_date(database)
    values = {"time": stats_date}
    country_clause = ""
    join_clause = ""

    if union:
        country_clause = " AND country = :country"
        values["country"] = union
    elif territory_iso3:
        join_clause = ", countries.country_eez AS eez"
        country_clause = """
            AND eez."union" = country
            AND eez.iso_sov1 = :iso3
            AND (eez.iso_ter1 IS NULL OR eez.iso_ter1 = eez.iso_sov1)
        """
        values["iso3"] = territory_iso3

    lines = {}

    async with asyncio.TaskGroup() as tg:
        for low, high in windowed(chain(VOLTAGE_SCALE, [None]), 2):
            low = (low or 0) * 1000
            query = f"""SELECT sum(length)
                FROM stats.power_line {join_clause}
                WHERE time = :time
                AND voltage >= :low
                {country_clause}
            """
            vals = values.copy()
            vals["low"] = low

            if high is not None:
                high = high * 1000
                query += " AND voltage < :high"
                vals["high"] = high

            res = tg.create_task(database.execute(text(query), vals))
            lines[(low, high)] = res

        unspecified = tg.create_task(
            database.execute(
                text(
                    f"""SELECT sum(length)
                FROM stats.power_line {join_clause}
                WHERE time = :time
                AND voltage IS NULL
                {country_clause}
            """
                ),
                values,
            )
        )

        total = tg.create_task(
            database.execute(
                text(
                    f"""SELECT sum(length)
                FROM stats.power_line {join_clause}
                WHERE time = :time
                {country_clause}
            """
                ),
                values,
            )
        )

    return {
        "lines": {(low, high): coalesce_result(res, 0) for (low, high), res in lines.items()},
        "total": coalesce_result(total, 0.01),
        "unspecified": coalesce_result(unspecified, 0),
    }


async def plant_stats(
    database: AsyncConnection,
    country_gid: Optional[int] = None,
    territory_iso3: Optional[str] = None,
    date=None,
):
    where_clause = ""
    values = {
        "time": date or await latest_stats_date(database),
    }

    if country_gid:
        where_clause = "eez.gid = :gid"
        values["gid"] = country_gid
    elif territory_iso3:
        where_clause = "eez.iso_sov1 = :iso3 AND (eez.iso_ter1 IS NULL OR eez.iso_ter1 = eez.iso_sov1)"
        values["iso3"] = territory_iso3

    result = (
        await database.execute(
            text(
                f"""SELECT sum(output * count) AS output, sum(count) AS count
                FROM stats.power_plant, countries.country_eez AS eez
                WHERE eez."union" = country
                AND {where_clause}
                AND time = :time
        """
            ),
            values,
        )
    ).fetchone()

    if not result:
        return {
            "output": 0,
            "count": 0,
        }

    return {
        "output": int(result[0] or 0),
        "count": result[1] or 0,
    }


async def plant_source_stats(database: AsyncConnection, country_gid=None, territory_iso3=None, date=None):
    where_clause = ""
    values = {
        "time": date or await latest_stats_date(database),
    }

    if country_gid:
        where_clause = "eez.gid = :gid"
        values["gid"] = country_gid
    elif territory_iso3:
        where_clause = "eez.iso_sov1 = :iso3 AND (eez.iso_ter1 IS NULL OR eez.iso_ter1 = eez.iso_sov1)"
        values["iso3"] = territory_iso3

    return await database.execute(
        text(
            f"""SELECT
                first_semi(source) AS source,
                sum(output * count) AS output,
                sum(count) AS count
            FROM stats.power_plant, countries.country_eez AS eez
            WHERE eez."union" = country
                AND {where_clause}
                AND time = :time
            GROUP BY first_semi(source)
            ORDER BY output DESC NULLS LAST
        """
        ),
        values,
    )


@alru_cache(maxsize=1000)
async def get_wikidata(wikidata_id: str, client: httpx.AsyncClient) -> Optional[dict]:
    wikidata_id = wikidata_id.upper()
    if not re.match(r"^Q[0-9]+$", wikidata_id):
        return None

    response = await client.get(
        f"https://www.wikidata.org/wiki/Special:EntityData/{wikidata_id}.json",
        follow_redirects=True,
    )

    if response.status_code == 404:
        return None
    elif response.status_code != 200:
        logger.error("Error while fetching wikidata: %s", response.text)
        raise HTTPException(503, "Error while fetching wikidata")
    data = response.json()

    # ID may have changed if it redirects to another. Fetch the first
    # (hopefully only) ID in the list.
    wikidata_id = list(data["entities"].keys())[0]
    return data["entities"][wikidata_id]


@alru_cache(maxsize=1000)
async def get_commons_thumbnail(filename: str, client: httpx.AsyncClient, width: int = 300) -> Optional[dict]:
    url = (
        "https://commons.wikimedia.org/w/api.php?"
        f"action=query&titles=Image:{filename}&prop=imageinfo"
        f"&iiprop=url&iiurlwidth={width}&format=json"
    )

    resp = await client.get(url, follow_redirects=True)
    if resp.status_code != 200:
        raise HTTPException(503, "Error while fetching wikimedia commons image")
    data = resp.json()
    images = [page for page in data["query"]["pages"].values() if "imageinfo" in page]
    if images:
        return images[0]
    else:
        return None
