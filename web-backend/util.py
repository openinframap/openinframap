from functools import wraps
from starlette.exceptions import HTTPException
from urllib.parse import unquote_plus

from config import database


def country_required(func):
    @wraps(func)
    async def wrap_country(request):
        country = unquote_plus(request.path_params["country"])

        res = await database.fetch_one(
            query='SELECT gid, "union" FROM countries.country_eez WHERE "union" = :union',
            values={"union": country},
        )

        if not res:
            raise HTTPException(404)
        return await func(request, res)

    return wrap_country


def cache_for(lifetime):
    def cache_for_inner(func):
        @wraps(func)
        async def wrap_cache(*args, **kwargs):
            response = await func(*args, **kwargs)
            response.headers["Cache-Control"] = f"public, max-age={lifetime}"
            return response

        return wrap_cache

    return cache_for_inner
