""" Endpoints to proxy WikiData requests """
import aiohttp
import re
from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse
from util import cache_for
from main import app


async def get_wikidata(wikidata_id):
    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"https://www.wikidata.org/entity/{wikidata_id}.json"
        ) as resp:
            if resp.status != 200:
                raise HTTPException(503)
            data = await resp.json()
            return data["entities"][wikidata_id]


async def get_commons_thumbnail(filename, width=300):
    url = (
        "https://commons.wikimedia.org/w/api.php?"
        f"action=query&titles=Image:{filename}&prop=imageinfo"
        f"&iiprop=url&iiurlwidth={width}&format=json"
    )
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as resp:
            if resp.status != 200:
                raise HTTPException(503)
            data = await resp.json()
            return list(data["query"]["pages"].values())[0]["imageinfo"][0]["thumburl"]


@app.route("/wikidata/{wikidata_id}")
@cache_for(86400)
async def wikidata(request):
    wikidata_id = request.path_params['wikidata_id'].upper()
    if not re.match(r"^Q[0-9]+$", wikidata_id):
        raise HTTPException(404)

    response = {}
    data = await get_wikidata(wikidata_id)

    response["sitelinks"] = data["sitelinks"]
    if (
        "P18" in data["claims"]
        and data["claims"]["P18"][0]["mainsnak"]["datatype"] == "commonsMedia"
    ):
        response["image"] = data["claims"]["P18"][0]["mainsnak"]["datavalue"]["value"]
        response["thumbnail"] = await get_commons_thumbnail(
            data["claims"]["P18"][0]["mainsnak"]["datavalue"]["value"]
        )

    return JSONResponse(
        response,
        headers={"Access-Control-Allow-Origin": "*"},
    )
