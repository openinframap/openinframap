import i18next from 'i18next'
import style_base from './style_base.js'
import style_labels from './style_labels.js'
import style_oim_power from './style_oim_power.js'
import style_oim_power_heatmap from './style_oim_power_heatmap.js'
import style_oim_telecoms from './style_oim_telecoms.js'
import style_oim_petroleum from './style_oim_petroleum.js'
import style_oim_water from './style_oim_water.js'
import style_oim_other_pipelines from './style_oim_other_pipelines.js'
import style_osmose from './style_osmose.js'
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
    'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 0.8, 4, 0]
  },
  light: {
    anchor: 'viewport',
    color: '#F5F02E',
    intensity: 0.8,
    position: [1, 85, 90]
  },
  sources: {
    basemap: {
      type: 'vector',
      tiles: ['https://openinframap.org/20250311/{z}/{x}/{y}.mvt'],
      maxzoom: 15,
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>'
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
    },
    other_pipeline: {
      type: 'vector',
      tiles: ['https://openinframap.org/map/other_pipeline/{z}/{x}/{y}.pbf'],
      maxzoom: 17,
      attribution: oim_attribution
    },
    osmose_errors_power: {
      type: 'vector',
      tiles: ['https://osmose.openstreetmap.fr/api/0.3/issues/{z}/{x}/{y}.mvt?tags=power'],
      maxzoom: 17,
      minzoom: 11
    }
  },
  //glyphs: '/fonts/{fontstack}/{range}.pbf',
  glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
  sprite: 'https://protomaps.github.io/basemaps-assets/sprites/v4/light',
  layers: []
}

export function getLayers() {
  return [
    ...style_oim_power(),
    ...style_oim_power_heatmap,
    ...style_oim_petroleum(),
    ...style_oim_telecoms(),
    ...style_oim_water(),
    ...style_oim_other_pipelines(),
    ...style_osmose()
  ]
}

export function getStyle() {
  const oim_layers = getLayers()

  oim_layers.sort((a, b) => {
    if (!a.zorder || !b.zorder) {
      throw new Error('zorder is required for all layers')
    }
    if (a.zorder < b.zorder) return -1
    if (a.zorder > b.zorder) return 1
    return 0
  })

  style.layers = [...style_base, ...oim_layers, ...style_labels(i18next.language)]
  return style
}
