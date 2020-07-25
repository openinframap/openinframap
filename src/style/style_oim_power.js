import {text_paint, underground_p} from './style_oim_common.js';
// OpenInfraMap layers

const voltage_scale = [
  [null, '#7A7A85'],
  [10, '#6E97B8'],
  [25, '#55B555'],
  [52, '#B59F10'],
  [132, '#B55D00'],
  [220, '#C73030'],
  [330, '#B54EB2'],
  [550, '#00C1CF'],
];

const special_voltages = {
  HVDC: '#4E01B5',
  'Traction (<50 Hz)': '#A8B596',
};

const plant_types = {
  coal: 'power_plant_coal',
  geothermal: 'power_plant_geothermal',
  hydro: 'power_plant_hydro',
  nuclear: 'power_plant_nuclear',
  oil: 'power_plant_oilgas',
  gas: 'power_plant_oilgas',
  solar: 'power_plant_solar',
  wind: 'power_plant_wind',
  biomass: 'power_plant_biomass',
  waste: 'power_plant_waste',
  battery: 'power_plant_battery',
};

// === Frequency predicates
const traction_freq_p = [
  'all',
  ['has', 'frequency'],
  ['!=', ['get', 'frequency'], ''],
  ['!=', ['to-number', ['get', 'frequency']], 50],
  ['!=', ['to-number', ['get', 'frequency']], 60],
];

const hvdc_p = [
  'all',
  ['has', 'frequency'],
  ['!=', ['get', 'frequency'], ''],
  ['==', ['to-number', ['get', 'frequency']], 0],
];

// Stepwise function to assign colour by voltage:
function voltage_color(field) {
  let voltage_func = ['step', ['coalesce', ['get', field], 0]];
  for (let row of voltage_scale) {
    if (row[0] == null) {
      voltage_func.push(row[1]);
      continue;
    }
    voltage_func.push(row[0] - 0.01);
    voltage_func.push(row[1]);
  }

  return [
    'case',
    hvdc_p,
    special_voltages['HVDC'], // HVDC (frequency == 0)
    traction_freq_p,
    special_voltages['Traction (<50 Hz)'], // Traction power
    voltage_func,
  ];
}

const multi_voltage_min_zoom = 10;

// Generate an expression to determine the offset of a power line
// segment with multiple voltages
function voltage_offset(index) {
  const spacing = 7;

  let offset = (index - 1) * spacing;
  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    multi_voltage_min_zoom,
    [
      'case',
      ['has', 'voltage_3'],
      (offset - spacing) * 0.5,
      ['has', 'voltage_2'],
      (offset - spacing / 2) * 0.5,
      0,
    ],
    13,
    [
      'case',
      ['has', 'voltage_3'],
      offset - spacing,
      ['has', 'voltage_2'],
      offset - spacing / 2,
      0,
    ],
  ];
}

// Function to assign power line thickness.
// Interpolate first by zoom level and then by voltage.
const voltage_line_thickness = [
  'interpolate',
  ['linear'],
  ['zoom'],
  2,
  0.5,
  10,
  [
    'match',
    ['get', 'line'],
    'bay',
    1,
    'busbar',
    1,
    [
      'interpolate',
      ['linear'],
      ['coalesce', ['get', 'voltage'], 0],
      0,
      1,
      100,
      1.8,
      800,
      4,
    ],
  ],
];

const label_offset = {
  stops: [[8, [0, 3]], [13, [0, 1]]],
};

// Determine substation visibility
const substation_visible_p = [
  'all',
  [
    'any',
    ['>', ['coalesce', ['get', 'voltage'], 0], 399],
    [
      'all',
      ['>', ['coalesce', ['get', 'voltage'], 0], 200],
      ['>', ['zoom'], 6],
    ],
    [
      'all',
      ['>', ['coalesce', ['get', 'voltage'], 0], 100],
      ['>', ['zoom'], 7],
    ],
    ['all', ['>', ['coalesce', ['get', 'voltage'], 0], 25], ['>', ['zoom'], 9]],
    ['all', ['>', ['coalesce', ['get', 'voltage'], 0], 9], ['>', ['zoom'], 10]],
    ['>', ['zoom'], 11],
  ],
  ['!=', ['get', 'substation'], 'transition'],
];

const substation_radius = [
  'interpolate',
  ['linear'],
  ['zoom'],
  5,
  1,
  12,
  [
    'interpolate',
    ['linear'],
    ['coalesce', ['get', 'voltage'], 0],
    0,
    3,
    300,
    7,
    600,
    9,
  ],
];

// Determine the minimum zoom a point is visible at (before it can be seen as an
// area), based on the area of the substation.
const substation_point_visible_p = [
  'any',
  ['==', ['coalesce', ['get', 'area'], 0], 0], // Area = 0 - mapped as node
  ['all', ['<', ['coalesce', ['get', 'area'], 0], 100], ['<', ['zoom'], 16]],
  ['all', ['<', ['coalesce', ['get', 'area'], 0], 250], ['<', ['zoom'], 15]],
  ['<', ['zoom'], 13],
];

const substation_label_visible_p = [
  'all',
  [
    'any',
    ['>', ['coalesce', ['get', 'voltage'], 0], 399],
    [
      'all',
      ['>', ['coalesce', ['get', 'voltage'], 0], 200],
      ['>', ['zoom'], 8],
    ],
    [
      'all',
      ['>', ['coalesce', ['get', 'voltage'], 0], 100],
      ['>', ['zoom'], 10],
    ],
    [
      'all',
      ['>', ['coalesce', ['get', 'voltage'], 0], 50],
      ['>', ['zoom'], 12],
    ],
    ['>', ['zoom'], 13],
  ],
  ['!=', ['get', 'substation'], 'transition'],
];

// Power line / substation visibility
const power_visible_p = [
  'all',
  [
    'any',
    ['>', ['coalesce', ['get', 'voltage'], 0], 199],
    ['all', ['>', ['coalesce', ['get', 'voltage'], 0], 99], ['>', ['zoom'], 4]],
    ['all', ['>', ['coalesce', ['get', 'voltage'], 0], 49], ['>', ['zoom'], 5]],
    ['all', ['>', ['coalesce', ['get', 'voltage'], 0], 24], ['>', ['zoom'], 6]],
    ['all', ['>', ['coalesce', ['get', 'voltage'], 0], 9], ['>', ['zoom'], 7]],
    ['>', ['zoom'], 10],
  ],
  [
    'any',
    ['all', ['!=', ['get', 'line'], 'busbar'], ['!=', ['get', 'line'], 'bay']],
    ['>', ['zoom'], 12],
  ],
];

// Power line ref visibility
const power_ref_visible_p = [
  'all',
  [
    'any',
    [
      'all',
      ['>', ['coalesce', ['get', 'voltage'], 0], 330],
      ['>', ['zoom'], 7],
    ],
    [
      'all',
      ['>', ['coalesce', ['get', 'voltage'], 0], 200],
      ['>', ['zoom'], 8],
    ],
    [
      'all',
      ['>', ['coalesce', ['get', 'voltage'], 0], 100],
      ['>', ['zoom'], 9],
    ],
    ['>', ['zoom'], 10],
  ],
  [
    'any',
    ['all', ['!=', ['get', 'line'], 'busbar'], ['!=', ['get', 'line'], 'bay']],
    ['>', ['zoom'], 12],
  ],
];

const plant_label_visible_p = [
  'any',
  ['>', ['coalesce', ['get', 'output'], 0], 1000],
  ['all', ['>', ['coalesce', ['get', 'output'], 0], 750], ['>', ['zoom'], 5]],
  ['all', ['>', ['coalesce', ['get', 'output'], 0], 250], ['>', ['zoom'], 6]],
  ['all', ['>', ['coalesce', ['get', 'output'], 0], 100], ['>', ['zoom'], 7]],
  ['all', ['>', ['coalesce', ['get', 'output'], 0], 10], ['>', ['zoom'], 9]],
  ['>', ['zoom'], 10],
];

const plant_label = [
  'case',
  ['all', ['!', ['has', 'name']], ['has', 'output']],
  ['concat', ['get', 'output'], ' MW'],
  ['has', 'output'],
  ['concat', ['get', 'name'], ' \n', ['get', 'output'], ' MW'],
  ['get', 'name'],
];

function plant_image() {
  let expr = ['match', ['get', 'source']];
  for (const [key, value] of Object.entries(plant_types)) {
    expr.push(key, value);
  }
  expr.push('power_plant'); // default
  return expr;
}

const construction_p = ['get', 'construction'];

const construction_opacity = ['case', construction_p, 0.3, 1];

const construction_label = [
  'case',
  construction_p,
  ' (under construction) ',
  '',
];

const freq = [
  'case',
  hvdc_p,
  ' DC',
  traction_freq_p,
  ['concat', ' ', ['get', 'frequency'], ' Hz'],
  '',
];

const circuits = [
  'case',
  ['all', ['has', 'circuits'], ['>', ['to-number', ['get', 'circuits']], 1]],
  ['concat', ['get', 'circuits'], '×'],
  '',
];

const line_voltage = [
  'case',
  [
    'all',
    ['has', 'voltage_3'],
    ['!=', ['get', 'voltage_3'], ['get', 'voltage_2']],
  ],
  [
    'concat',
    ['get', 'voltage'],
    '/',
    ['get', 'voltage_2'],
    '/',
    ['get', 'voltage_3'],
    ' kV',
  ],
  [
    'all',
    ['has', 'voltage_2'],
    ['!=', ['get', 'voltage_2'], ['get', 'voltage']],
  ],
  ['concat', ['get', 'voltage'], '/', ['get', 'voltage_2'], ' kV'],
  ['has', 'voltage'],
  ['concat', ['get', 'voltage'], ' kV'],
  '',
];

const line_label = [
  'case',
  ['all', ['has', 'voltage'], ['!=', ['get', 'name'], '']],
  [
    'concat',
    ['get', 'name'],
    ' (',
    line_voltage,
    freq,
    ')',
    construction_label,
  ],
  ['has', 'voltage'],
  ['concat', circuits, line_voltage, freq, construction_label],
  ['get', 'name'],
];

const substation_label_detail = [
  'case',
  ['all', ['!=', ['get', 'name'], ''], ['has', 'voltage']],
  [
    'concat',
    ['get', 'name'],
    ' ',
    ['get', 'voltage'],
    ' kV',
    freq,
    construction_label,
  ],
  ['all', ['==', ['get', 'name'], ''], ['has', 'voltage']],
  [
    'concat',
    'Substation ',
    ['get', 'voltage'],
    ' kV',
    freq,
    construction_label,
  ],
  ['get', 'name'],
];

const substation_label = [
  'step',
  ['zoom'],
  ['get', 'name'],
  12,
  substation_label_detail,
];

const layers = [
  {
    zorder: 60,
    id: 'power_line_case',
    type: 'line',
    source: 'openinframap',
    'source-layer': 'power_line',
    filter: ['==', ['get', 'tunnel'], true],
    minzoom: 12,
    paint: {
      'line-opacity': ['case', construction_p, 0.2, 0.4],
      'line-color': '#7C4544',
      'line-width': ['interpolate', ['linear'], ['zoom'], 12, 4, 18, 10],
    },
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },
  },
  {
    zorder: 61,
    id: 'power_line_underground_1',
    type: 'line',
    filter: ['all', underground_p, power_visible_p],
    source: 'openinframap',
    'source-layer': 'power_line',
    minzoom: 0,
    paint: {
      'line-color': voltage_color('voltage'),
      'line-width': voltage_line_thickness,
      'line-dasharray': [3, 2],
      'line-offset': voltage_offset(1),
      'line-opacity': construction_opacity,
    },
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },
  },
  {
    zorder: 61,
    id: 'power_line_underground_2',
    type: 'line',
    filter: ['all', underground_p, power_visible_p, ['has', 'voltage_2']],
    source: 'openinframap',
    'source-layer': 'power_line',
    minzoom: multi_voltage_min_zoom,
    paint: {
      'line-color': voltage_color('voltage_2'),
      'line-width': voltage_line_thickness,
      'line-dasharray': [3, 2],
      'line-offset': voltage_offset(2),
      'line-opacity': construction_opacity,
    },
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },
  },
  {
    zorder: 61,
    id: 'power_line_underground_3',
    type: 'line',
    filter: ['all', underground_p, power_visible_p, ['has', 'voltage_3']],
    source: 'openinframap',
    'source-layer': 'power_line',
    minzoom: multi_voltage_min_zoom,
    paint: {
      'line-color': voltage_color('voltage_3'),
      'line-width': voltage_line_thickness,
      'line-dasharray': [3, 2],
      'line-offset': voltage_offset(3),
      'line-opacity': construction_opacity,
    },
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },
  },
  {
    zorder: 160,
    id: 'power_plant',
    type: 'fill',
    source: 'openinframap',
    minzoom: 11,
    'source-layer': 'power_plant',
    paint: {
      'fill-opacity': 0.3,
      'fill-outline-color': 'rgba(0, 0, 0, 1)',
    },
  },
  {
    zorder: 161,
    id: 'power_substation',
    type: 'fill',
    filter: substation_visible_p,
    source: 'openinframap',
    'source-layer': 'power_substation',
    minzoom: 13,
    paint: {
      'fill-opacity': 0.3,
      'fill-color': voltage_color('voltage'),
      'fill-outline-color': 'rgba(0, 0, 0, 1)',
    },
  },
  {
    zorder: 162,
    id: 'power_solar_panel',
    type: 'fill',
    source: 'openinframap',
    'source-layer': 'power_generator_area',
    filter: ['==', ['get', 'source'], 'solar'],
    minzoom: 13,
    paint: {
      'fill-color': '#726BA9',
      'fill-outline-color': 'rgba(50, 50, 50, 1)',
    },
  },
  {
    zorder: 260,
    id: 'power_line_1',
    type: 'line',
    source: 'openinframap',
    'source-layer': 'power_line',
    filter: ['all', ['!', underground_p], power_visible_p],
    minzoom: 0,
    paint: {
      'line-color': voltage_color('voltage'),
      'line-width': voltage_line_thickness,
      'line-offset': voltage_offset(1),
      'line-opacity': construction_opacity,
    },
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },
  },
  {
    zorder: 260,
    id: 'power_line_2',
    type: 'line',
    source: 'openinframap',
    'source-layer': 'power_line',
    filter: [
      'all',
      ['!', underground_p],
      power_visible_p,
      ['has', 'voltage_2'],
    ],
    minzoom: multi_voltage_min_zoom,
    paint: {
      'line-color': voltage_color('voltage_2'),
      'line-width': voltage_line_thickness,
      'line-offset': voltage_offset(2),
      'line-opacity': construction_opacity,
    },
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },
  },
  {
    zorder: 260,
    id: 'power_line_3',
    type: 'line',
    source: 'openinframap',
    'source-layer': 'power_line',
    filter: [
      'all',
      ['!', underground_p],
      power_visible_p,
      ['has', 'voltage_3'],
    ],
    minzoom: multi_voltage_min_zoom,
    paint: {
      'line-color': voltage_color('voltage_3'),
      'line-width': voltage_line_thickness,
      'line-offset': voltage_offset(3),
      'line-opacity': construction_opacity,
    },
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },
  },
  {
    zorder: 261,
    id: 'power_transformer',
    type: 'symbol',
    source: 'openinframap',
    'source-layer': 'power_transformer',
    minzoom: 14,
    paint: text_paint,
    layout: {
      'icon-image': 'power_transformer',
    },
  },
  {
    zorder: 262,
    id: 'power_compensator',
    type: 'symbol',
    source: 'openinframap',
    'source-layer': 'power_compensator',
    minzoom: 14,
    paint: text_paint,
    layout: {
      'icon-image': 'power_compensator',
    },
  },
  {
    zorder: 263,
    id: 'power_switch',
    type: 'symbol',
    source: 'openinframap',
    'source-layer': 'power_switch',
    minzoom: 14,
    paint: text_paint,
    layout: {
      'icon-image': 'power_switch',
    },
  },
  {
    zorder: 264,
    id: 'power_tower',
    type: 'symbol',
    filter: ['==', ['get', 'type'], 'tower'],
    source: 'openinframap',
    'source-layer': 'power_tower',
    minzoom: 13,
    paint: text_paint,
    layout: {
      'icon-image': [
        'case',
        ['get', 'transition'],
        'power_tower_transition',
        'power_tower',
      ],
      'icon-size': ['interpolate', ['linear'], ['zoom'], 13, 0.4, 17, 1],
      'text-field': '{ref}',
      'text-size': [
        'step',
        // Set visibility by using size
        ['zoom'],
        0,
        14,
        10,
      ],
      'text-offset': [0, 1.5],
      'text-max-angle': 10,
    },
  },
  {
    zorder: 265,
    id: 'power_pole',
    type: 'symbol',
    filter: ['==', ['get', 'type'], 'pole'],
    source: 'openinframap',
    'source-layer': 'power_tower',
    minzoom: 14,
    paint: text_paint,
    layout: {
      'icon-image': [
        'case',
        ['get', 'transition'],
        'power_pole_transition',
        'power_pole',
      ],
      'icon-size': 0.5,
      'text-field': '{ref}',
      'text-size': [
        'step',
        // Set visibility by using size
        ['zoom'],
        0,
        14,
        10,
      ],
      'text-offset': [0, 1],
      'text-max-angle': 10,
    },
  },
  {
    zorder: 266,
    id: 'power_wind_turbine',
    type: 'symbol',
    source: 'openinframap',
    'source-layer': 'power_generator',
    filter: ['==', ['get', 'source'], 'wind'],
    minzoom: 11,
    paint: text_paint,
    layout: {
      'icon-image': 'power_wind',
      'icon-anchor': 'bottom',
      'icon-size': ['interpolate', ['linear'], ['zoom'], 11, 0.5, 14, 1],
      'text-field': '{name}',
      'text-size': ['step', ['zoom'], 0, 12, 9],
      'text-offset': [0, 1],
      'text-anchor': 'top',
    },
  },
  {
    zorder: 267,
    id: 'power_wind_turbine_point',
    type: 'circle',
    source: 'openinframap',
    'source-layer': 'power_generator',
    //['all',
    filter: ['==', ['get', 'source'], 'wind'],
    //      ['has', 'output'],
    //      ['>', ['get', 'output'], 1]
    //    ],
    minzoom: 9,
    maxzoom: 11,
    paint: {
      'circle-radius': 1.5,
      'circle-color': '#444444',
    },
  },
  {
    zorder: 268,
    id: 'power_substation_point',
    type: 'circle',
    filter: ['all', substation_visible_p, substation_point_visible_p],
    source: 'openinframap',
    'source-layer': 'power_substation_point',
    minzoom: 5,
    layout: {},
    paint: {
      'circle-radius': substation_radius,
      'circle-color': voltage_color('voltage'),
      'circle-stroke-color': '#333',
      'circle-stroke-width': [
        'interpolate',
        ['linear'],
        ['zoom'],
        5,
        0,
        6,
        0.1,
        8,
        0.5,
        15,
        1,
      ],
      'circle-opacity': construction_opacity,
      'circle-stroke-opacity': construction_opacity,
    },
  },
  {
    zorder: 560,
    id: 'power_line_ref',
    type: 'symbol',
    filter: [
      'all',
      power_ref_visible_p,
      ['!=', ['coalesce', ['get', 'ref'], ''], ''],
      ['<', ['length', ['get', 'ref']], 5],
    ],
    source: 'openinframap',
    'source-layer': 'power_line',
    minzoom: 7,
    layout: {
      'icon-image': 'power_line_ref',
      'text-field': '{ref}',
      'symbol-placement': 'line-center',
      'text-size': 10,
      'text-max-angle': 10,
    },
  },
  {
    zorder: 561,
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
      'text-offset': [
        'case',
        ['has', 'voltage_3'],
        ['literal', [0, 1.5]],
        ['has', 'voltage_2'],
        ['literal', [0, 1.25]],
        ['literal', [0, 1]],
      ],
      'text-max-angle': 10,
    },
  },
  {
    zorder: 562,
    id: 'power_substation_ref_label',
    type: 'symbol',
    source: 'openinframap',
    'source-layer': 'power_substation_point',
    minzoom: 14.5,
    layout: {
      'symbol-z-order': 'source',
      'text-field': '{ref}',
      'text-anchor': 'bottom',
      'text-offset': [0, -0.5],
      'text-size': ['interpolate', ['linear'], ['zoom'], 14, 9, 18, 12],
      'text-max-width': 8,
    },
    paint: text_paint,
  },
  {
    zorder: 562,
    id: 'power_substation_label',
    type: 'symbol',
    source: 'openinframap',
    filter: substation_label_visible_p,
    'source-layer': 'power_substation_point',
    minzoom: 8,
    maxzoom: 24,
    layout: {
      'symbol-sort-key': ['-', 10000, ['get', 'voltage']],
      'symbol-z-order': 'source',
      'text-field': substation_label,
      'text-anchor': 'top',
      'text-offset': [0, 0.5],
      'text-size': [
        'interpolate',
        ['linear'],
        ['zoom'],
        8,
        10,
        18,
        [
          'interpolate',
          ['linear'],
          ['coalesce', ['get', 'voltage'], 0],
          0,
          10,
          400,
          16,
        ],
      ],
      'text-max-width': 8,
    },
    paint: text_paint,
  },
  {
    zorder: 563,
    id: 'power_plant_label',
    type: 'symbol',
    source: 'openinframap',
    filter: plant_label_visible_p,
    'source-layer': 'power_plant_point',
    minzoom: 6,
    maxzoom: 24,
    layout: {
      'symbol-sort-key': ['-', 10000, ['get', 'output']],
      'symbol-z-order': 'source',
      'icon-allow-overlap': true,
      'icon-image': plant_image(),
      'icon-size': ['interpolate', ['linear'], ['zoom'], 6, 0.6, 10, 0.8],
      'text-field': plant_label,
      'text-anchor': 'top',
      'text-offset': [0, 1],
      'text-size': [
        'interpolate',
        ['linear'],
        ['zoom'],
        7,
        10,
        18,
        [
          'interpolate',
          ['linear'],
          ['coalesce', ['get', 'output'], 0],
          0,
          10,
          2000,
          16,
        ],
      ],
      'text-optional': true,
    },
    paint: Object.assign({}, text_paint, {
      // Control visibility using the opacity property...
      'icon-opacity': ['step', ['zoom'], 1, 11, 0],
      'text-opacity': ['step', ['zoom'], 0, 7, 1],
    }),
  },
];

export {layers as default, voltage_scale, special_voltages, plant_types};
