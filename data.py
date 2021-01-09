from config import database


async def get_countries():
    return await database.fetch_all(
        query="""SELECT "union" FROM countries.country_eez
                 WHERE "union" != \'Antarctica\'
                    AND pol_type = \'Union EEZ and country\'
                 ORDER BY "union" ASC"""
    )
