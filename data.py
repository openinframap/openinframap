from config import database
from itertools import chain
from more_itertools import windowed

VOLTAGE_SCALE = [0, 10, 25, 52, 132, 220, 330, 550]


async def get_countries():
    return await database.fetch_all(
        query="""SELECT "union" FROM countries.country_eez
                 WHERE "union" != \'Antarctica\'
                    AND pol_type IN (\'Union EEZ and country\', \'Landlocked country\')
                 ORDER BY "union" ASC"""
    )


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
