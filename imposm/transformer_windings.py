import asyncio
from databases import Database
from sqlalchemy import text

# I do not have the database url or key, please change this value
DATABASE_URL = "YOUR_DATABASE_URL_HERE"
# ---------------------------

database = Database(DATABASE_URL)

async def find_transformer_windings():
    await database.connect()
    
    query = text("""
        SELECT 
            t.id AS transformer_id,
            t.name AS transformer_name,
            w.winding_number,
            w.rating
        FROM 
            transformers t
        JOIN 
            transformer_windings w ON t.id = w.transformer_id
        ORDER BY 
            t.id, w.winding_number
    """)
    
    rows = await database.fetch_all(query)
    
    for row in rows:
        print(f"Transformer ID: {row['transformer_id']}, "
              f"Name: {row['transformer_name']}, "
              f"Winding: {row['winding_number']}, "
              f"Rating: {row['rating']}")
    
    await database.disconnect()

if __name__ == "__main__":
    asyncio.run(find_transformer_windings())
