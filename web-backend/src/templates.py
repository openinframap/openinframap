from typing import Any, Mapping, cast

import bokeh.resources
from starlette.background import BackgroundTask
from starlette.requests import Request as StarletteRequest
from starlette.templating import Jinja2Templates

from . import Request
from .template_functions import (
    country_name,
    format_external_url,
    format_length,
    format_percent,
    format_power,
    format_voltage,
    osm_link,
)

templates = Jinja2Templates(directory="src/templates")

templates.env.filters["power"] = format_power
templates.env.filters["distance"] = format_length
templates.env.filters["voltage"] = format_voltage
templates.env.filters["percent"] = format_percent
templates.env.filters["country_name"] = country_name
templates.env.globals["osm_link"] = osm_link
templates.env.filters["external_url"] = format_external_url
templates.env.globals["BOKEH_JS"] = bokeh.resources.INLINE


def render_template(
    request: Request,
    name: str,
    context: dict[str, Any] | None = None,
    status_code: int = 200,
    headers: Mapping[str, str] | None = None,
    media_type: str | None = None,
    background: BackgroundTask | None = None,
):
    return templates.TemplateResponse(
        cast(StarletteRequest, request), name, context, status_code, headers, media_type, background
    )
