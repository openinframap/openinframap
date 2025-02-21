import json
import logging
import re
import httpx
from async_lru import alru_cache
from starlette.exceptions import HTTPException
from config import database
from itertools import chain
from more_itertools import windowed

VOLTAGE_SCALE = [0, 10, 25, 52, 132, 220, 330, 550]

logger = logging.getLogger(__name__)


async def get_countries():
    return await database.fetch_all(
        query="""SELECT "union" FROM countries.country_eez
                 WHERE "union" != \'Antarctica\'
                    AND pol_type IN (\'Union EEZ and country\', \'Landlocked country\')
                 ORDER BY "union" ASC"""
    )


async def get_plant(plant_id, country_gid):
    res = await database.fetch_one(
        """SELECT osm_id, ST_GeometryType(geometry) AS geom_type, name, tags->'name:en' AS name_en, source,
                    convert_power(tags->'plant:output:electricity') AS output,
                    hstore_to_json(tags) AS tags
                FROM power_plant, countries.country_eez
                 WHERE gid = :country_gid
                 AND power_plant.osm_id = :plant_id
                 AND ST_Contains(country_eez.geom, ST_Transform(power_plant.geometry, 4326))""",
        {"plant_id": plant_id, "country_gid": country_gid},
    )
    if res is None:
        return None

    res = dict(res)
    res["tags"] = json.loads(res["tags"])
    return res


async def get_plant_generator_summary(plant_id):
    res = await database.fetch_all(
        """SELECT g.source,
            convert_power(g.tags->'generator:output:electricity') AS output,
            sum(convert_power(g.tags->'generator:output:electricity')) AS total_output, count(*)
        FROM osm_power_generator g, osm_power_plant p
        WHERE p.osm_id = :plant_id and ST_Contains(p.geometry, g.geometry)
        GROUP BY g.source, convert_power(g.tags->'generator:output:electricity')""",
        {"plant_id": plant_id},
    )
    if not res and plant_id < 0:
        res = await database.fetch_all(
            """SELECT tags->'generator:source' AS source,
                    convert_power(tags->'generator:output:electricity') AS output,
                    sum(convert_power(tags->'generator:output:electricity')) AS total_output, count(*)
                 FROM osm_power_plant_relation_member
                 WHERE osm_id = :plant_id
                     AND tags->'power' = 'generator'
                 GROUP BY source, convert_power(tags->'generator:output:electricity')
                """,
            {"plant_id": plant_id},
        )
    return res


async def stats_power_line(country=None):
    stats_date = (await database.fetch_one("SELECT max(time) FROM stats.power_line"))[0]
    values = {"time": stats_date}
    country_clause = ""

    if country:
        country_clause = " AND country = :country"
        values["country"] = country

    lines = {}
    for low, high in windowed(chain(VOLTAGE_SCALE, [None]), 2):
        low = low * 1000
        query = (
            "SELECT sum(length) FROM stats.power_line WHERE time = :time AND voltage >= :low"
            + country_clause
        )
        vals = values.copy()
        vals["low"] = low

        if high is not None:
            high = high * 1000
            query += " AND voltage < :high"
            vals["high"] = high

        res = await database.fetch_one(query, vals)
        lines[(low, high)] = res[0] or 0

    unspecified = await database.fetch_one(
        "SELECT sum(length) FROM stats.power_line WHERE time = :time AND voltage IS NULL"
        + country_clause,
        values,
    )

    total = await database.fetch_one(
        "SELECT sum(length) FROM stats.power_line WHERE time = :time" + country_clause,
        values,
    )

    data = {
        "date": stats_date.date(),
        "lines": lines,
        "total": total[0] or 0.01,
        "unspecified": unspecified[0] or 0,
    }
    return data


@alru_cache(maxsize=1000)
async def get_wikidata(wikidata_id):
    wikidata_id = wikidata_id.upper()
    if not re.match(r"^Q[0-9]+$", wikidata_id):
        return None

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://www.wikidata.org/entity/{wikidata_id}.json", follow_redirects=True
        )
        if resp.status_code != 200:
            logger.error("Error while fetching wikidata: %s", resp.text)
            raise HTTPException(503, "Error while fetching wikidata")
        data = resp.json()

        # ID may have changed if it redirects to another. Fetch the first
        # (hopefully only) ID in the list.
        wikidata_id = list(data["entities"].keys())[0]
        return data["entities"][wikidata_id]


@alru_cache(maxsize=1000)
async def get_commons_thumbnail(filename, width=300):
    url = (
        "https://commons.wikimedia.org/w/api.php?"
        f"action=query&titles=Image:{filename}&prop=imageinfo"
        f"&iiprop=url&iiurlwidth={width}&format=json"
    )
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, follow_redirects=True)
        if resp.status_code != 200:
            raise HTTPException(503, "Error while fetching wikimedia commons image")
        data = resp.json()
        return list(data["query"]["pages"].values())[0]
