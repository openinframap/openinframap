from typing import Type, TypedDict, cast

import httpx
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine
from starlette.exceptions import HTTPException
from starlette.requests import Request as StarletteRequest


class State(TypedDict):
    http_client: httpx.AsyncClient
    db_engine: AsyncEngine


Request = StarletteRequest[State]


def get_db(request: Request) -> AsyncConnection:
    return cast(AsyncConnection, request.scope.get("db_connection"))


def path_param[T](request: Request, name: str, typ: Type[T]) -> T:
    try:
        return typ(request.path_params[name])  # type: ignore
    except ValueError:
        raise HTTPException(400, f"Invalid value for {name}")
