import { interpolate, zoom } from './stylehelpers.ts'
import { LayerSpecificationWithZIndex } from './types.ts'

export default function layers(): LayerSpecificationWithZIndex[] {
  return [
    {
      id: 'osmose_errors_power',
      zorder: 700,
      minzoom: 11,
      source: 'osmose_errors_power',
      'source-layer': 'issues',
      type: 'circle',
      paint: {
        'circle-radius': interpolate(zoom, [
          [11, 2],
          [17, 15]
        ]),
        'circle-color': '#ff0000',
        'circle-opacity': interpolate(zoom, [
          [11, 0],
          [17, 0.6]
        ]),
        'circle-stroke-color': '#dd0000',
        'circle-stroke-width': interpolate(zoom, [
          [11, 0.5],
          [17, 3]
        ])
      }
    }
  ]
}
