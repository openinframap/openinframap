import i18next from 'i18next'
import { LayerSpecificationWithZIndex } from './types.ts'
import { coalesce, concat, get, interpolate, zoom } from './stylehelpers.ts'
import { ExpressionSpecification } from 'maplibre-gl'

const text_color = 'hsl(0, 0%, 20%)'
const text_halo_color = 'rgb(242,243,240)'

function omtLabel(): ExpressionSpecification {
  const lang = i18next.language.split('-')[0]
  return concat(coalesce(get(`name:${lang}`), get('name:latin'), get('name')))
}

export default function layers(): LayerSpecificationWithZIndex[] {
  return [
    {
      id: 'place_suburb',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      minzoom: 12,
      maxzoom: 17,
      filter: ['all', ['==', '$type', 'Point'], ['==', 'class', 'suburb']],
      layout: {
        'text-anchor': 'center',
        'text-field': omtLabel(),
        'text-font': ['Noto Sans Regular'],
        'text-justify': 'center',
        'text-offset': [0.5, 0],
        'text-size': ['interpolate', ['linear'], ['zoom'], 12, 9, 17, 17]
      },
      paint: {
        'text-color': text_color,
        'text-halo-blur': 1,
        'text-halo-color': text_halo_color,
        'text-halo-width': 2
      }
    },
    {
      id: 'place_village',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      minzoom: 12,
      maxzoom: 17,
      filter: ['all', ['==', '$type', 'Point'], ['==', 'class', 'village']],
      layout: {
        'text-anchor': 'center',
        'text-field': omtLabel(),
        'text-font': ['Noto Sans Regular'],
        'text-justify': 'center',
        'text-offset': [0.5, 0.2],
        'text-size': ['interpolate', ['linear'], ['zoom'], 12, 9, 17, 18]
      },
      paint: {
        'text-color': text_color,
        'text-halo-blur': 1,
        'text-halo-color': text_halo_color,
        'text-halo-width': 2
      }
    },
    {
      id: 'place_town',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      minzoom: 10,
      maxzoom: 15,
      filter: ['all', ['==', '$type', 'Point'], ['==', 'class', 'town']],
      layout: {
        'text-anchor': 'center',
        'text-field': omtLabel(),
        'text-font': ['Noto Sans Regular'],
        'text-justify': 'center',
        'text-offset': [0.5, 0.2],
        'text-size': ['interpolate', ['linear'], ['zoom'], 10, 9, 15, 18]
      },
      paint: {
        'text-color': text_color,
        'text-halo-blur': 1,
        'text-halo-color': text_halo_color,
        'text-halo-width': 2
      }
    },
    {
      id: 'place_city',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      minzoom: 7.5,
      maxzoom: 12,
      filter: [
        'all',
        ['==', '$type', 'Point'],
        ['all', ['!=', 'capital', 2], ['==', 'class', 'city'], ['>', 'rank', 3]]
      ],
      layout: {
        'text-anchor': 'center',
        'text-field': omtLabel(),
        'text-font': ['Noto Sans Regular'],
        'text-justify': 'center',
        'text-offset': [0.5, 0.2],
        'text-size': interpolate(zoom, [
          [7.5, 8],
          [12, 18]
        ]),
        visibility: 'visible'
      },
      paint: {
        'text-color': text_color,
        'text-halo-blur': 1,
        'text-halo-color': text_halo_color,
        'text-halo-width': 2
      }
    },
    {
      id: 'place_capital',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      minzoom: 5.5,
      maxzoom: 12,
      filter: ['all', ['==', '$type', 'Point'], ['all', ['==', 'capital', 2], ['==', 'class', 'city']]],
      layout: {
        'text-anchor': 'center',
        'text-field': omtLabel(),
        'text-font': ['Noto Sans Regular'],
        'text-justify': 'center',
        'text-offset': [0.5, 0.2],
        'text-size': interpolate(zoom, [
          [5.5, 9],
          [12, 18]
        ]),
        visibility: 'visible'
      },
      paint: {
        'text-color': text_color,
        'text-halo-blur': 1,
        'text-halo-color': text_halo_color,
        'text-halo-width': 2
      }
    },
    {
      id: 'place_city_large',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      minzoom: 7,
      maxzoom: 12,
      filter: [
        'all',
        ['==', '$type', 'Point'],
        ['all', ['!=', 'capital', 2], ['<=', 'rank', 3], ['==', 'class', 'city']]
      ],
      layout: {
        'text-anchor': 'center',
        'text-field': omtLabel(),
        'text-font': ['Noto Sans Regular'],
        'text-justify': 'center',
        'text-offset': [0.5, 0.2],
        'text-size': 14,
        visibility: 'visible'
      },
      paint: {
        'text-color': text_color,
        'text-halo-blur': 1,
        'text-halo-color': text_halo_color,
        'text-halo-width': 2
      }
    },
    {
      id: 'place_state',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      minzoom: 5,
      maxzoom: 12,
      filter: ['all', ['==', '$type', 'Point'], ['==', 'class', 'state']],
      layout: {
        'text-field': omtLabel(),
        'text-font': ['Noto Sans Regular'],
        'text-size': interpolate(zoom, [
          [5, 9],
          [12, 14]
        ]),
        visibility: 'visible'
      },
      paint: {
        'text-color': text_color,
        'text-halo-blur': 1,
        'text-halo-color': text_halo_color,
        'text-halo-width': 2
      }
    },
    {
      id: 'place_country_other',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      maxzoom: 8,
      filter: ['all', ['==', '$type', 'Point'], ['==', 'class', 'country'], ['!has', 'iso_a2']],
      layout: {
        'text-field': omtLabel(),
        'text-font': ['Metropolis Light Italic', 'Noto Sans Regular Italic'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 0, 9, 6, 15]
      },
      paint: {
        'text-color': text_color,
        'text-halo-color': text_halo_color,
        'text-halo-width': 2
      }
    },
    {
      id: 'place_country_minor',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      minzoom: 3,
      maxzoom: 7,
      filter: [
        'all',
        ['==', '$type', 'Point'],
        ['==', 'class', 'country'],
        ['>=', 'rank', 2],
        ['has', 'iso_a2']
      ],
      layout: {
        'text-field': omtLabel(),
        'text-font': ['Noto Sans Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 0, 10, 6, 12]
      },
      paint: {
        'text-color': text_color,
        'text-halo-color': text_halo_color,
        'text-halo-width': 2
      }
    },
    {
      id: 'place_country_major',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      minzoom: 2.5,
      maxzoom: 5,
      filter: [
        'all',
        ['==', '$type', 'Point'],
        ['<=', 'rank', 1],
        ['==', 'class', 'country'],
        ['has', 'iso_a2']
      ],
      layout: {
        'text-anchor': 'center',
        'text-field': omtLabel(),
        'text-font': ['Noto Sans Regular'],
        'text-size': interpolate(zoom, [
          [2.5, 10],
          [3, 12],
          [5, 16]
        ])
      },
      paint: {
        'text-color': text_color,
        'text-halo-color': text_halo_color,
        'text-halo-width': 2.4
      }
    }
  ]
}
