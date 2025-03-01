""" Endpoints to proxy WikiData requests for info popups on the map """

from typing import Optional
import httpx
from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse, Response
from data import get_wikidata, get_commons_thumbnail
from util import cache_for
from main import app


@app.route("/wikidata/{wikidata_id}")
@cache_for(86400)
async def wikidata(request) -> Response:
    wikidata_id = request.path_params["wikidata_id"].upper()
    http_client = request.state.http_client

    response = await wikidata_json(wikidata_id, http_client)
    if response is None:
        raise HTTPException(404, "Wikidata item not found")

    return JSONResponse(
        response,
        headers={"Access-Control-Allow-Origin": "*"},
    )


async def wikidata_json(
    wikidata_id: str, http_client: httpx.AsyncClient
) -> Optional[dict]:
    data = await get_wikidata(wikidata_id, http_client)
    if data is None:
        return None

    response = {}
    response["labels"] = {
        label["language"]: label["value"] for label in data["labels"].values()
    }

    response["sitelinks"] = data["sitelinks"]

    if (
        "P18" in data["claims"]
        and data["claims"]["P18"][0]["mainsnak"]["datatype"] == "commonsMedia"
    ):
        response["image"] = data["claims"]["P18"][0]["mainsnak"]["datavalue"]["value"]
        image_data = await get_commons_thumbnail(
            data["claims"]["P18"][0]["mainsnak"]["datavalue"]["value"], http_client
        )

        response["thumbnail"] = image_data["imageinfo"][0]["thumburl"]

    if "P13333" in data["claims"]:
        response["gem_id"] = data["claims"]["P13333"][0]["mainsnak"]["datavalue"][
            "value"
        ]

    if "P361" in data["claims"]:
        response["part_of"] = []
        for claim in data["claims"]["P361"]:
            response["part_of"].append(
                await wikidata_json(
                    claim["mainsnak"]["datavalue"]["value"]["id"], http_client
                )
            )

    return response
