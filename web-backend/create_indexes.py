"""
Programmatically create search indexes for tables. This has to be run manually and the
`ADMIN_DATABASE_URL` must be set to a connection with the privileges to create indexes.
"""

from search import SEARCH_LANGUAGES
from databases import Database
from config import config

MAIN_INDEXES = [
    """CREATE INDEX CONCURRENTLY IF NOT EXISTS osm_power_substation_name 
        ON osm_power_substation(substr(lower(tags->'name'), 1, 20) text_pattern_ops)
        WHERE tags->'name' IS NOT NULL""",
    """CREATE INDEX CONCURRENTLY IF NOT EXISTS power_substation_relation_name
        ON power_substation_relation(substr(lower(name), 1, 20) text_pattern_ops)
        WHERE name IS NOT NULL""",
    """CREATE INDEX CONCURRENTLY IF NOT EXISTS osm_power_plant_name
        ON osm_power_plant(substr(lower(tags->'name'), 1, 20) text_pattern_ops)
        WHERE tags->'name' IS NOT NULL""",
    """CREATE INDEX CONCURRENTLY IF NOT EXISTS power_plant_relation_name
        ON power_plant_relation(substr(lower(name), 1, 20) text_pattern_ops)
        WHERE name IS NOT NULL""",
]


async def create_indexes():
    database = Database(config("ADMIN_DATABASE_URL"))
    await database.connect()
    print("Creating main indexes...")
    for index in MAIN_INDEXES:
        print(index)
        await database.execute(index)

    for lang in SEARCH_LANGUAGES:
        print(f"Creating indexes for language: {lang}...", end="", flush=True)
        queries = [
            f"""CREATE INDEX CONCURRENTLY IF NOT EXISTS osm_power_substation_name_{lang} 
                ON osm_power_substation(substr(lower(tags->'name:{lang}'), 1, 20) text_pattern_ops)
                WHERE tags->'name:{lang}' IS NOT NULL""",
            f"""CREATE INDEX CONCURRENTLY IF NOT EXISTS power_substation_relation_name_{lang} 
                ON power_substation_relation(substr(lower(tags->'name:{lang}'), 1, 20) text_pattern_ops)
                WHERE tags->'name:{lang}' IS NOT NULL""",
            f"""CREATE INDEX CONCURRENTLY IF NOT EXISTS osm_power_plant_name_{lang} 
                ON osm_power_plant(substr(lower(tags->'name:{lang}'), 1, 20) text_pattern_ops)
                WHERE tags->'name:{lang}' IS NOT NULL""",
            f"""CREATE INDEX CONCURRENTLY IF NOT EXISTS power_plant_relation_name_{lang} 
                ON power_plant_relation(substr(lower(tags->'name:{lang}'), 1, 20) text_pattern_ops)
                WHERE tags->'name:{lang}' IS NOT NULL""",
        ]
        for query in queries:
            print(".", end="", flush=True)
            await database.execute(query)
        print("")
    print("Indexes created successfully.", flush=True)
    await database.disconnect()


if __name__ == "__main__":
    import asyncio

    loop = asyncio.new_event_loop()
    loop.run_until_complete(create_indexes())
    loop.close()
