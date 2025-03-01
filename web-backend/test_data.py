import pytest
import httpx
from data import get_wikidata, get_commons_thumbnail


@pytest.mark.asyncio
async def test_get_wikidata():
    async with httpx.AsyncClient() as client:
        result = await get_wikidata("Q42", client)
        assert result is not None
        assert "claims" in result


@pytest.mark.asyncio
async def test_get_commons_thumbnail():
    async with httpx.AsyncClient() as client:
        thumbnail = await get_commons_thumbnail(
            "File:Albert Einstein Head.jpg", client, 400
        )
        assert thumbnail is not None
