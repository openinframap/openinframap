export const TILE_BASE_URL: string = import.meta.env.VITE_TILE_BASE_URL ?? 'https://openinframap.org'

// Basemap (roads, buildings, water, labels) vector tiles in the Protomaps
// schema. Defaults to openinframap.org; set VITE_BASEMAP_URL to use your own
// tile server, e.g. `pmtiles serve` or a Martin instance.
export const BASEMAP_URL: string =
  import.meta.env.VITE_BASEMAP_URL ?? `${TILE_BASE_URL}/20250311/{z}/{x}/{y}.mvt`

export const BACKEND_BASE_URL: string = import.meta.env.VITE_BACKEND_BASE_URL ?? 'https://openinframap.org'

// Full URL prefix for OIM infrastructure tile layers (power, petroleum, etc.).
// Production nginx serves these at /map/*; local Tegola serves them at /maps/*.
// When VITE_TEGOLA_URL is set we point directly at Tegola — Tegola returns
// Access-Control-Allow-Origin: * so cross-origin tile fetches work fine.
export const OIM_TILES: string = import.meta.env.VITE_TEGOLA_URL
  ? `${import.meta.env.VITE_TEGOLA_URL}/maps`
  : `${TILE_BASE_URL}/map`
