import { ColorSpecification, ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec'
import { font, substance, text_paint } from './common.ts'
import { pipeline_label } from './style_oim_petroleum.ts'
import { get, interpolate, match, zoom } from './stylehelpers.ts'
import { LayerSpecificationWithZIndex } from './types.ts'

export const colour_oxygen: ColorSpecification = '#61F4FF'
export const colour_co2: ColorSpecification = '#7885CC'
export const colour_nitrogen: ColorSpecification = '#5F1385'
export const colour_beer: ColorSpecification = '#BA7449'
export const colour_other_pipeline_unknown: ColorSpecification = '#FCB512'

const other_pipeline_colour: ExpressionSpecification = match(
  substance,
  [
    ['oxygen', colour_oxygen],
    ['carbon_dioxide', colour_co2],
    ['nitrogen', colour_nitrogen],
    ['beer', colour_beer]
  ],
  colour_other_pipeline_unknown
)

export default function layers(): LayerSpecificationWithZIndex[] {
  return [
    {
      zorder: 1,
      id: 'pipeline_case',
      type: 'line',
      source: 'other_pipeline',
      minzoom: 7,
      'source-layer': 'other_pipeline',
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
      zorder: 3,
      id: 'pipeline_inner',
      type: 'line',
      source: 'other_pipeline',
      minzoom: 2,
      'source-layer': 'other_pipeline',
      paint: {
        'line-color': other_pipeline_colour,
        'line-width': interpolate(zoom, [
          [3, 1],
          [16, ['match', get('usage'), 'transmission', 2, 1]]
        ])
      }
    },
    {
      zorder: 500,
      id: 'other_pipeline_label',
      type: 'symbol',
      source: 'other_pipeline',
      'source-layer': 'other_pipeline',
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
    }
  ]
}
