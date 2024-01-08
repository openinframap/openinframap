import { ExpressionSpecification } from 'maplibre-gl'
import { local_name_tags } from '../l10n.ts'

export const local_name: ExpressionSpecification = (['coalesce'] as any).concat(
  local_name_tags.map((tag) => ['get', tag])
) as ExpressionSpecification

const text_paint = {
  'text-halo-width': 4,
  'text-halo-blur': 2,
  'text-halo-color': 'rgba(230, 230, 230, 1)'
}

const operator_text: ExpressionSpecification = [
  'step',
  ['zoom'],
  ['get', 'name'],
  14,
  ['case', ['has', 'operator'], ['concat', ['get', 'name'], ' (', ['get', 'operator'], ')'], ['get', 'name']]
]

const underground_p: ExpressionSpecification = [
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

const font = ['Noto Sans Regular']

export { text_paint, operator_text, underground_p, font }
