import asyncio
import json
from typing import cast

from bokeh.core.types import ID
from bokeh.embed import json_item
from starlette.responses import PlainTextResponse, RedirectResponse, Response
from starlette.routing import Route

from .. import Request, charts, get_db
from ..data import (
    get_countries,
    stats_power_line,
)
from ..templates import render_template
from ..util import cache_for


async def main(request: Request) -> Response:
    # Dummy response - this endpoint is served statically in production from the frontend build
    return PlainTextResponse("")


@cache_for(3600)
async def about(request: Request) -> Response:
    return render_template(request, "about.html", {"request": request})


@cache_for(3600)
async def exports(request: Request) -> Response:
    return RedirectResponse("https://www.infrageomatics.com/products")


@cache_for(3600)
async def copyright(request: Request) -> Response:
    return render_template(request, "copyright.html", {"request": request})


@cache_for(86400)
async def stats(request: Request) -> Response:
    db = get_db(request)
    async with asyncio.TaskGroup() as tg:
        power_lines = tg.create_task(stats_power_line(db))
        countries = tg.create_task(get_countries(db))
    return render_template(
        request,
        "index.html",
        {
            "request": request,
            "countries": countries.result(),
            "power_lines": power_lines.result(),
        },
    )


@cache_for(86400)
async def stats_charts(request: Request) -> Response:
    db = get_db(request)
    async with asyncio.TaskGroup() as tg:
        lines_plot = tg.create_task(charts.line_length(db))
        plants_plot = tg.create_task(charts.plant_count(db))
        output_plot = tg.create_task(charts.plant_output(db))
        substation_plot = tg.create_task(charts.substation_count(db))

    return render_template(
        request,
        "charts.html",
        {
            "request": request,
            "lines_plot": json.dumps(json_item(lines_plot.result(), cast(ID, "lines_plot"), charts.theme)),
            "plants_plot": json.dumps(json_item(plants_plot.result(), cast(ID, "plants_plot"), charts.theme)),
            "output_plot": json.dumps(json_item(output_plot.result(), cast(ID, "output_plot"), charts.theme)),
            "substation_plot": json.dumps(
                json_item(substation_plot.result(), cast(ID, "substations_plot"), charts.theme)
            ),
        },
    )


routes = [
    Route("/", endpoint=main),
    Route("/about", endpoint=about),
    Route("/about/exports", endpoint=exports),
    Route("/copyright", endpoint=copyright),
    Route("/stats", endpoint=stats),
    Route("/stats/charts", endpoint=stats_charts),
]

__all__ = ["routes"]
