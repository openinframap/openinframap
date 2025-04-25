import asyncio
import contextlib
from typing import AsyncIterator, TypedDict
import httpx
from starlette.responses import PlainTextResponse, RedirectResponse
from starlette.applications import Starlette
from starlette.templating import Jinja2Templates
from starlette.routing import Mount, Route
from starlette.staticfiles import StaticFiles
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
import bokeh.resources
import json

from bokeh.embed import json_item

from template_functions import (
    format_power,
    osm_link,
    country_name,
    format_length,
    format_voltage,
    format_percent,
    format_external_url,
)
from config import database, DEBUG
from util import cache_for
from sitemap import sitemap
from data import (
    get_countries,
    stats_power_line,
)
import charts

templates = Jinja2Templates(directory="templates")

templates.env.filters["power"] = format_power
templates.env.filters["distance"] = format_length
templates.env.filters["voltage"] = format_voltage
templates.env.filters["percent"] = format_percent
templates.env.filters["country_name"] = country_name
templates.env.globals["osm_link"] = osm_link
templates.env.filters["external_url"] = format_external_url
templates.env.globals["BOKEH_JS"] = bokeh.resources.INLINE


class State(TypedDict):
    http_client: httpx.AsyncClient


@contextlib.asynccontextmanager
async def lifespan(app: Starlette) -> AsyncIterator[State]:
    await database.connect()
    async with httpx.AsyncClient(
        headers={
            "User-Agent": "Open Infrastructure Map backend (https://openinframap.org)"
        }
    ) as client:
        yield {"http_client": client}
    await database.disconnect()


app = Starlette(
    debug=DEBUG,
    lifespan=lifespan,
    routes=[
        Mount("/static", app=StaticFiles(directory="static"), name="static"),
        Route("/sitemap.xml", sitemap),
    ],
    middleware=[
        Middleware(CORSMiddleware, allow_origin_regex="http://localhost.*"),
    ],
)


@app.route("/")
async def main(request):
    # Dummy response - this endpoint is served statically in production from the webpack build
    return PlainTextResponse("")


@app.route("/about")
@cache_for(3600)
async def about(request):
    return templates.TemplateResponse("about.html", {"request": request})


@app.route("/about/exports")
@cache_for(3600)
async def exports(request):
    return RedirectResponse("https://www.infrageomatics.com/products")


@app.route("/copyright")
@cache_for(3600)
async def copyright(request):
    return templates.TemplateResponse("copyright.html", {"request": request})


@app.route("/stats")
@cache_for(86400)
async def stats(request):
    async with asyncio.TaskGroup() as tg:
        power_lines = tg.create_task(stats_power_line())
        countries = tg.create_task(get_countries())
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "countries": countries.result(),
            "power_lines": power_lines.result(),
        },
    )


@app.route("/stats/charts")
@cache_for(86400)
async def stats_charts(request):
    async with asyncio.TaskGroup() as tg:
        lines_plot = tg.create_task(charts.line_length())
        plants_plot = tg.create_task(charts.plant_count())
        output_plot = tg.create_task(charts.plant_output())
        substation_plot = tg.create_task(charts.substation_count())

    return templates.TemplateResponse(
        "charts.html",
        {
            "request": request,
            "lines_plot": json.dumps(
                json_item(lines_plot.result(), "lines_plot", charts.theme)
            ),
            "plants_plot": json.dumps(
                json_item(plants_plot.result(), "plants_plot", charts.theme)
            ),
            "output_plot": json.dumps(
                json_item(output_plot.result(), "output_plot", charts.theme)
            ),
            "substation_plot": json.dumps(
                json_item(substation_plot.result(), "substations_plot", charts.theme)
            ),
        },
    )


import views.wikidata  # noqa
import views.search  # noqa
import views.area  # noqa
import views.country  # noqa
