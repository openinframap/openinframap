import pytest
from data import get_wikidata, get_commons_thumbnail


@pytest.mark.asyncio
async def test_get_wikidata():
    result = await get_wikidata("Q42")
    assert result is not None
    assert "claims" in result


@pytest.mark.asyncio
async def test_get_commons_thumbnail():
    thumbnail = await get_commons_thumbnail("File:Albert Einstein Head.jpg", 400)
    assert thumbnail is not None
