import { StyleSpecification } from 'maplibre-gl'

const style: StyleSpecification = {
  version: 8,
  name: 'OpenInfraMap',
  projection: {
    type: 'globe'
  },
  sky: {
    'sky-color': '#3BEAED',
    'horizon-color': '#863BED',
    'fog-color': '#C3E3F5',
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
      attribution: '<a href="https://openmaptiles.org/">© OpenMapTiles</a>'
    },
    openinframap: {
      type: 'vector',
      url: '/map.json'
    },
    solar_heatmap: {
      type: 'vector',
      url: '/heatmap.json'
    }
  },
  glyphs: '/fonts/{fontstack}/{range}.pbf',
  layers: []
}

export default style
