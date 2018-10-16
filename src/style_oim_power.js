import {text_paint} from './style_oim_common.js';
// OpenInfraMap layers

// Stepwise function to assign colour by voltage:
const voltage_color = ["match", 
  ['string', ['coalesce', ['get', 'frequency'], '50']], 
  '0', '#4E01B5', // HVDC (frequency == 0)
  ['step',
    ["coalesce", ['get', 'voltage'], 0],
    '#7A7A85',
    9.9, '#6E97B8',
    24.9, '#55B555',
    49.9, '#B59F10',
    99.9, '#B55D00',
    199.9, '#C11A3F',
    299.9, '#B500B1'
  ]
]

// Function to assign power line thickness.
// Interpolate first by zoom level and then by voltage.
const voltage_line_thickness = [
  'interpolate',
  ['linear'],
  ['zoom'],
  2, 0.5,
  10, ["match",
        ["get", "line"],
        "bay", 1,
        "busbar", 1,
        ['interpolate', 
          ['linear'], 
          ["coalesce", ['get', 'voltage'], 0],
          0, 1,
          500, 4
        ]
  ]
];

const label_offset = {
  'stops': [
    [8, [0, 3]],
    [13, [0, 1]]
  ]
}

// Expression to match undergound/underwater
const underground_p = ["any", 
  ['==', ['get', 'location'], 'underground'],
  ['==', ['get', 'location'], 'underwater'],
  ['==', ['get', 'tunnel'], true]
]

// Determine substation visibility
const substation_visible_p = ["all", 
  ["any",
    [">", ['coalesce', ['get', 'voltage'], 0], 200],
    ['all',
      [">", ['coalesce', ['get', 'voltage'], 0], 100],
      [">", ['zoom'], 8]
    ],
    ['all',
      [">", ['coalesce', ['get', 'voltage'], 0], 19],
      [">", ['zoom'], 9]
    ],
    ['all',
      [">", ['coalesce', ['get', 'voltage'], 0], 9],
      [">", ['zoom'], 10]
    ],
    [">", ['zoom'], 11]
  ],
  ["!=", ['get', 'substation'], 'transition']
];

const substation_radius = [
  'interpolate',
  ['linear'],
  ['zoom'],
  7, 4,
  12, ['interpolate',
        ['linear'],
        ["coalesce", ['get', 'voltage'], 0],
        0, 2,
        300, 7
      ]
]

const substation_label_visible_p = ["all",
  ["any",
    [">", ['coalesce', ['get', 'voltage'], 0], 300],
    ['all',
      [">", ['coalesce', ['get', 'voltage'], 0], 200],
      [">", ['zoom'], 8]
    ],
    ['all',
      [">", ['coalesce', ['get', 'voltage'], 0], 100],
      [">", ['zoom'], 10]
    ],
    ['all',
      [">", ['coalesce', ['get', 'voltage'], 0], 50],
      [">", ['zoom'], 12]
    ],
    [">", ['zoom'], 13]
  ],
  ["!=", ['get', 'substation'], 'transition']
];


// Power line visibility
const power_visible_p = ["all",
  ["any",
    [">", ['coalesce', ['get', 'voltage'], 0], 199],
    ['all',
      [">", ['coalesce', ['get', 'voltage'], 0], 99],
      [">", ['zoom'], 4]
    ],
    ['all',
      [">", ['coalesce', ['get', 'voltage'], 0], 49],
      [">", ['zoom'], 5]
    ],
    ['all',
      [">", ['coalesce', ['get', 'voltage'], 0], 24],
      [">", ['zoom'], 6]
    ],
    ['all',
      [">", ['coalesce', ['get', 'voltage'], 0], 9],
      [">", ['zoom'], 7]
    ],
    [">", ['zoom'], 10]
  ],
  ["any",
    ['all', 
      ["!=", ['get', 'line'], 'busbar'],
      ["!=", ['get', 'line'], 'bay'],
    ],
    [">", ['zoom'], 12]
  ]
];


const plant_label_visible_p = ["any",
  [">", ['coalesce', ['get', 'output'], 0], 1000],
  ['all',
    [">", ['coalesce', ['get', 'output'], 0], 500],
    [">", ['zoom'], 7]
  ],
  ['all',
    [">", ['coalesce', ['get', 'output'], 0], 250],
    [">", ['zoom'], 8]
  ],
  ['all',
    [">", ['coalesce', ['get', 'output'], 0], 100],
    [">", ['zoom'], 9]
  ],
  [">", ['zoom'], 10]
];

const plant_image = ["match",
    ['get', 'source'],
    'coal', 'power_plant_coal',
    'geothermal', 'power_plant_geothermal',
    'hydro', 'power_plant_hydro',
    'nuclear', 'power_plant_nuclear',
    'oil', 'power_plant_oilgas',
    'gas', 'power_plant_oilgas',
    'solar', 'power_plant_solar',
    'wind', 'power_plant_wind',
    'power_plant'
];


const freq = ["case", 
  ["all", 
    ["!=", ["get", "frequency"], ''],
    ["==", ["to-number", ["get", "frequency"]], 0]
  ],
  " DC",
  ["all", 
    ["!=", ["get", "frequency"], ''],
    ["!=", ["to-number", ["get", "frequency"]], 50],
    ["!=", ["to-number", ["get", "frequency"]], 60]
  ],
  ["concat", " ", ["get", "frequency"], " Hz"],
  ""
];


const line_label = ["case",
  ["all", ["has", "voltage"], ["!=", ["get", "name"], ""]],
    ["concat", ["get", "name"], " (", ["get", "voltage"], " kV", freq, ")"],
  ["has", "voltage"],
    ["concat", ["get", "voltage"], " kV", freq],
  ["get", "name"]
];


// TODO: frequency would be nice here but it's not in the DB.
const substation_label = ["step",
  ["zoom"],
  ["get", "name"],
  12, ["case",
    ['all', ['!=', ['get', 'name'], ''], ["has", "voltage"]],
      ["concat", ["get", "name"], " (", ["get", "voltage"], " kV)"],
    ['all', ['==', ['get', 'name'], ''], ['has', 'voltage']],
      ["concat", "Substation (", ["get", "voltage"], " kV)"],
    ["get", "name"]
  ]
];

const layers = [
  {
    id: 'power_line_case',
    type: 'line',
    source: 'openinframap',
    'source-layer': 'power_line',
    filter: ['==', ['get', 'tunnel'], true],
    minzoom: 12,
    paint: {
      'line-opacity': 0.6,
      'line-color': '#7C4544',
      'line-width': 8,
    },
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    }
  },
  {
    id: 'power_line_underground',
    type: 'line',
    filter: ['all', underground_p, power_visible_p],
    source: 'openinframap',
    'source-layer': 'power_line',
    minzoom: 0,
    paint: {
      'line-color': voltage_color,
      'line-width': voltage_line_thickness,
      'line-dasharray': [3, 2]
    },
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    }
  },
  {
    id: 'power_plant',
    type: 'fill',
    source: 'openinframap',
    minzoom: 5,
    'source-layer': 'power_plant',
    paint: {
      'fill-opacity': 0.3,
      'fill-outline-color': 'rgba(0, 0, 0, 1)',
    },
  },
  {
    id: 'power_substation',
    type: 'fill',
    filter: substation_visible_p,
    source: 'openinframap',
    'source-layer': 'power_substation',
    minzoom: 12,
    paint: {
      'fill-opacity': 0.3,
      'fill-color': voltage_color,
      'fill-outline-color': 'rgba(0, 0, 0, 1)',
    },
  },
  {
    id: 'power_line',
    type: 'line',
    source: 'openinframap',
    'source-layer': 'power_line',
    filter: ['all', ['!', underground_p], power_visible_p],
    minzoom: 0,
    paint: {
      'line-color': voltage_color,
      'line-width': voltage_line_thickness,
    },
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    }
  },
  {
    id: 'power_transformer',
    type: 'symbol',
    source: 'openinframap',
    'source-layer': 'power_transformer',
    minzoom: 14,
    paint: text_paint,
    layout: {
      'icon-image': 'power_transformer',
    }
  },
  {
    id: 'power_compensator',
    type: 'symbol',
    source: 'openinframap',
    'source-layer': 'power_compensator',
    minzoom: 14,
    paint: text_paint,
    layout: {
      'icon-image': 'power_compensator',
    }
  },
  {
    id: 'power_switch',
    type: 'symbol',
    source: 'openinframap',
    'source-layer': 'power_switch',
    minzoom: 14,
    paint: text_paint,
    layout: {
      'icon-image': 'power_switch',
    }
  },
  {
    id: 'power_tower',
    type: 'symbol',
    filter: ['==', ['get', 'type'], 'tower'],
    source: 'openinframap',
    'source-layer': 'power_tower',
    minzoom: 13,
    paint: text_paint,
    layout: {
      'icon-image': 'power_tower',
      'icon-size': ["interpolate", ["linear"], ["zoom"],
        13, 0.5,
        17, 1
      ],
      'text-field': '{ref}',
      'text-size': ["step", 
        // Set visibility by using size
        ["zoom"],
        0,
        14, 10
      ],
      'text-offset': [0, 1],
      'text-max-angle': 10
    }
  },
  {
    id: 'power_pole',
    type: 'symbol',
    filter: ['==', ['get', 'type'], 'pole'],
    source: 'openinframap',
    'source-layer': 'power_tower',
    minzoom: 14,
    paint: text_paint,
    layout: {
      'icon-image': 'power_pole',
      'icon-size': 0.5,
      'text-field': '{ref}',
      'text-size': ["step", 
        // Set visibility by using size
        ["zoom"],
        0,
        14, 10
      ],
      'text-offset': [0, 1],
      'text-max-angle': 10
    }
  },
  {
    id: 'power_wind_turbine',
    type: 'symbol',
    source: 'openinframap',
    'source-layer': 'power_generator',
    filter: ['==', ['get', 'source'], 'wind'],
    minzoom: 11,
    paint: text_paint,
    layout: {
      'icon-image': 'power_wind',
    }
  },
  {
    id: 'power_substation_point',
    type: 'circle',
    filter: substation_visible_p,
    source: 'openinframap',
    'source-layer': 'power_substation_point',
    minzoom: 7,
    maxzoom: 13,
    layout: {},
    paint: {
      'circle-radius': substation_radius,
      'circle-color': voltage_color,
      'circle-stroke-width': 1
    },
  },
  {
    id: 'power_substation_point_map',
    type: 'circle',
    filter: ['==', ['geometry-type'], 'point'],
    source: 'openinframap',
    'source-layer': 'power_substation',
    minzoom: 13,
    layout: {},
    paint: {
      'circle-radius': 4,
      'circle-color': voltage_color,
      'circle-stroke-width': 1
    },
  },
  {
    id: 'power_substation_label',
    type: 'symbol',
    source: 'openinframap',
    filter: substation_label_visible_p,
    'source-layer': 'power_substation_point',
    minzoom: 8,
    maxzoom: 24,
    layout: {
      'text-field': substation_label,
      'text-anchor': 'top',
      'text-offset': [0, 1],
      'text-size': 12,
    },
    paint: text_paint,
  },
  {
    id: 'power_plant_label',
    type: 'symbol',
    source: 'openinframap',
    filter: plant_label_visible_p,
    'source-layer': 'power_plant_point',
    minzoom: 6,
    maxzoom: 24,
    layout: {
      'icon-image': plant_image,
      'icon-size': 0.8,
      'text-field': ['case',
        ['has', 'output'], ['concat', ['get', 'name'], ' \n(', ['get', 'output'], ' MW)'],
        ['get', 'name'],
      ],
      'text-anchor': 'top',
      'text-offset': [0, 1],
      'text-size': 12,
      'text-optional': true,
    },
    paint: Object.assign({}, text_paint, {
      // Control visibility using the opacity property...
      'icon-opacity': ["step", 
                  ["zoom"],
                  1,
                  11, 0
                ],
    }),
  },
  {
    id: 'power_line_ref',
    type: 'symbol',
    filter: ['all', 
      power_visible_p,
      ['!=', ['coalesce', ['get', 'ref'], ''], ''],
      ['<', ['length', ['get', 'ref']], 5]
    ],
    source: 'openinframap',
    'source-layer': 'power_line',
    minzoom: 10,
    layout: {
      'icon-image': 'power_line_ref',
      'text-field': '{ref}',
      'symbol-placement': 'line-center',
      'text-size': 10,
      'text-max-angle': 10
    }
  },
  {
    id: 'power_line_label',
    type: 'symbol',
    filter: ['all', power_visible_p],
    source: 'openinframap',
    'source-layer': 'power_line',
    minzoom: 11,
    paint: text_paint,
    layout: {
      'text-field': line_label,
      'symbol-placement': 'line',
      'symbol-spacing': 400,
      'text-size': 10,
      'text-offset': [0, 1],
      'text-max-angle': 10
    }
  },
];

export default layers;
