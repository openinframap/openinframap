""" Endpoints to proxy WikiData requests for info popups on the map """
from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse
from data import get_wikidata, get_commons_thumbnail
from util import cache_for
from main import app


@app.route("/wikidata/{wikidata_id}")
@cache_for(86400)
async def wikidata(request):
    wikidata_id = request.path_params['wikidata_id'].upper()

    response = {}
    data = await get_wikidata(wikidata_id)
    if data is None:
        raise HTTPException(404, "Wikidata item not found")

    response["sitelinks"] = data["sitelinks"]
    if (
        "P18" in data["claims"]
        and data["claims"]["P18"][0]["mainsnak"]["datatype"] == "commonsMedia"
    ):
        response["image"] = data["claims"]["P18"][0]["mainsnak"]["datavalue"]["value"]
        image_data = await get_commons_thumbnail(
            data["claims"]["P18"][0]["mainsnak"]["datavalue"]["value"]
        )

        response["thumbnail"] = image_data["imageinfo"][0]["thumburl"]

    return JSONResponse(
        response,
        headers={"Access-Control-Allow-Origin": "*"},
    )
