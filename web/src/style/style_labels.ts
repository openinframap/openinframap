import { LayerSpecificationWithZIndex } from './types.ts'

const text_color = 'hsl(0, 0%, 20%)'
const text_halo_color = 'rgb(242,243,240)'

const layers: LayerSpecificationWithZIndex[] = [
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
      'text-field': '{name:latin}\n{name:nonlatin}',
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
      'text-field': '{name:latin}\n{name:nonlatin}',
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
      'text-field': '{name:latin}\n{name:nonlatin}',
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
      'text-field': '{name:latin}\n{name:nonlatin}',
      'text-font': ['Noto Sans Regular'],
      'text-justify': 'center',
      'text-offset': [0.5, 0.2],
      'text-size': 12,
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
      'text-field': '{name:latin}\n{name:nonlatin}',
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
      'text-field': '{name:latin}\n{name:nonlatin}',
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
      'text-field': '{name:latin}\n{name:nonlatin}',
      'text-font': ['Noto Sans Regular'],
      'text-size': 15,
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
      'text-field': ['case', ['has', 'name:en'], ['get', 'name:en'], ['get', 'name:latin']],
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
    maxzoom: 8,
    filter: [
      'all',
      ['==', '$type', 'Point'],
      ['==', 'class', 'country'],
      ['>=', 'rank', 2],
      ['has', 'iso_a2']
    ],
    layout: {
      'text-field': ['case', ['has', 'name:en'], ['get', 'name:en'], ['get', 'name:latin']],
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
    minzoom: 3,
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
      'text-field': ['case', ['has', 'name:en'], ['get', 'name:en'], ['get', 'name:latin']],
      'text-font': ['Noto Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 0, 10, 3, 12, 4, 14]
    },
    paint: {
      'text-color': text_color,
      'text-halo-color': text_halo_color,
      'text-halo-width': 2.4
    }
  }
]

export default layers
