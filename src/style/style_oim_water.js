import {text_paint, operator_text, underground_p} from './style_oim_common.js';

const layers = [
  {
    zorder: 20,
    id: 'water_pipeline_case',
    type: 'line',
    source: 'openinframap',
    minzoom: 7,
    'source-layer': 'water_pipeline',
    paint: {
      'line-color': '#bbbbbb',
      'line-width': ['interpolate', ['linear'], ['zoom'],
        8, 1.5,
        13, 4
      ],
    },
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
  },
  {
    zorder: 21,
    id: 'water_pipeline',
    type: 'line',
    source: 'openinframap',
    minzoom: 3,
    'source-layer': 'water_pipeline',
    paint: {
      'line-color': '#7B7CBA',
      'line-width': ['interpolate', ['linear'], ['zoom'],
        3, 0.3,
        13, 2
      ],
    },
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
      'text-field': '{name}',
      'symbol-placement': 'line',
      'symbol-spacing': 400,
      'text-size': 10,
      'text-offset': [0, 1],
      'text-max-angle': 10
    }
  },
];

export default layers;
