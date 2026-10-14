export const TILE_BASE_URL: string = import.meta.env.VITE_TILE_BASE_URL ?? 'https://openinframap.org'

export const BACKEND_BASE_URL: string = import.meta.env.VITE_BACKEND_BASE_URL ?? 'https://openinframap.org'

// Full URL prefix for OIM infrastructure tile layers (power, petroleum, etc.).
// Production nginx serves these at /map/*; local Tegola serves them at /maps/*.
// When VITE_TEGOLA_URL is set we point directly at Tegola — Tegola returns
// Access-Control-Allow-Origin: * so cross-origin tile fetches work fine.
export const OIM_TILES: string = import.meta.env.VITE_TEGOLA_URL
  ? `${import.meta.env.VITE_TEGOLA_URL}/maps`
  : `${TILE_BASE_URL}/map`
