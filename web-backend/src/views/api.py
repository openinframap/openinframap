from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.routing import Route

from ..util import cache_for


@cache_for(600)
async def substation(request: Request) -> Response:
    database = request.state.db
    substation_id = request.path_params["substation_id"]
    res = await database.fetch(
        """SELECT relation.osm_id AS relation_id, relation.tags, member.role
            FROM osm_power_circuit_relation_member member, osm_power_circuit_relation relation
            WHERE relation.osm_id = member.osm_id AND member.member = $1""",
        {"member_id": int(substation_id)},
    )
    if res is not None:
        for record in res:
            print(record, repr(res[record]))

    return JSONResponse({"status": "success"})


routes = [Route("/api/substation/{substation_id}", endpoint=substation)]
