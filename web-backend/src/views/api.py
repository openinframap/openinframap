from typing import Any

from pydantic import BaseModel
from sqlalchemy.sql import text
from starlette.exceptions import HTTPException
from starlette.responses import Response
from starlette.routing import Route

from .. import Request, get_db
from ..util import cache_for


class Circuit(BaseModel):
    id: int
    name: str | None
    name_en: str | None
    voltage: int | None
    frequency: int | None
    role: str | None


class SubstationResponse(BaseModel):
    circuits: list[Circuit]


@cache_for(600)
async def substation(request: Request) -> Response:
    database = get_db(request)
    substation_id = request.path_params["substation_id"]
    res = await database.execute(
        text(
            """SELECT relation.osm_id AS relation_id,
            relation.tags -> 'name' AS name,
            relation.tags -> 'name:en' AS name_en,
            relation.tags -> 'frequency' AS frequency,
            convert_voltage(relation.tags -> 'voltage') AS voltage,
            member.role
            FROM osm_power_circuit_relation_member member, osm_power_circuit_relation relation
            WHERE relation.osm_id = member.osm_id AND member.member = :member_id"""
        ),
        {"member_id": int(substation_id)},
    )

    circuits = [
        Circuit(
            id=r._mapping["relation_id"],
            name=r._mapping["name"],
            name_en=r._mapping["name_en"],
            voltage=r._mapping["voltage"] / 1000 if r._mapping["voltage"] else None,
            frequency=r._mapping["frequency"],
            role=r._mapping["role"],
        )
        for r in res
    ]

    return Response(SubstationResponse(circuits=circuits).model_dump_json(), media_type="application/json")


class CircuitResponse(BaseModel):
    id: int
    name: str | None
    name_en: str | None
    voltage: int | None
    frequency: int | None
    length: float

    geometry: dict[str, Any]


@cache_for(600)
async def circuit(request: Request) -> Response:
    database = get_db(request)
    circuit_id = request.path_params["circuit_id"]
    res = (
        await database.execute(
            text("""
                SELECT relation.osm_id AS relation_id,
                relation.tags -> 'name' AS name,
                relation.tags -> 'name:en' AS name_en,
                relation.tags -> 'frequency' AS frequency,
                convert_voltage(relation.tags -> 'voltage') AS voltage,
                (SELECT json_build_object('type', 'FeatureCollection', 'features',
                    json_agg(json_build_object('type', 'Feature',
                        'geometry', ST_AsGeoJSON(ST_Transform(ST_Simplify(geometry, 1), 4326),
                                    maxdecimaldigits=>6)::json)))
                    FROM osm_power_circuit_relation_member WHERE osm_id = relation.osm_id) AS geojson,
                (SELECT sum(st_length(ST_Transform(geometry, 4326)::geography))
                    from osm_power_circuit_relation_member WHERE role = 'section' AND
                    osm_id = relation.osm_id) AS length

                FROM osm_power_circuit_relation relation
                WHERE relation.osm_id = :relation_id
            """),
            {"relation_id": int(circuit_id)},
        )
    ).fetchone()
    if not res:
        raise HTTPException(404)

    return Response(
        CircuitResponse(
            id=res._mapping["relation_id"],
            name=res._mapping["name"],
            name_en=res._mapping["name_en"],
            voltage=res._mapping["voltage"] / 1000 if res._mapping["voltage"] else None,
            frequency=res._mapping["frequency"],
            geometry=res._mapping["geojson"],
            length=round((res._mapping["length"] or 0) / 1000, 2),
        ).model_dump_json(),
        media_type="application/json",
    )


class LineResponse(BaseModel):
    circuits: list[Circuit]


@cache_for(600)
async def line(request: Request) -> Response:
    database = get_db(request)
    line_id = request.path_params["line_id"]

    res = await database.execute(
        text(
            """
                SELECT relation.osm_id AS relation_id,
                    relation.tags->'name' AS name,
                    relation.tags->'name:en' AS name_en,
                    relation.tags -> 'frequency' AS frequency,
                    convert_voltage(relation.tags -> 'voltage') AS voltage,
                    member.role
                FROM osm_power_circuit_relation_member member,
                     osm_power_circuit_relation relation
                WHERE member = :line_id
                AND member.osm_id = relation.osm_id
            """
        ),
        {"line_id": int(line_id)},
    )

    circuits = [
        Circuit(
            id=r._mapping["relation_id"],
            name=r._mapping["name"],
            name_en=r._mapping["name_en"],
            voltage=r._mapping["voltage"] / 1000 if r._mapping["voltage"] else None,
            frequency=r._mapping["frequency"],
            role=r._mapping["role"],
        )
        for r in res
    ]

    return Response(LineResponse(circuits=circuits).model_dump_json(), media_type="application/json")


routes = [
    Route("/api/substation/{substation_id}", endpoint=substation),
    Route("/api/circuit/{circuit_id}", endpoint=circuit),
    Route("/api/line/{line_id}", endpoint=line),
]
