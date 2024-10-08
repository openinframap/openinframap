import { LayerSpecificationWithZIndex } from './types.ts'
import { text_paint, operator_text, font } from './common.js'
import { local_name } from './common.ts'

const layers: LayerSpecificationWithZIndex[] = [
  {
    zorder: 40,
    id: 'telecoms_line',
    type: 'line',
    source: 'telecoms',
    minzoom: 2,
    'source-layer': 'telecoms_communication_line',
    paint: {
      'line-color': '#61637A',
      'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.3, 11, 2],
      'line-dasharray': [3, 2]
    }
  },
  {
    zorder: 140,
    id: 'telecoms_data_center',
    type: 'fill',
    source: 'telecoms',
    minzoom: 10,
    'source-layer': 'telecoms_data_center',
    paint: {
      'fill-opacity': 0.3,
      'fill-color': '#7D59AB',
      'fill-outline-color': 'rgba(0, 0, 0, 1)'
    }
  },
  {
    zorder: 141,
    id: 'telecoms_mast',
    type: 'symbol',
    source: 'telecoms',
    minzoom: 10,
    'source-layer': 'telecoms_mast',
    paint: text_paint,
    layout: {
      'icon-image': 'comms_tower',
      'icon-anchor': 'bottom',
      'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.6, 14, 1],
      'text-field': operator_text,
      'text-font': font,
      'text-size': ['interpolate', ['linear'], ['zoom'], 11, 0, 12, 0, 12.01, 10],
      'text-anchor': 'top',
      'text-offset': ['interpolate', ['linear'], ['zoom'], 11, ['literal', [0, 1]], 16, ['literal', [0, 2]]],
      'text-optional': true
    }
  },
  {
    zorder: 563,
    id: 'telecoms_data_center_symbol',
    type: 'symbol',
    source: 'telecoms',
    minzoom: 11,
    'source-layer': 'telecoms_data_center',
    paint: text_paint,
    layout: {
      'text-field': operator_text,
      'text-font': font,
      'text-size': ['interpolate', ['linear'], ['zoom'], 11, 0, 13, 0, 13.01, 10],
      'text-offset': [0, 1],
      'text-anchor': 'top'
    }
  },
  {
    zorder: 564,
    id: 'telecoms_line_label',
    type: 'symbol',
    source: 'telecoms',
    minzoom: 9,
    'source-layer': 'telecoms_communication_line',
    paint: text_paint,
    layout: {
      'text-field': local_name,
      'text-font': font,
      'symbol-placement': 'line',
      'symbol-spacing': 400,
      'text-size': 10,
      'text-offset': [0, 1],
      'text-max-angle': 10
    }
  }
]

export default layers
