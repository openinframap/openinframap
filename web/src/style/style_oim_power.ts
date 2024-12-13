import { t } from 'i18next'
import { text_paint, underground_p, font, get_local_name, oimSymbol } from './common.js'
import {
  all,
  has,
  get,
  interpolate,
  coalesce,
  match,
  case_,
  any,
  zoom,
  concat,
  step,
  round,
  literal,
  if_,
  not,
  rgb
} from './stylehelpers.ts'
import { LayerSpecificationWithZIndex } from './types.ts'
import { DataDrivenPropertyValueSpecification, ExpressionSpecification } from 'maplibre-gl'

export const voltage_scale: [number | null, string][] = [
  [null, '#7A7A85'],
  [10, '#6E97B8'],
  [25, '#55B555'],
  [52, '#B59F10'],
  [132, '#B55D00'],
  [220, '#C73030'],
  [310, '#B54EB2'],
  [550, '#00C1CF']
]

export const special_voltages = {
  hvdc: '#4E01B5',
  traction: '#A8B596'
}

export const plant_types = {
  coal: 'power_plant_coal',
  geothermal: 'power_plant_geothermal',
  hydro: 'power_plant_hydro',
  nuclear: 'power_plant_nuclear',
  oil: 'power_plant_oilgas',
  gas: 'power_plant_oilgas',
  diesel: 'power_plant_oilgas',
  solar: 'power_plant_solar',
  wind: 'power_plant_wind',
  biomass: 'power_plant_biomass',
  waste: 'power_plant_waste',
  battery: 'power_plant_battery'
}

// === Frequency predicates
const traction_freq_p: ExpressionSpecification = all(
  has('frequency'),
  ['!=', get('frequency'), ''],
  ['!=', ['to-number', get('frequency')], 50],
  ['!=', ['to-number', get('frequency')], 60]
)

const hvdc_p: ExpressionSpecification = all(
  has('frequency'),
  ['!=', get('frequency'), ''],
  ['==', ['to-number', get('frequency')], 0]
)

// Stepwise function to assign colour by voltage:
function voltage_color(field: string): DataDrivenPropertyValueSpecification<string> {
  const voltage_func: any = ['step', ['to-number', coalesce(get(field), 0)]]
  for (const row of voltage_scale) {
    if (row[0] == null) {
      voltage_func.push(row[1])
      continue
    }
    voltage_func.push(row[0] - 0.01)
    voltage_func.push(row[1])
  }

  return case_(
    [
      [hvdc_p, special_voltages.hvdc], // HVDC (frequency == 0)
      [traction_freq_p, special_voltages.traction] // Traction power
    ],
    voltage_func as ExpressionSpecification
  )
}

const multi_voltage_min_zoom = 10

// Generate an expression to determine the offset of a power line
// segment with multiple voltages
function voltage_offset(index: number): DataDrivenPropertyValueSpecification<number> {
  const spacing = 14

  const offset = (index - 1) * spacing
  return interpolate(zoom, [
    [multi_voltage_min_zoom - 0.001, 0],
    [
      multi_voltage_min_zoom,
      case_(
        [
          [has('voltage_3'), (offset - spacing) * 0.3],
          [has('voltage_2'), (offset - spacing / 2) * 0.3]
        ],
        0
      )
    ],
    [
      21,
      case_(
        [
          [has('voltage_3'), offset - spacing],
          [has('voltage_2'), offset - spacing / 2]
        ],
        0
      )
    ]
  ])
}

// Function to assign power line thickness.
// Interpolate first by zoom level and then by voltage.
const voltage_line_thickness: ExpressionSpecification = interpolate(
  zoom,
  [
    [1, 0.5],
    [
      21,
      match(
        get('line'),
        [
          ['bay', 1],
          ['busbar', 1]
        ],
        interpolate(coalesce(get('voltage'), 0), [
          [0, 1.5],
          [20, 2],
          [30, 4],
          [100, 6],
          [500, 9]
        ])
      )
    ]
  ],
  1.1
)

const voltage: ExpressionSpecification = ['to-number', coalesce(get('voltage'), 0)]
const output: ExpressionSpecification = ['to-number', coalesce(get('output'), 0)]
const area: ExpressionSpecification = ['to-number', coalesce(get('area'), 0)]

// Determine substation visibility
const substation_visible_p: ExpressionSpecification = all(
  any(
    ['>', voltage, 200],
    all(['>', voltage, 200], ['>', zoom, 6]),
    all(['>', voltage, 100], ['>', zoom, 7]),
    all(['>', voltage, 9], ['>', zoom, 9]),
    ['>', zoom, 10]
  ),
  any(['!=', get('substation'), 'transition'], ['>', zoom, 12])
)

const substation_radius: ExpressionSpecification = interpolate(zoom, [
  [
    5.5,
    interpolate(voltage, [
      [0, 0],
      [200, 1],
      [750, 3]
    ])
  ],
  [
    13,
    interpolate(voltage, [
      [10, 1],
      [30, 3],
      [100, 4],
      [500, 8]
    ])
  ],
  [20, 8]
])

// Determine the minimum zoom a point is visible at (before it can be seen as an
// area), based on the area of the substation.
const substation_point_visible_p: ExpressionSpecification = any(
  ['==', area, 0], // Area = 0 - mapped as node
  all(['<', area, 100], ['<', zoom, 16]),
  all(['<', area, 250], ['<', zoom, 15]),
  ['<', zoom, 13]
)

const converter_p: ExpressionSpecification = all(
  ['==', get('substation'), 'converter'],
  any(['>', voltage, 100], ['>', zoom, 6])
)

const substation_label_visible_p: ExpressionSpecification = all(
  any(
    ['>', voltage, 399],
    all(['>', voltage, 200], ['>', zoom, 8]),
    all(['>', voltage, 100], ['>', zoom, 10]),
    all(['>', voltage, 50], ['>', zoom, 12]),
    ['>', zoom, 13]
  ),
  any(['==', area, 0], ['<', zoom, 17]),
  ['!=', get('substation'), 'transition']
)

// Power line / substation visibility
const power_visible_p: ExpressionSpecification = all(
  any(
    ['>', voltage, 199],
    all(['>', voltage, 99], ['>=', zoom, 4]),
    all(['>', voltage, 49], ['>=', zoom, 5]),
    all(['>', voltage, 24], ['>=', zoom, 6]),
    all(['>', voltage, 9], ['>=', zoom, 9]),
    ['>', zoom, 10]
  ),
  any(all(['!=', get('line'), 'busbar'], ['!=', get('line'), 'bay']), ['>', zoom, 12])
)

// Power line ref visibility
const power_ref_visible_p: ExpressionSpecification = all(
  any(
    all(['>', voltage, 330], ['>', zoom, 7]),
    all(['>', voltage, 200], ['>', zoom, 8]),
    all(['>', voltage, 100], ['>', zoom, 9]),
    ['>', zoom, 10]
  ),
  any(all(['!=', get('line'), 'busbar'], ['!=', get('line'), 'bay']), ['>', zoom, 12])
)

const construction_p: ExpressionSpecification = ['get', 'construction']

function construction_label(): ExpressionSpecification {
  return ['case', construction_p, ' (' + t('construction', 'under construction') + ') ', '']
}

const plant_label_visible_p: ExpressionSpecification = any(
  ['>', output, 1000],
  all(['>', output, 750], ['>', zoom, 5]),
  all(['>', output, 250], ['>', zoom, 6]),
  all(['>', output, 100], ['>', zoom, 7]),
  all(['>', output, 10], ['>', zoom, 9]),
  ['>', zoom, 11]
)

function plant_image(): ExpressionSpecification {
  const expr = ['match', get('source')]
  for (const [key, value] of Object.entries(plant_types)) {
    expr.push(key, value)
  }
  expr.push('power_plant') // default
  return expr as ExpressionSpecification
}

const power_opacity: ExpressionSpecification = interpolate(zoom, [
  [4, case_([[construction_p, 0.3]], 0.6)],
  [8, case_([[construction_p, 0.3]], 1)]
])

export default function layers(): LayerSpecificationWithZIndex[] {
  const pretty_output: ExpressionSpecification = if_(
    ['>', output, 1],
    concat(output, ' ' + t('units.MW', 'MW')),
    concat(['round', ['*', output, 1000]], ' ' + t('units.kW', 'kW'))
  )

  const local_name = get_local_name()

  function name_output_label(display_zoom: number, detail_zoom: number) {
    return step(zoom, '', [
      [display_zoom, local_name],
      [
        detail_zoom,
        case_(
          [
            [all(['!', has('name')], has('output')), concat(pretty_output, construction_label())],
            [has('output'), concat(local_name, ' \n', pretty_output, '\n', construction_label())]
          ],
          local_name
        )
      ]
    ])
  }

  const freq: ExpressionSpecification = case_(
    [
      [hvdc_p, ' DC'],
      [traction_freq_p, concat(' ', get('frequency'), ' ' + t('units.Hz', 'Hz'))]
    ],
    ''
  )

  // Render voltage to text in V or kV
  const voltage_label: ExpressionSpecification = if_(
    ['<', voltage, 1],
    concat(round(['*', get('voltage'), 1000], 3), ' ' + t('units.V', 'V')),
    concat(round(get('voltage'), 3), ' ' + t('units.kV', 'kV'))
  )

  const line_voltage: ExpressionSpecification = case_(
    [
      [
        all(has('voltage_3'), ['!=', get('voltage_3'), get('voltage_2')]),
        concat(
          round(get('voltage'), 3),
          '/',
          round(get('voltage_2'), 3),
          '/',
          round(get('voltage_3'), 3),
          ' ' + t('units.kV', 'kV')
        )
      ],
      [
        all(has('voltage_2'), ['!=', get('voltage_2'), get('voltage')]),
        concat(round(get('voltage'), 3), '/', round(get('voltage_2'), 3), ' ' + t('units.kV', 'kV'))
      ],
      [has('voltage'), voltage_label]
    ],
    ''
  )

  const transformer_label: ExpressionSpecification = concat(
    if_(
      has('voltage_primary'),
      concat(
        round(['to-number', get('voltage_primary')], 3),
        if_(has('voltage_secondary'), concat('/', round(['to-number', get('voltage_secondary')], 3)), ''),
        if_(has('voltage_tertiary'), concat('/', round(['to-number', get('voltage_tertiary')], 3)), ''),
        ' kV'
      ),
      ''
    ),
    if_(has('rating'), concat('\n', get('rating')), '')
  )

  const line_label: ExpressionSpecification = case_(
    [
      [
        all(has('voltage'), has('name'), ['!=', local_name, '']),
        concat(local_name, ' (', line_voltage, freq, ')', construction_label())
      ],
      [has('voltage'), concat(line_voltage, freq, construction_label())]
    ],
    local_name
  )

  const substation_label_detail: ExpressionSpecification = case_(
    [
      [
        all(['!=', local_name, ''], has('voltage')),
        concat(local_name, ' ', voltage, ' ' + t('units.kV', 'kV'), freq, construction_label())
      ],
      [
        all(['==', local_name, ''], has('voltage')),
        concat('Substation ', voltage, ' ' + t('units.kV', 'kV'), freq, construction_label())
      ]
    ],
    local_name
  )

  const substation_label: ExpressionSpecification = step(zoom, local_name, [[12, substation_label_detail]])

  return [
    {
      zorder: 60,
      id: 'power_line_case',
      type: 'line',
      source: 'power',
      'source-layer': 'power_line',
      filter: ['==', get('tunnel'), true],
      minzoom: 12,
      paint: {
        'line-opacity': case_([[construction_p, 0.2]], 0.4),
        'line-color': '#7C4544',
        'line-width': interpolate(zoom, [
          [12, 4],
          [18, 10]
        ])
      },
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      }
    },
    {
      zorder: 61,
      id: 'power_line_underground_1',
      type: 'line',
      filter: all(underground_p, power_visible_p),
      source: 'power',
      'source-layer': 'power_line',
      minzoom: 0,
      paint: {
        'line-color': voltage_color('voltage'),
        'line-width': voltage_line_thickness,
        'line-dasharray': [3, 2],
        'line-offset': voltage_offset(1),
        'line-opacity': power_opacity
      },
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      }
    },
    {
      zorder: 61,
      id: 'power_line_underground_2',
      type: 'line',
      filter: all(underground_p, power_visible_p, has('voltage_2')),
      source: 'power',
      'source-layer': 'power_line',
      minzoom: multi_voltage_min_zoom,
      paint: {
        'line-color': voltage_color('voltage_2'),
        'line-width': voltage_line_thickness,
        'line-dasharray': [3, 2],
        'line-offset': voltage_offset(2),
        'line-opacity': power_opacity
      },
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      }
    },
    {
      zorder: 61,
      id: 'power_line_underground_3',
      type: 'line',
      filter: all(underground_p, power_visible_p, has('voltage_3')),
      source: 'power',
      'source-layer': 'power_line',
      minzoom: multi_voltage_min_zoom,
      paint: {
        'line-color': voltage_color('voltage_3'),
        'line-width': voltage_line_thickness,
        'line-dasharray': [3, 2],
        'line-offset': voltage_offset(3),
        'line-opacity': power_opacity
      },
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      }
    },
    {
      zorder: 160,
      id: 'power_plant',
      type: 'fill',
      source: 'power',
      minzoom: 5,
      'source-layer': 'power_plant',
      paint: {
        'fill-opacity': if_(construction_p, 0.05, 0.2)
      }
    },
    {
      zorder: 161,
      id: 'power_plant_outline',
      type: 'line',
      filter: all(['!', construction_p], ['!', underground_p]),
      source: 'power',
      minzoom: 8,
      'source-layer': 'power_plant',
      paint: {
        'line-color': rgb(30, 30, 30),
        'line-opacity': 0.8,
        'line-width': interpolate(zoom, [
          [13, 0.5],
          [20, 4]
        ])
      },
      layout: {
        'line-join': 'round'
      }
    },
    {
      zorder: 161,
      id: 'power_plant_outline_underground',
      type: 'line',
      filter: all(underground_p, not(construction_p)),
      source: 'power',
      minzoom: 8,
      'source-layer': 'power_plant',
      paint: {
        'line-color': rgb(30, 30, 30),
        'line-opacity': 0.8,
        'line-width': interpolate(zoom, [
          [13, 0.5],
          [20, 4]
        ]),
        'line-dasharray': [2, 2]
      }
    },
    {
      zorder: 161,
      id: 'power_plant_outline_construction',
      type: 'line',
      filter: construction_p,
      source: 'power',
      minzoom: 8,
      'source-layer': 'power_plant',
      paint: {
        'line-color': rgb(163, 139, 16),
        'line-opacity': 0.8,
        'line-width': interpolate(zoom, [
          [13, 1],
          [20, 4]
        ]),
        'line-dasharray': [2, 2]
      },
      layout: {
        'line-join': 'round'
      }
    },
    {
      zorder: 161,
      id: 'power_substation',
      type: 'fill',
      filter: substation_visible_p,
      source: 'power',
      'source-layer': 'power_substation',
      minzoom: 13,
      paint: {
        'fill-opacity': 0.3,
        'fill-color': voltage_color('voltage')
      }
    },
    {
      zorder: 162,
      id: 'power_substation_outline',
      type: 'line',
      filter: all(substation_visible_p, not(underground_p)),
      source: 'power',
      'source-layer': 'power_substation',
      minzoom: 13,
      paint: {
        'line-color': rgb(30, 30, 30),
        'line-opacity': 0.8,
        'line-width': interpolate(zoom, [
          [13, 0.5],
          [20, 4]
        ])
      }
    },
    {
      zorder: 162,
      id: 'power_substation_outline_underground',
      type: 'line',
      filter: underground_p,
      source: 'power',
      minzoom: 8,
      'source-layer': 'power_substation',
      paint: {
        'line-color': rgb(30, 30, 30),
        'line-opacity': 0.8,
        'line-width': interpolate(zoom, [
          [13, 0.5],
          [20, 4]
        ]),
        'line-dasharray': [2, 2]
      }
    },
    {
      zorder: 163,
      id: 'power_solar_panel',
      type: 'fill',
      source: 'power',
      'source-layer': 'power_generator_area',
      filter: ['==', get('source'), 'solar'],
      minzoom: 13,
      paint: {
        'fill-color': '#726BA9',
        'fill-outline-color': rgb(50, 50, 50)
      }
    },
    {
      zorder: 260,
      id: 'power_line_1',
      type: 'line',
      source: 'power',
      'source-layer': 'power_line',
      filter: all(not(underground_p), power_visible_p),
      minzoom: 0,
      paint: {
        'line-color': voltage_color('voltage'),
        'line-width': voltage_line_thickness,
        'line-offset': voltage_offset(1),
        'line-opacity': power_opacity
      },
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      }
    },
    {
      zorder: 260,
      id: 'power_line_2',
      type: 'line',
      source: 'power',
      'source-layer': 'power_line',
      filter: all(not(underground_p), power_visible_p, has('voltage_2')),
      minzoom: multi_voltage_min_zoom,
      paint: {
        'line-color': voltage_color('voltage_2'),
        'line-width': voltage_line_thickness,
        'line-offset': voltage_offset(2),
        'line-opacity': power_opacity
      },
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      }
    },
    {
      zorder: 260,
      id: 'power_line_3',
      type: 'line',
      source: 'power',
      'source-layer': 'power_line',
      filter: all(not(underground_p), power_visible_p, has('voltage_3')),
      minzoom: multi_voltage_min_zoom,
      paint: {
        'line-color': voltage_color('voltage_3'),
        'line-width': voltage_line_thickness,
        'line-offset': voltage_offset(3),
        'line-opacity': power_opacity
      },
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      }
    },
    oimSymbol({
      zorder: 261,
      id: 'power_transformer',
      minZoom: 14,
      source: 'power',
      sourceLayer: 'power_transformer',
      iconImage: if_(
        any(has('voltage_tertiary'), ['==', ['to-number', get('windings')], 3]),
        'power_transformer_3_winding',
        'power_transformer'
      ),
      iconMinScale: 0.1,
      textMinZoom: 17,
      textField: transformer_label,
      textOffset: 3
    }),
    {
      zorder: 262,
      id: 'power_compensator',
      type: 'symbol',
      source: 'power',
      'source-layer': 'power_compensator',
      minzoom: 14,
      paint: text_paint,
      layout: {
        'icon-image': match(
          get('type'),
          [
            ['series_reactor', 'power_reactor'],
            ['shunt_reactor', 'power_reactor_shunt'],
            ['series_capacitor', 'power_capacitor'],
            ['shunt_capacitor', 'power_capacitor_shunt'],
            ['filter', 'power_filter']
          ],
          'power_compensator_frame'
        ),
        'text-field': step(zoom, '', [
          [
            16,
            match(
              get('type'),
              [
                ['static_var', 'SVC'],
                ['statcom', 'STC'],
                ['voltage_regulator', 'VR'],
                ['synchronous_condenser', 'SC']
              ],
              ''
            )
          ]
        ]),
        'text-font': font,
        'text-size': interpolate(zoom, [
          [16, 8],
          [21, 35]
        ]),
        'icon-allow-overlap': true,
        'icon-size': interpolate(
          zoom,
          [
            [14, 0.05],
            [21, 1]
          ],
          1.2
        )
      }
    },
    {
      zorder: 263,
      id: 'power_switch',
      type: 'symbol',
      source: 'power',
      'source-layer': 'power_switch',
      minzoom: 14,
      paint: text_paint,
      layout: {
        'icon-image': match(
          get('type'),
          [
            ['disconnector', 'power_switch_disconnector'],
            ['circuit_breaker', 'power_switch_circuit_breaker']
          ],
          'power_switch'
        ),
        'icon-rotate': ['-', ['get', 'angle'], 90],
        'icon-offset': [0, -4],
        'icon-size': interpolate(
          zoom,
          [
            [14, 0.2],
            [21, 1]
          ],
          1.2
        ),
        'icon-allow-overlap': true
      }
    },
    {
      zorder: 264,
      id: 'power_tower',
      type: 'symbol',
      filter: ['==', get('type'), 'tower'],
      source: 'power',
      'source-layer': 'power_tower',
      minzoom: 13,
      paint: text_paint,
      layout: {
        'icon-image': case_([[get('transition'), 'power_tower_transition']], 'power_tower'),
        'icon-allow-overlap': true,
        'icon-size': interpolate(
          zoom,
          [
            [13, 0.6],
            [21, 1.5]
          ],
          1.2
        ),
        'text-field': step(zoom, '', [[14, get('ref')]]),
        'text-font': font,
        'text-size': interpolate(zoom, [
          [13, 8],
          [21, 14]
        ]),
        'text-offset': [0, 1.5],
        'text-max-angle': 10,
        'text-optional': true
      }
    },
    {
      zorder: 265,
      id: 'power_pole',
      type: 'symbol',
      filter: ['==', get('type'), 'pole'],
      source: 'power',
      'source-layer': 'power_tower',
      minzoom: 13,
      paint: text_paint,
      layout: {
        'icon-image': case_([[get('transition'), 'power_pole_transition']], 'power_pole'),
        'icon-allow-overlap': true,
        'icon-size': interpolate(zoom, [
          [13, 0.2],
          [17, 0.8]
        ]),
        'text-field': step(zoom, '', [
          [15, concat(if_(has('name'), concat(get('name'), '\n'), ''), get('ref'))]
        ]),
        'text-font': font,
        'text-size': interpolate(zoom, [
          [13, 8],
          [21, 14]
        ]),
        'text-offset': interpolate(zoom, [
          [15, literal([0, 2.5])],
          [21, literal([0, 4])]
        ]),
        'text-max-angle': 10,
        'text-optional': true
      }
    },
    {
      zorder: 266,
      id: 'power_pole_transformer',
      type: 'symbol',
      filter: any(has('transformer'), has('substation')),
      source: 'power',
      'source-layer': 'power_tower',
      minzoom: 13,
      layout: {
        'icon-image': 'power_transformer',
        'icon-offset': [45, 0],
        'icon-size': interpolate(zoom, [
          [13, 0.1],
          [21, 0.5]
        ]),
        'icon-allow-overlap': true
      }
    },
    {
      zorder: 266,
      id: 'power_pole_switch',
      type: 'symbol',
      filter: has('switch'),
      source: 'power',
      'source-layer': 'power_tower',
      minzoom: 14,
      layout: {
        'icon-image': match(
          get('switch'),
          [
            ['disconnector', 'power_switch_disconnector'],
            ['circuit_breaker', 'power_switch_circuit_breaker']
          ],
          'power_switch'
        ),
        'icon-rotate': 270,
        'icon-offset': match(get('type'), [['tower', literal([0, -30])]], literal([0, -20])),
        'icon-size': interpolate(zoom, [
          [13, 0.2],
          [21, 1]
        ]),
        'icon-allow-overlap': true
      }
    },
    oimSymbol({
      zorder: 264,
      id: 'power_generator_solar',
      minZoom: 15,
      source: 'power',
      sourceLayer: 'power_generator',
      filter: all(['==', get('source'), 'solar'], get('is_node')),
      textField: name_output_label(15, 16),
      iconImage: 'power_generator_solar',
      textMinZoom: 15,
      iconScale: 0.5,
      iconMinScale: 0.05
    }),
    oimSymbol({
      zorder: 265,
      id: 'power_generator_symbol',
      minZoom: 11,
      source: 'power',
      sourceLayer: 'power_generator',
      filter: all(match(get('source'), [[['wind', 'solar'], false]], true), has('output')),
      textField: name_output_label(11, 14),
      iconImage: 'power_generator',
      textMinZoom: 13,
      iconScale: 0.3,
      iconMinScale: 0.1
    }),
    oimSymbol({
      zorder: 266,
      id: 'power_wind_turbine',
      minZoom: 11,
      source: 'power',
      sourceLayer: 'power_generator',
      filter: ['==', get('source'), 'wind'],
      textField: name_output_label(11, 14),
      iconImage: 'power_wind',
      textMinZoom: 12,
      iconScale: 2,
      iconMinScale: 0.5
    }),
    {
      zorder: 267,
      id: 'power_wind_turbine_point',
      type: 'circle',
      source: 'power',
      'source-layer': 'power_generator',
      filter: ['==', get('source'), 'wind'],
      minzoom: 9,
      maxzoom: 11,
      paint: {
        'circle-radius': interpolate(zoom, [
          [9, 0.5],
          [11, 2]
        ]),
        'circle-color': '#444444'
      }
    },
    {
      zorder: 268,
      id: 'power_substation_point',
      type: 'circle',
      filter: all(substation_visible_p, substation_point_visible_p, not(converter_p)),
      source: 'power',
      'source-layer': 'power_substation_point',
      minzoom: 5,
      layout: {},
      paint: {
        'circle-radius': substation_radius,
        'circle-color': voltage_color('voltage'),
        'circle-stroke-color': ['interpolate-hcl', ['linear'], zoom, 8, '#eee', 12, '#333'],
        'circle-stroke-width': interpolate(zoom, [
          [5, 0],
          [8, 0.5],
          [20, 2]
        ]),
        'circle-opacity': power_opacity,
        'circle-stroke-opacity': power_opacity
      }
    },
    {
      zorder: 560,
      id: 'power_line_ref',
      type: 'symbol',
      filter: all(
        power_ref_visible_p,
        ['!=', coalesce(get('ref'), ''), ''],
        ['<', ['length', get('ref')], 5]
      ),
      source: 'power',
      'source-layer': 'power_line',
      minzoom: 7,
      layout: {
        'icon-image': 'power_line_ref',
        'text-field': '{ref}',
        'text-font': font,
        'symbol-placement': 'line-center',
        'text-size': 10,
        'text-max-angle': 10
      }
    },
    {
      zorder: 561,
      id: 'power_line_label',
      type: 'symbol',
      filter: power_visible_p,
      source: 'power',
      'source-layer': 'power_line',
      minzoom: 10,
      paint: text_paint,
      layout: {
        'text-field': line_label,
        'text-font': font,
        'symbol-placement': 'line',
        'symbol-spacing': 400,
        'text-size': interpolate(zoom, [
          [11, 10],
          [18, 13]
        ]),
        'text-offset': case_(
          [
            [has('voltage_3'), literal([0, 1.5])],
            [has('voltage_2'), literal([0, 1.25])]
          ],
          literal([0, 1])
        ),
        'text-max-angle': 15
      }
    },
    {
      zorder: 561,
      id: 'power_line_label_low_zoom',
      type: 'symbol',
      filter: all(power_visible_p, any(['>', get('voltage'), 350], hvdc_p)),
      source: 'power',
      'source-layer': 'power_line',
      minzoom: 5,
      maxzoom: 10,
      paint: text_paint,
      layout: {
        'text-field': local_name,
        'text-font': font,
        'symbol-placement': 'line',
        'symbol-spacing': 400,
        'text-size': interpolate(zoom, [
          [5, 9],
          [10, 13]
        ]),
        'text-max-angle': 30,
        'text-padding': 15
      }
    },
    {
      zorder: 562,
      id: 'power_substation_ref_label',
      type: 'symbol',
      filter: substation_label_visible_p,
      source: 'power',
      'source-layer': 'power_substation_point',
      minzoom: 14.5,
      layout: {
        'symbol-z-order': 'source',
        'text-field': '{ref}',
        'text-font': font,
        'text-anchor': 'bottom',
        'text-offset': [0, -0.5],
        'text-size': interpolate(zoom, [
          [14, 9],
          [21, 14]
        ]),
        'text-max-width': 8
      },
      paint: text_paint
    },
    {
      zorder: 562,
      id: 'power_substation_label',
      type: 'symbol',
      source: 'power',
      filter: substation_label_visible_p,
      'source-layer': 'power_substation_point',
      minzoom: 8,
      layout: {
        'symbol-sort-key': ['-', 10000, voltage],
        'symbol-z-order': 'source',
        'text-field': substation_label,
        'text-font': font,
        'text-variable-anchor': ['top', 'bottom'],
        'text-radial-offset': 0.8,
        'text-size': interpolate(zoom, [
          [8, 10],
          [
            18,
            interpolate(voltage, [
              [0, 10],
              [400, 16]
            ])
          ]
        ]),
        'text-max-width': 8
      },
      paint: text_paint
    },
    {
      zorder: 562,
      id: 'power_converter_point',
      type: 'symbol',
      filter: all(converter_p, substation_point_visible_p),
      source: 'power',
      'source-layer': 'power_substation_point',
      minzoom: 5.5,
      layout: {
        'icon-image': 'converter',
        'icon-size': interpolate(zoom, [
          [5, 0.4],
          [9, 1]
        ]),
        'text-field': substation_label,
        'text-font': font,
        'text-variable-anchor': ['top', 'bottom'],
        'text-radial-offset': interpolate(zoom, [
          [5, 1.2],
          [9, 1.6]
        ]),
        'text-size': interpolate(zoom, [
          [7, 10],
          [
            18,
            interpolate(output, [
              [0, 10],
              [2000, 16]
            ])
          ]
        ]),
        'text-optional': true
      },
      paint: {
        ...text_paint,
        'text-opacity': ['step', zoom, 0, 7, 1],
        'icon-opacity': if_(construction_p, 0.5, 1)
      }
    },
    {
      zorder: 563,
      id: 'power_plant_label',
      type: 'symbol',
      source: 'power',
      filter: plant_label_visible_p,
      'source-layer': 'power_plant_point',
      minzoom: 6,
      maxzoom: 24,
      layout: {
        'symbol-sort-key': ['-', 10000, output],
        'symbol-z-order': 'source',
        'icon-allow-overlap': true,
        'icon-image': plant_image(),
        'icon-size': interpolate(zoom, [
          [6, 0.5],
          [
            13,
            interpolate(output, [
              [0, 0.6],
              [1000, 1]
            ])
          ]
        ]),
        'text-field': name_output_label(7, 9),
        'text-font': font,
        'text-variable-anchor': ['top', 'bottom'],
        'text-radial-offset': interpolate(zoom, [
          [7, 1],
          [
            13,
            interpolate(output, [
              [0, 1],
              [1000, 1.6]
            ])
          ],
          [14, 0]
        ]),
        'text-size': interpolate(zoom, [
          [7, 10],
          [
            18,
            interpolate(output, [
              [0, 10],
              [2000, 16]
            ])
          ]
        ]),
        'text-optional': true
      },
      paint: {
        ...text_paint,
        // Control visibility using the opacity property...
        'icon-opacity': ['step', zoom, if_(construction_p, 0.5, 1), 13, 0]
      }
    }
  ]
}
