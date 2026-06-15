"""Low-budget FastAPI"""

from collections.abc import Callable, Coroutine, Iterable
from inspect import signature
from typing import Any

from pydantic import BaseModel
from pydantic.json_schema import models_json_schema
from starlette.responses import JSONResponse, Response
from starlette.routing import BaseRoute, Route

from . import Request
from .util import cache_for


class APIRoute(Route):
    def __init__(self, path: str, endpoint: Callable[[Request], Coroutine[Any, Any, BaseModel]], cache=600):
        self._return_type = signature(endpoint).return_annotation
        self._doc = endpoint.__doc__

        async def response(request: Request):
            res = await endpoint(request)
            return Response(res.model_dump_json(), media_type="application/json")

        if cache is not None:
            response = cache_for(cache)(response)

        super().__init__(path, response)


def schema_endpoint(routes: Iterable[BaseRoute]):
    async def schema(request: Request) -> Response:
        api_routes = [route for route in routes if isinstance(route, APIRoute)]

        models = [route._return_type for route in api_routes]

        _, schemas = models_json_schema(
            [(model, "validation") for model in models],
            ref_template="#/components/schemas/{model}",
        )

        paths = {
            route.path: {
                "get": {
                    "description": route._doc,
                    "parameters": [
                        {"name": name, "in": "path"} for name, convertor in route.param_convertors.items()
                    ],
                    "responses": {
                        "200": {
                            "description": "",
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": f"#/components/schemas/{route._return_type.__name__}"}
                                }
                            },
                        }
                    },
                }
            }
            for route in api_routes
        }

        openapi_schema = {
            "openapi": "3.1.0",
            "info": {
                "title": "Open Infrastructure Map API",
                "version": "0.0.1",
            },
            "servers": [{"url": "https://openinframap.org"}],
            "components": {
                "schemas": schemas.get("$defs"),
            },
            "paths": paths,
        }
        return JSONResponse(openapi_schema)

    return schema
