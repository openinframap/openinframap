from databases import Database
from starlette.config import Config

config = Config(".env")

DATABASE_URL = config("DATABASE_URL")

database = Database(DATABASE_URL)

