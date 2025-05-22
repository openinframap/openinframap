import { t } from 'i18next'
import { ColorSpecification, ExpressionSpecification } from 'maplibre-gl'
import { text_paint, font, get_local_name, substance } from './common.js'
import { LayerSpecificationWithZIndex } from './types.ts'
import { interpolate, match, get, has, concat, if_, zoom, any, all, case_ } from './stylehelpers.ts'

const colour_gas_transmission_large: ColorSpecification = '#8A3976'
const colour_gas_transmission_medium: ColorSpecification = '#E65757'
const colour_gas_transmission_other: ColorSpecification = '#EA972D'
const colour_gas_pressure_high: ColorSpecification = '#ECCD25'
const colour_gas_pressure_intermediate: ColorSpecification = '#E1DD69'
const colour_gas_other: ColorSpecification = '#BFBC6B'
const colour_oil: ColorSpecification = '#6B6B6B'
const colour_fuel: ColorSpecification = '#CC9F83'
const colour_intermediate: ColorSpecification = '#78CC9E'
const colour_hydrogen: ColorSpecification = '#CC78AB'
const colour_unknown: ColorSpecification = '#BABABA'

const transmission_large_p = all(
  has('usage'),
  has('diameter'),
  ['==', get('usage'), 'transmission'],
  ['>=', ['to-number', get('diameter'), 0], 700],
);
const transmission_medium_p = all(
  has('usage'),
  has('diameter'),
  ['==', get('usage'), 'transmission'],
  ['>=', ['to-number', get('diameter'), 0], 300],
);
const transmission_p = all(
  has('usage'),
  ['==', get('usage'), 'transmission'],
);
const pressure_high_p = all(
  has('pressure'),
  any(
    ['==', get('pressure'), 'high'],
    ['>=', ['to-number', get('pressure'), 0], 1],
  ),
);
const pressure_intermediate_p = all(
  has('pressure'),
  any(
    ['==', get('pressure'), 'intermediate'],
    ['>=', ['to-number', get('pressure'), 0], 0.1],
  ),
);

const usage_diameter_pressure_colour: ExpressionSpecification = case_(
  [
    [transmission_large_p, colour_gas_transmission_large],
    [transmission_medium_p, colour_gas_transmission_medium],
    [transmission_p, colour_gas_transmission_other],
    [pressure_high_p, colour_gas_pressure_high],
    [pressure_intermediate_p, colour_gas_pressure_intermediate],
  ],
  colour_gas_other
);

const pipeline_colour: ExpressionSpecification = match(
  substance,
  [
    [['gas', 'natural_gas', 'cng', 'lpg', 'lng'], usage_diameter_pressure_colour],
    ['oil', colour_oil],
    ['fuel', colour_fuel],
    [['ngl', 'y-grade', 'hydrocarbons', 'condensate', 'naphtha'], colour_intermediate],
    ['hydrogen', colour_hydrogen]
  ],
  colour_unknown
)

function substance_label(): ExpressionSpecification {
  return match(
    get('substance'),
    [
      [['gas', 'natural_gas', 'cng', 'lpg', 'lng'], t('names.substance.gas')],
      ['oil', t('names.substance.oil')],
      ['fuel', t('names.substance.fuel')],
      [
        ['ngl', 'y-grade', 'hydrocarbons', 'condensate', 'naphtha'],
        t('names.substance.petroleum-intermediate')
      ],
      ['hydrogen', t('names.substance.hydrogen')],
      ['carbon_dioxide', t('names.substance.co2')]
    ],
    get('substance')
  )
}

function pipeline_label(): ExpressionSpecification {
  return concat(
    if_(has('name'), get('name'), get('operator')),
    if_(
      all(['!=', get('substance'), ''], any(has('operator'), has('name'))),
      concat(' (', substance_label(), ')'),
      substance_label()
    )
  )
}

export default function layers(): LayerSpecificationWithZIndex[] {
  return [
    {
      zorder: 1,
      id: 'petroleum_pipeline_case',
      type: 'line',
      source: 'petroleum',
      minzoom: 7,
      'source-layer': 'petroleum_pipeline',
      paint: {
        'line-color': '#666666',
        'line-width': interpolate(zoom, [
          [8, 1.5],
          [16, ['match', get('usage'), 'transmission', 4, 1.5]]
        ])
      },
      layout: {
        'line-cap': 'round',
        'line-join': 'round'
      }
    },
    {
      zorder: 2,
      id: 'petroleum_pipeline',
      type: 'line',
      source: 'petroleum',
      minzoom: 2,
      'source-layer': 'petroleum_pipeline',
      paint: {
        'line-color': pipeline_colour,
        'line-width': interpolate(zoom, [
          [3, 1],
          [16, ['match', get('usage'), 'transmission', 2, 1]]
        ])
      }
    },
    {
      zorder: 100,
      id: 'petroleum_site',
      type: 'fill',
      source: 'petroleum',
      minzoom: 8,
      'source-layer': 'petroleum_site',
      paint: {
        'fill-opacity': 0.3,
        'fill-color': colour_oil,
        'fill-outline-color': 'rgba(0, 0, 0, 1)'
      }
    },
    {
      zorder: 101,
      id: 'petroleum_well',
      type: 'circle',
      source: 'petroleum',
      minzoom: 10,
      'source-layer': 'petroleum_well',
      paint: {
        'circle-color': colour_oil,
        'circle-stroke-color': '#666666',
        'circle-stroke-width': 1,
        'circle-radius': interpolate(zoom, [
          [10, 1],
          [12, 2],
          [14, 5]
        ])
      }
    },
    {
      zorder: 500,
      id: 'petroleum_pipeline_label',
      type: 'symbol',
      source: 'petroleum',
      'source-layer': 'petroleum_pipeline',
      minzoom: 12,
      paint: text_paint,
      layout: {
        'text-field': pipeline_label(),
        'text-font': font,
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
      source: 'petroleum',
      'source-layer': 'petroleum_site',
      minzoom: 12,
      layout: {
        'text-field': get_local_name(),
        'text-font': font,
        'text-anchor': 'top',
        'text-offset': [0, 1],
        'text-size': 11
      },
      paint: text_paint
    },
    {
      zorder: 502,
      id: 'petroleum_well_label',
      type: 'symbol',
      source: 'petroleum',
      'source-layer': 'petroleum_well',
      minzoom: 13,
      layout: {
        'text-field': concat(t('names.petroleum.well'), ' ', get_local_name()),
        'text-font': font,
        'text-anchor': 'top',
        'text-offset': [0, 0.5],
        'text-size': 10
      },
      paint: text_paint
    }
  ]
}

export {
  colour_gas_transmission_large,
  colour_gas_transmission_medium,
  colour_gas_transmission_other,
  colour_gas_pressure_high,
  colour_gas_pressure_intermediate,
  colour_gas_other,
  colour_oil,
  colour_fuel,
  colour_intermediate,
  colour_hydrogen,
  colour_unknown,
  pipeline_label
}
