import contextlib
from typing import AsyncGenerator

import httpx
from sqlalchemy.ext.asyncio import create_async_engine
from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from starlette.routing import Mount, Route
from starlette.staticfiles import StaticFiles

from . import State
from .config import DATABASE_URL, DEBUG
from .sitemap import sitemap
from .views import routes

db_engine = create_async_engine(DATABASE_URL)


@contextlib.asynccontextmanager
async def lifespan(app: Starlette) -> AsyncGenerator[State]:
    async with (
        httpx.AsyncClient(
            headers={"User-Agent": "Open Infrastructure Map backend (https://openinframap.org)"}
        ) as client,
        db_engine.begin() as db,
    ):
        yield {"http_client": client, "db": db}
        if db.in_transaction():
            await db.rollback()


app = Starlette(
    debug=DEBUG,
    lifespan=lifespan,
    routes=[
        Mount("/static", app=StaticFiles(directory="src/static"), name="static"),
        Route("/sitemap.xml", sitemap),
    ]
    + routes,
    middleware=[
        Middleware(CORSMiddleware, allow_origin_regex="http://localhost.*"),
    ],
)
