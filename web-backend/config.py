from databases import Database
from starlette.config import Config

config = Config(".env")

DATABASE_URL = config("DATABASE_URL")
DEBUG = config("DEBUG", cast=bool, default=False)

database = Database(DATABASE_URL)
