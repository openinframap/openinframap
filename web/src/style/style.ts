import { StyleSpecification } from 'maplibre-gl'

const style: StyleSpecification = {
  version: 8,
  name: 'OpenInfraMap',
  sources: {
    openmaptiles: {
      type: 'vector',
      tiles: ['https://openinframap.org/20221105/{z}/{x}/{y}.mvt'],
      maxzoom: 14,
      attribution: '<a href="https://openmaptiles.org/">© OpenMapTiles</a>'
    },
    openinframap: {
      type: 'vector',
      url: 'https://openinframap.org/map.json'
    },
    solar_heatmap: {
      type: 'vector',
      url: 'https://openinframap.org/heatmap.json'
    }
  },
  glyphs: '/fonts/{fontstack}/{range}.pbf',
  layers: []
}

export default style
