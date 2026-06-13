from typing import Any

from numpy import number
from pydantic import BaseModel
from shapely import from_wkt
from sqlalchemy.dialects.postgresql import HSTORE
from sqlalchemy.sql import text
from starlette.exceptions import HTTPException
from starlette.responses import Response
from starlette.routing import Route

from .. import Request, get_db, path_param
from ..util import cache_for


def extract_local_names(tags: dict[str, str]) -> dict[str, str]:
    result = {}
    for key in tags:
        if key.startswith("name:"):
            _, code = key.split(":", 1)
            result[code] = tags[key]
    return result


class Circuit(BaseModel):
    id: int
    name: str | None
    local_names: dict[str, str]
    voltage: int | None
    frequency: int | None


class CircuitMembership(BaseModel):
    circuit: Circuit
    role: str | None


class SubstationResponse(BaseModel):
    circuits: list[CircuitMembership]


@cache_for(600)
async def substation(request: Request) -> Response:
    database = get_db(request)
    substation_id = path_param(request, "substation_id", int)
    res = await database.execute(
        text(
            """SELECT relation.osm_id AS relation_id,
            relation.tags -> 'name' AS name,
            relation.tags -> 'frequency' AS frequency,
            relation.tags,
            convert_voltage(relation.tags -> 'voltage') AS voltage,
            member.role
            FROM osm_power_circuit_relation_member member, osm_power_circuit_relation relation
            WHERE relation.osm_id = member.osm_id AND member.member = :member_id"""
        ).columns(tags=HSTORE),
        {"member_id": substation_id},
    )

    circuits = [
        CircuitMembership(
            circuit=Circuit(
                id=r._mapping["relation_id"],
                name=r._mapping["name"],
                local_names=extract_local_names(r._mapping["tags"]),
                voltage=r._mapping["voltage"] / 1000 if r._mapping["voltage"] else None,
                frequency=r._mapping["frequency"],
            ),
            role=r._mapping["role"],
        )
        for r in res
    ]

    return Response(SubstationResponse(circuits=circuits).model_dump_json(), media_type="application/json")


class CircuitSubstation(BaseModel):
    id: int
    name: str | None
    local_names: dict[str, str]
    location: tuple[float, float]


class CircuitResponse(Circuit):
    length: float
    type: str
    wikidata: str | None

    substations: list[CircuitSubstation]

    geometry: dict[str, Any]  # GeoJSON


@cache_for(600)
async def circuit(request: Request) -> Response:
    database = get_db(request)
    circuit_id = path_param(request, "circuit_id", int)
    relation = (
        await database.execute(
            text("""
                SELECT relation.osm_id AS relation_id,
                relation.tags -> 'name' AS name,
                relation.tags -> 'frequency' AS frequency,
                relation.tags -> 'type' AS type,
                relation.tags -> 'wikidata' AS wikidata,
                relation.tags,
                convert_voltage(relation.tags -> 'voltage') AS voltage,
                (SELECT json_build_object('type', 'FeatureCollection', 'features',
                    json_agg(json_build_object('type', 'Feature',
                        'geometry', ST_AsGeoJSON(ST_Transform(ST_Simplify(geometry, 1), 4326),
                                    maxdecimaldigits=>6)::json)))
                    FROM osm_power_circuit_relation_member WHERE osm_id = relation.osm_id) AS geojson,
                (SELECT sum(st_length(ST_Transform(geometry, 4326)::geography))
                    from osm_power_circuit_relation_member WHERE role = 'section' AND
                    osm_id = relation.osm_id) AS length,
                (select ST_AsText(st_envelope(st_collect(st_transform(geometry, 4326)))) from
                    osm_power_circuit_relation_member where osm_id = relation.osm_id) AS bbox

                FROM osm_power_circuit_relation relation
                WHERE relation.osm_id = :relation_id
                AND relation.tags -> 'type' IN ('power', 'route')
            """).columns(tags=HSTORE),
            {"relation_id": circuit_id},
        )
    ).fetchone()
    if not relation:
        raise HTTPException(404)

    geojson = relation._mapping["geojson"]

    bbox = from_wkt(relation._mapping["bbox"])
    geojson["bbox"] = bbox.bounds

    substations = await database.execute(
        text("""
            SELECT id, tags -> 'name' AS name, tags,
                ST_AsText(ST_Transform(ST_Centroid(geometry),4326)) AS location
            FROM osm_power_circuit_relation_member
            WHERE osm_id = :relation_id AND role = 'substation'
        """).columns(tags=HSTORE),
        {"relation_id": circuit_id},
    )

    circuit_substations = [
        CircuitSubstation(
            id=s._mapping["id"],
            name=s._mapping["name"],
            local_names=extract_local_names(s._mapping["tags"]),
            location=from_wkt(s._mapping["location"]).coords[0],
        )
        for s in substations
    ]

    return Response(
        CircuitResponse(
            id=relation._mapping["relation_id"],
            name=relation._mapping["name"],
            local_names=extract_local_names(relation._mapping["tags"]),
            voltage=relation._mapping["voltage"] / 1000 if relation._mapping["voltage"] else None,
            frequency=relation._mapping["frequency"],
            geometry=geojson,
            length=round((relation._mapping["length"] or 0) / 1000, 2),
            substations=circuit_substations,
            type=relation._mapping["type"],
            wikidata=relation._mapping["wikidata"],
        ).model_dump_json(),
        media_type="application/json",
    )


class LineResponse(BaseModel):
    circuits: list[CircuitMembership]


@cache_for(600)
async def line(request: Request) -> Response:
    database = get_db(request)
    line_id = path_param(request, "line_id", int)

    res = await database.execute(
        text(
            """
                SELECT relation.osm_id AS relation_id,
                    relation.tags->'name' AS name,
                    relation.tags -> 'frequency' AS frequency,
                    relation.tags AS tags,
                    convert_voltage(relation.tags -> 'voltage') AS voltage,
                    member.role
                FROM osm_power_circuit_relation_member member,
                     osm_power_circuit_relation relation
                WHERE member = :line_id
                AND member.osm_id = relation.osm_id
            """
        ),
        {"line_id": line_id},
    )

    circuits = [
        CircuitMembership(
            circuit=Circuit(
                id=r._mapping["relation_id"],
                name=r._mapping["name"],
                local_names=extract_local_names(r._mapping["tags"]),
                voltage=r._mapping["voltage"] / 1000 if r._mapping["voltage"] else None,
                frequency=r._mapping["frequency"],
            ),
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
