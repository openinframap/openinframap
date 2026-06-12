from typing import TypedDict

import httpx
from sqlalchemy.ext.asyncio import AsyncConnection
from starlette.requests import Request as StarletteRequest


class State(TypedDict):
    http_client: httpx.AsyncClient
    db: AsyncConnection


Request = StarletteRequest[State]
