import { ExpressionSpecification } from 'maplibre-gl'
import { LayerSpecificationWithZIndex } from './types.ts'
//import { font, text_paint } from './common.ts'

const generator_weight: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['to-number', ['get', 'output']],
  0,
  0,
  70,
  0.01,
  50000,
  0.5,
  500000,
  1
]

const layers: LayerSpecificationWithZIndex[] = [
  {
    zorder: 162,
    id: 'heatmap_solar',
    type: 'heatmap',
    source: 'solar_heatmap',
    'source-layer': 'power_heatmap_solar',
    minzoom: 1,
    maxzoom: 13,
    paint: {
      'heatmap-weight': generator_weight,
      'heatmap-intensity': 0.8,
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0,
        'rgba(255,255,204,0)',
        0.1,
        'rgb(255,237,160)',
        0.2,
        'rgb(254,217,118)',
        0.3,
        'rgb(254,178,76)',
        0.45,
        'rgb(253,141,60)',
        0.55,
        'rgb(252,78,42)',
        0.7,
        'rgb(227,26,28)',
        0.9,
        'rgb(189,0,38)',
        1,
        'rgb(128,0,38)'
      ],
      // Adjust the heatmap radius by zoom level
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 1, 0.5, 8, 15, 13, 70]
    },
    layout: {
      visibility: 'none'
    }
  } /*,
  {
    zorder: 164,
    id: 'heatmap_solar_point_debug_symbol',
    type: 'symbol',
    source: 'solar_heatmap',
    'source-layer': 'power_heatmap_solar',
    minzoom: 1,
    maxzoom: 20,
    paint: {
      ...text_paint
    },
    layout: {
      'text-field': ['get', 'output'],
      'text-font': font,
      'text-size': 10
    }
  }*/
]

export { layers as default }
