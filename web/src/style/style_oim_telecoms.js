import {text_paint, operator_text} from './style_oim_common.js';
import {local_name_tags} from '../l10n.js';
const local_name = ['coalesce'].concat(local_name_tags.map(tag => ['get', tag]));

const layers = [
  {
    zorder: 40,
    id: 'telecoms_line',
    type: 'line',
    source: 'openinframap',
    minzoom: 3,
    'source-layer': 'telecoms_communication_line',
    paint: {
      'line-color': '#61637A',
      'line-width': ['interpolate', ['linear'], ['zoom'],
        3, 0.3,
        11, 2
      ],
      'line-dasharray': [3, 2],
    },
  },
  {
    zorder: 140,
    id: 'telecoms_data_center',
    type: 'fill',
    source: 'openinframap',
    minzoom: 10,
    'source-layer': 'telecoms_data_center',
    paint: {
      'fill-opacity': 0.3,
      'fill-color': '#7D59AB',
      'fill-outline-color': 'rgba(0, 0, 0, 1)',
    },
  },
  {
    zorder: 141,
    id: 'telecoms_mast',
    type: 'symbol',
    source: 'openinframap',
    minzoom: 10,
    'source-layer': 'telecoms_mast',
    paint: text_paint,
    layout: {
      'icon-image': 'comms_tower',
      'icon-anchor': 'bottom',
      'icon-size': ['interpolate', ["linear"], ["zoom"],
        10, 0.6,
        14, 1
      ],
      'text-field': operator_text,
      'text-size': {
        "stops": [
          [11, 0],
          [12, 0],
          [12.01, 10]
        ],
      },
      'text-anchor': 'top',
      'text-offset': {
        'stops': [
          [11, [0, 1]],
          [16, [0, 2]]
        ]
      },
      'text-optional': true
    },
  },
  {
    id: 'telecoms_data_center_symbol',
    type: 'symbol',
    source: 'openinframap',
    minzoom: 11,
    'source-layer': 'telecoms_data_center',
    paint: text_paint,
    layout: {
      'text-field': operator_text,
      'text-size': {
        "stops": [
          [11, 0],
          [13, 0],
          [13.01, 10]
        ],
      },
      'text-offset': [0, 1],
      'text-anchor': 'top',
    },
  },
  {
    id: 'telecoms_line_label',
    type: 'symbol',
    source: 'openinframap',
    minzoom: 9,
    'source-layer': 'telecoms_communication_line',
    paint: text_paint,
    layout: {
      'text-field': local_name,
      'symbol-placement': 'line',
      'symbol-spacing': 400,
      'text-size': 10,
      'text-offset': [0, 1],
      'text-max-angle': 10
    }
  },

];

export default layers;
