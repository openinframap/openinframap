from datetime import timedelta
from functools import wraps
from typing import Optional
from urllib.parse import unquote_plus

from sqlalchemy import text
from starlette.exceptions import HTTPException

from . import Request
from .config import DEBUG


def region_required(func):
    @wraps(func)
    async def wrap_region(request: Request):
        region = unquote_plus(request.path_params["region"])
        database = request.state["db"]

        res = (
            await database.execute(
                text('SELECT gid, "union" FROM countries.country_eez WHERE "union" = :union'),
                {"union": region},
            )
        ).fetchone()

        if not res:
            raise HTTPException(404)
        return await func(request, res._mapping)

    return wrap_region


def cache_for(
    seconds: Optional[int] = None,
    hours: Optional[int] = None,
    days: Optional[int] = None,
):
    def cache_for_inner(func):
        @wraps(func)
        async def wrap_cache(*args, **kwargs):
            response = await func(*args, **kwargs)
            if DEBUG:
                return response

            lifetime = timedelta(
                seconds=seconds or 0,
                hours=hours or 0,
                days=days or 0,
            ).total_seconds()

            if response.headers is None:
                return response

            response.headers["Cache-Control"] = f"public, max-age={lifetime}"
            return response

        return wrap_cache

    return cache_for_inner
