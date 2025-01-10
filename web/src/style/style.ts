import { StyleSpecification } from 'maplibre-gl'

const oim_attribution =
  '<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="https://openinframap.org/copyright">Open Infrastructure Map</a>'

const style: StyleSpecification = {
  version: 8,
  name: 'OpenInfraMap',
  projection: {
    type: 'globe'
  },
  sky: {
    'sky-color': '#1A6566',
    'horizon-color': '#863BED',
    'fog-color': '#4B575E',
    'sky-horizon-blend': 0.5,
    'horizon-fog-blend': 0.5,
    'fog-ground-blend': 0.5,
    'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 2, 0.4, 4, 0]
  },
  light: {
    anchor: 'viewport',
    color: '#F5F02E',
    intensity: 1,
    position: [1, 90, 90]
  },
  sources: {
    openmaptiles: {
      type: 'vector',
      tiles: ['https://openinframap.org/20221105/{z}/{x}/{y}.mvt'],
      maxzoom: 14,
      attribution: '<a href="https://openmaptiles.org/">OpenMapTiles</a>'
    },
    blackmarble: {
      type: 'raster',
      tiles: ['https://openinframap.org/black-marble-2023/{z}/{x}/{y}.webp'],
      maxzoom: 8,
      attribution:
        '<a href="https://ladsweb.modaps.eosdis.nasa.gov/missions-and-measurements/products/VNP46A4/">NASA Black Marble 2023</a>'
    },
    power: {
      type: 'vector',
      tiles: ['https://openinframap.org/map/power/{z}/{x}/{y}.pbf'],
      maxzoom: 17,
      attribution: oim_attribution
    },
    petroleum: {
      type: 'vector',
      tiles: ['https://openinframap.org/map/petroleum/{z}/{x}/{y}.pbf'],
      maxzoom: 17,
      attribution: oim_attribution
    },
    telecoms: {
      type: 'vector',
      tiles: ['https://openinframap.org/map/telecoms/{z}/{x}/{y}.pbf'],
      maxzoom: 17,
      attribution: oim_attribution
    },
    water: {
      type: 'vector',
      tiles: ['https://openinframap.org/map/water/{z}/{x}/{y}.pbf'],
      maxzoom: 17,
      attribution: oim_attribution
    },
    solar_heatmap: {
      type: 'vector',
      tiles: ['https://openinframap.org/map/solar_heatmap/{z}/{x}/{y}.pbf'],
      maxzoom: 17,
      attribution: oim_attribution
    }
  },
  glyphs: '/fonts/{fontstack}/{range}.pbf',
  layers: []
}

export default style
