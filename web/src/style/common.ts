import { ExpressionSpecification, FilterSpecification } from 'maplibre-gl'
import { LayerSpecificationWithZIndex } from './types.ts'
import { local_name_tags } from '../l10n.ts'

export const local_name: ExpressionSpecification = (['coalesce'] as any).concat(
  local_name_tags.map((tag) => ['get', tag])
) as ExpressionSpecification

export const text_paint = {
  'text-halo-width': 4,
  'text-halo-blur': 2,
  'text-halo-color': 'rgba(230, 230, 230, 1)'
}

export const operator_text: ExpressionSpecification = [
  'step',
  ['zoom'],
  ['get', 'name'],
  14,
  [
    'case',
    ['all', ['has', 'operator'], ['has', 'name']],
    ['concat', ['get', 'name'], '\n(', ['get', 'operator'], ')'],
    ['has', 'operator'],
    ['get', 'operator'],
    ['get', 'name']
  ]
]

export const underground_p: ExpressionSpecification = [
  'any',
  ['==', ['get', 'location'], 'underground'],
  ['==', ['get', 'location'], 'underwater'],
  ['==', ['get', 'tunnel'], true],
  [
    'all', // Power cables are underground by default
    ['==', ['get', 'type'], 'cable'],
    ['==', ['get', 'location'], '']
  ]
]

export const font = ['Noto Sans Regular']

export type OIMSymbolOptions = {
  id: string
  zorder: number
  source: string
  sourceLayer: string
  filter?: FilterSpecification
  minZoom: number
  textField: ExpressionSpecification
  textSize?: number
  textMinZoom: number
  textOffset?: number
  iconImage: ExpressionSpecification | string
  iconScale?: number // Icon scale at max icon zoom
  iconMinScale?: number // Icon scale at initial icon zoom
  iconMaxZoom?: number
}

/**
 * Generate a text+icon symbol style with the following properties:
 *
 * - The icon appears at minZoom and disappears at iconMaxZoom.
 * - The text appears at textMinZoom.
 * - Icon scaling, text scaling, and text offsets are managed automatically.
 */
export function oimSymbol(options: OIMSymbolOptions): LayerSpecificationWithZIndex {
  const iconScale = options.iconScale || 1
  const textSize = options.textSize || 12
  const textOffset = options.textOffset || 1.4
  const iconMaxZoom = options.iconMaxZoom || 21
  return {
    id: options.id,
    zorder: options.zorder,
    type: 'symbol',
    source: options.source,
    'source-layer': options.sourceLayer,
    filter: options.filter || ['literal', true],
    minzoom: options.minZoom,
    paint: {
      ...text_paint,
      // Control visibility using the opacity property.
      // We can't use a step function on the 'text-field' property, because only one zoom-based
      // function can be used per expression, and we might need to use a zoom-based expression
      // to define text.
      'text-opacity': ['step', ['zoom'], 0, options.textMinZoom, 1]
    },
    layout: {
      'icon-image': ['step', ['zoom'], options.iconImage, iconMaxZoom, ''],
      'icon-size': [
        'interpolate',
        ['linear'],
        ['zoom'],
        options.minZoom,
        options.iconMinScale || iconScale * 0.8,
        iconMaxZoom,
        iconScale
      ],
      'text-field': options.textField,
      'text-font': font,
      'text-size': ['interpolate', ['linear'], ['zoom'], options.textMinZoom, textSize * 0.7, 18, textSize],
      'text-anchor': 'top',
      'text-offset': [
        'interpolate',
        ['linear'],
        ['zoom'],
        options.textMinZoom,
        ['literal', [0, textOffset * 0.8]],
        iconMaxZoom,
        ['literal', [0, textOffset]],
        iconMaxZoom + 2,
        ['literal', [0, 0]]
      ],
      'text-optional': true,
      'icon-allow-overlap': true
    }
  }
}
