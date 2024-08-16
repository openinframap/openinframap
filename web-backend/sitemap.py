import asgi_sitemaps
from starlette.requests import Request
from urllib.parse import quote

from data import get_countries


class StaticSitemap(asgi_sitemaps.Sitemap):
    def items(self):
        return ["main", "about", "stats", "copyright"]

    def location(self, item):
        request = Request(scope=self.scope)
        url = request.url_for(item)
        return url.path


class CountryPageSitemap(asgi_sitemaps.Sitemap):
    async def items(self):
        return [row[0] for row in await get_countries()]

    def location(self, item):
        request = Request(scope=self.scope)
        url = request.url_for("country", country=quote(item))
        return url.path


sitemap = asgi_sitemaps.SitemapApp(
    [StaticSitemap(), CountryPageSitemap()], domain="openinframap.org"
)
