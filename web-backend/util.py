from functools import wraps
from typing import Optional
from starlette.exceptions import HTTPException
from urllib.parse import unquote_plus
from datetime import timedelta
from config import database, DEBUG


def region_required(func):
    @wraps(func)
    async def wrap_region(request):
        region = unquote_plus(request.path_params["region"])

        res = await database.fetch_one(
            query='SELECT gid, "union" FROM countries.country_eez WHERE "union" = :union',
            values={"union": region},
        )

        if not res:
            raise HTTPException(404)
        return await func(request, res)

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
