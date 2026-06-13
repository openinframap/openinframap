import contextlib
from typing import AsyncGenerator, cast

import httpx
from asgiref.typing import (
    ASGI3Application,
    ASGIReceiveCallable,
    ASGISendCallable,
    Scope,
)
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from starlette.routing import Mount, Route
from starlette.staticfiles import StaticFiles

from . import State
from .config import DATABASE_URL, DEBUG
from .sitemap import sitemap
from .views import routes


@contextlib.asynccontextmanager
async def lifespan(app: Starlette) -> AsyncGenerator[State]:
    db_engine = create_async_engine(DATABASE_URL)
    async with (
        httpx.AsyncClient(
            headers={"User-Agent": "Open Infrastructure Map backend (https://openinframap.org)"}
        ) as client,
    ):
        yield {"http_client": client, "db_engine": db_engine}


class DBSessionMiddleware:
    def __init__(self, app: ASGI3Application) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: ASGIReceiveCallable, send: ASGISendCallable) -> None:
        db = scope.get("state", {}).get("db_engine")
        if scope["type"] != "http" or db is None:
            await self.app(scope, receive, send)
            return

        db = cast(AsyncEngine, db)
        async with db.connect() as connection:
            scope["db_connection"] = connection  # type: ignore
            await self.app(scope, receive, send)
            if connection.in_transaction():
                await connection.rollback()


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
        Middleware(DBSessionMiddleware),
    ],
)
