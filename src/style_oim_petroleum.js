import {text_paint, operator_text, underground_p} from './style_oim_common.js';

const substance = ["coalesce", ["get", "substance"], ["get", "type"], ""];

const colour_gas = '#E0DC7E';
const colour_oil = '#E5B393';

const pipeline_colour = ["match",
  substance,
  ['gas', 'natural_gas', 'cng'], colour_gas,
  colour_oil
]

const substance_operator = ["concat", 
  ["get", "operator"],
  ["case", ["all", 
            ["!=", substance, ""], 
            ["!=", ["get", "operator"], ""]
           ],
    ["concat", " (", substance, ")"],
    substance
  ]
]

const layers = [
  {
    zorder: 0,
    id: 'petroleum_pipeline_case',
    type: 'line',
    source: 'openinframap',
    minzoom: 7,
    'source-layer': 'petroleum_pipeline',
    paint: {
      'line-color': '#666666',
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
    zorder: 1,
    id: 'petroleum_pipeline',
    type: 'line',
    source: 'openinframap',
    minzoom: 3,
    'source-layer': 'petroleum_pipeline',
    paint: {
      'line-color': pipeline_colour,
      'line-width': ['interpolate', ['linear'], ['zoom'],
        3, 0.3,
        13, 2
      ],
    },
  },
  {
    zorder: 100,
    id: 'petroleum_site',
    type: 'fill',
    source: 'openinframap',
    minzoom: 8,
    'source-layer': 'petroleum_site',
    paint: {
      'fill-opacity': 0.3,
      'fill-color': colour_oil,
      'fill-outline-color': 'rgba(0, 0, 0, 1)',
    },
  },
  {
    zorder: 101,
    id: 'petroleum_well',
    type: 'circle',
    source: 'openinframap',
    minzoom: 10,
    'source-layer': 'petroleum_well',
    paint: {
      'circle-color': colour_oil,
      'circle-stroke-color': '#666666',
      'circle-stroke-width': 1,
      'circle-radius': ['interpolate', 
        ['linear'], ['zoom'],
        10, 1,
        12, 2,
        14, 5
      ],
    },
  },
  {
    zorder: 500,
    id: 'petroleum_pipeline_label',
    type: 'symbol',
    source: 'openinframap',
    'source-layer': 'petroleum_pipeline',
    minzoom: 11,
    paint: text_paint,
    layout: {
      'text-field': substance_operator,
      'symbol-placement': 'line',
      'symbol-spacing': 400,
      'text-size': 10,
      'text-offset': [0, 1],
      'text-max-angle': 10
    }
  },
  {
    zorder: 501,
    id: 'petroleum_site_label',
    type: 'symbol',
    source: 'openinframap',
    'source-layer': 'petroleum_site',
    minzoom: 11,
    layout: {
      'text-field': '{name}',
      'text-anchor': 'top',
      'text-offset': [0, 1],
      'text-size': 11,
    },
    paint: text_paint,
  },
  {
    zorder: 502,
    id: 'petroleum_well_label',
    type: 'symbol',
    source: 'openinframap',
    'source-layer': 'petroleum_well',
    minzoom: 13,
    layout: {
      'text-field': 'Well {name}',
      'text-anchor': 'top',
      'text-offset': [0, 0.5],
      'text-size': 10,
    },
    paint: text_paint,
  },
];

export default layers;
