# Web Frontend

The web frontend for Open Infrastructure Map, written in TypeScript and built with Vite.

## Local development

Copy the example env file and configure it:

```bash
cp .env.example .env
```

Edit `.env` and set `VITE_BACKEND_BASE_URL=http://localhost:8001` to point at your local
backend (see `web-backend/`). `VITE_TILE_BASE_URL` defaults to production tiles and can be
left as-is unless you are running a local tile server.

Install dependencies and start the dev server:

```bash
npm install
npm start   # → http://localhost:5173
```

The Vite dev server proxies `/stats`, `/about`, `/static`, and `/local-images` to the
backend URL configured in `.env`, so backend-rendered pages load correctly.

## Fork-specific behaviour

This fork disables the **OpenCage geocoder** (online-only service). Search uses the local
DB backend (`/search/typeahead`) and coordinate parsing only. To re-enable OpenCage,
uncomment the provider in `src/search/search.ts`.

The **background tile switcher** (OSM / nighttime lights) is hidden. The OSM background
is always active. This reflects the single-tile-source local setup.

## Testing

Code style is checked with [Prettier](https://prettier.io/) and [ESLint](https://eslint.org/):

```bash
npm run lint
```

There is a minimal test suite using [Vitest](https://vitest.dev/):

```bash
npm test   # requires the dev server to be running
```

## Translation

Translation is handled using [i18next](https://www.i18next.com/). If you add a translation
string, add it to [locales/en/translation.json](./locales/en/translation.json) so it is
picked up by Weblate in the upstream project.

To extract new strings:

```bash
npm run extract
```
