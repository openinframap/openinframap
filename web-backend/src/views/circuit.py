from sqlalchemy import text
from starlette.responses import Response
from starlette.routing import Route

from .. import get_db
from ..templates import render_template
from ..util import cache_for


@cache_for(hours=1)
async def circuits(request) -> Response:
    database = get_db(request)

    result = (
        await database.execute(
            text(
                """SELECT r.tags->'type' AS type, r.osm_id, r.name, r.tags->'name:en' AS name_en,
                        r.tags->'wikidata' AS wikidata,
                        COALESCE((SELECT sum(st_length(st_transform(m.geometry, 4326)::geography)) / 1000
                            FROM osm_power_circuit_relation_member m
                            WHERE m.osm_id = r.osm_id
                            AND m.role = 'section'), 0) AS circuit_length,
                        (SELECT count(*)
                            FROM osm_power_circuit_relation_member m
                            WHERE m.osm_id = r.osm_id
                            AND m.role = 'substation') AS substations
                    FROM osm_power_circuit_relation r
                    order by circuit_length desc
                    limit 50
        """
            )
        )
    ).fetchall()

    return render_template(request, "circuits.html", {"request": request, "circuits": result})


routes = [Route("/stats/circuit", endpoint=circuits)]

__all__ = ["routes"]
