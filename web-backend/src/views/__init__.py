from itertools import chain

from starlette.routing import BaseRoute

from . import api, area, base, country, search, wikidata

routes: list[BaseRoute] = list(
    chain.from_iterable(
        [base.routes, api.routes, wikidata.routes, search.routes, area.routes, country.routes]
    )
)
