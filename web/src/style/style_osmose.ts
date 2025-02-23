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
        'circle-opacity': 0.2,
        'circle-stroke-color': '#dd0000',
        'circle-stroke-width': interpolate(zoom, [
          [11, 0.5],
          [17, 1]
        ])
      }
    },
    {
      id: 'osmose_errors_power_symbol',
      zorder: 701,
      minzoom: 12.5,
      source: 'osmose_errors_power',
      'source-layer': 'issues',
      type: 'symbol',
      layout: {
        'icon-image': 'validation_error',
        'icon-anchor': 'bottom',
        'icon-allow-overlap': true,
        'icon-size': interpolate(zoom, [
          [12, 0.2],
          [17, 1]
        ])
      }
    }
  ]
}
