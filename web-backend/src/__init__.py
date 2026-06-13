from typing import TypedDict, cast

import httpx
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine
from starlette.requests import Request as StarletteRequest


class State(TypedDict):
    http_client: httpx.AsyncClient
    db_engine: AsyncEngine


Request = StarletteRequest[State]


def get_db(request: Request) -> AsyncConnection:
    return cast(AsyncConnection, request.scope.get("db_connection"))
