from config import database


async def get_countries():
    return await database.fetch_all(
        query="""SELECT "union" FROM countries.country_eez
                 WHERE "union" != \'Antarctica\'
                    AND pol_type IN (\'Union EEZ and country\', \'Landlocked country\')
                 ORDER BY "union" ASC"""
    )
