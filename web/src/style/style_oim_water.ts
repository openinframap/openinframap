import { LayerSpecificationWithZIndex } from './types.ts'
import { text_paint, font } from './common.js'
import { ExpressionSpecification } from 'maplibre-gl'

const colour_freshwater = '#7B7CBA'
const colour_wastewater = '#BAA87B'
const colour_hotwater = '#AD4C4C'
const colour_steam = '#7BBAAC'

const substance_label: ExpressionSpecification = [
  'match',
  ['get', 'substance'],
  'water',
  'Water',
  'rainwater',
  'Rainwater',
  'hot_water',
  'Hot Water',
  'wastewater',
  'Wastewater',
  'sewage',
  'Sewage',
  'waterwaste',
  'Waterwaste',
  'steam',
  'Steam',
  ['get', 'substance']
]

const substance_colour: ExpressionSpecification = [
  'match',
  ['get', 'substance'],
  'water',
  colour_freshwater,
  'rainwater',
  colour_freshwater,
  'hot_water',
  colour_hotwater,
  'wastewater',
  colour_wastewater,
  'sewage',
  colour_wastewater,
  'waterwaste',
  colour_wastewater,
  'steam',
  colour_steam,
  '#7B7CBA'
]

const layers: LayerSpecificationWithZIndex[] = [
  {
    zorder: 20,
    id: 'water_pipeline_case',
    type: 'line',
    source: 'openinframap',
    minzoom: 7,
    'source-layer': 'water_pipeline',
    paint: {
      'line-color': '#777777',
      'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.5, 16, 7]
    },
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    }
  },
  {
    zorder: 21,
    id: 'water_pipeline',
    type: 'line',
    source: 'openinframap',
    minzoom: 3,
    'source-layer': 'water_pipeline',
    paint: {
      'line-color': substance_colour,
      'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.3, 16, 4]
    }
  },
  {
    zorder: 520,
    id: 'water_pipeline_label',
    type: 'symbol',
    source: 'openinframap',
    'source-layer': 'water_pipeline',
    minzoom: 11,
    paint: text_paint,
    layout: {
      'text-field': [
        'case',
        ['has', 'name'],
        ['concat', ['get', 'name'], ' (', substance_label, ')'],
        substance_label
      ],
      'text-font': font,
      'symbol-placement': 'line',
      'symbol-spacing': 400,
      'text-size': 10,
      'text-offset': [0, 1],
      'text-max-angle': 10
    }
  }
]

export { layers as default, colour_freshwater, colour_wastewater, colour_hotwater, colour_steam }
