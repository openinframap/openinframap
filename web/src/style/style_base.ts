import { LayerSpecificationWithZIndex } from './types.ts'
// Base Style, adapted from MapTiler's Positron theme.

const layers: LayerSpecificationWithZIndex[] = [
  {
    id: 'background',
    type: 'background',
    paint: {
      'background-color': 'rgb(242,243,240)'
    }
  },
  {
    id: 'park',
    type: 'fill',
    source: 'openmaptiles',
    'source-layer': 'park',
    filter: ['==', '$type', 'Polygon'],
    paint: {
      'fill-color': 'rgb(230, 233, 229)'
    }
  },
  {
    id: 'water',
    type: 'fill',
    source: 'openmaptiles',
    'source-layer': 'water',
    filter: ['==', '$type', 'Polygon'],
    paint: {
      'fill-color': 'hsl(207, 12%, 78%)',
      'fill-antialias': true
    }
  },
  {
    id: 'landcover_ice_shelf',
    type: 'fill',
    source: 'openmaptiles',
    'source-layer': 'landcover',
    maxzoom: 8,
    filter: ['all', ['==', '$type', 'Polygon'], ['==', 'subclass', 'ice_shelf']],
    paint: {
      'fill-color': 'hsl(0, 0%, 98%)',
      'fill-opacity': 0.7
    }
  },
  {
    id: 'landcover_glacier',
    type: 'fill',
    source: 'openmaptiles',
    'source-layer': 'landcover',
    maxzoom: 8,
    filter: ['all', ['==', '$type', 'Polygon'], ['==', 'subclass', 'glacier']],
    paint: {
      'fill-color': 'hsl(0, 0%, 98%)',
      'fill-opacity': ['interpolate', ['linear'], ['zoom'], 0, 1, 8, 0.5]
    }
  },
  {
    id: 'landuse_residential',
    type: 'fill',
    source: 'openmaptiles',
    'source-layer': 'landuse',
    maxzoom: 16,
    filter: ['all', ['==', '$type', 'Polygon'], ['==', 'class', 'residential']],
    paint: {
      'fill-color': 'rgb(234, 234, 230)',
      'fill-opacity': ['interpolate', ['exponential', 0.6], ['zoom'], 8, 0.8, 9, 0.6]
    }
  },
  {
    id: 'landcover_wood',
    type: 'fill',
    source: 'openmaptiles',
    'source-layer': 'landcover',
    minzoom: 10,
    filter: ['all', ['==', '$type', 'Polygon'], ['==', 'class', 'wood']],
    paint: {
      'fill-color': 'rgb(220,226,220)',
      'fill-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0, 12, 1]
    }
  },
  {
    id: 'waterway',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'waterway',
    filter: ['==', '$type', 'LineString'],
    paint: {
      'line-color': 'hsl(207, 20%, 78%)'
    }
  },
  {
    id: 'building',
    type: 'fill',
    source: 'openmaptiles',
    'source-layer': 'building',
    minzoom: 12,
    paint: {
      'fill-color': 'rgb(234, 234, 229)',
      'fill-outline-color': 'rgb(219, 219, 218)',
      'fill-antialias': true
    }
  },
  {
    id: 'tunnel_motorway_casing',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    minzoom: 6,
    filter: [
      'all',
      ['==', '$type', 'LineString'],
      ['all', ['==', 'brunnel', 'tunnel'], ['==', 'class', 'motorway']]
    ],
    layout: {
      'line-cap': 'butt',
      'line-join': 'miter'
    },
    paint: {
      'line-color': 'rgb(213, 213, 213)',
      'line-width': ['interpolate', ['exponential', 1.4], ['zoom'], 5.8, 0, 6, 3, 20, 40]
    }
  },
  {
    id: 'tunnel_motorway_inner',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    minzoom: 6,
    filter: [
      'all',
      ['==', '$type', 'LineString'],
      ['all', ['==', 'brunnel', 'tunnel'], ['==', 'class', 'motorway']]
    ],
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint: {
      'line-color': 'rgb(234,234,234)',
      'line-width': ['interpolate', ['exponential', 1.4], ['zoom'], 4, 2, 6, 1.3, 20, 30]
    }
  },
  {
    id: 'aeroway-taxiway',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'aeroway',
    minzoom: 12,
    filter: ['all', ['in', 'class', 'taxiway']],
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint: {
      'line-color': 'hsl(0, 0%, 88%)',
      'line-width': ['interpolate', ['exponential', 1.55], ['zoom'], 13, 1.8, 20, 20]
    }
  },
  {
    id: 'aeroway-runway-casing',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'aeroway',
    minzoom: 11,
    filter: ['all', ['in', 'class', 'runway']],
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint: {
      'line-color': 'hsl(0, 0%, 88%)',
      'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 11, 6, 17, 55]
    }
  },
  {
    id: 'aeroway-area',
    type: 'fill',
    source: 'openmaptiles',
    'source-layer': 'aeroway',
    minzoom: 4,
    filter: ['all', ['==', '$type', 'Polygon'], ['in', 'class', 'runway', 'taxiway']],

    paint: {
      'fill-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0, 14, 1],
      'fill-color': 'rgba(255, 255, 255, 1)'
    }
  },
  {
    id: 'aeroway-runway',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'aeroway',
    minzoom: 11,
    filter: ['all', ['in', 'class', 'runway'], ['==', '$type', 'LineString']],
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint: {
      'line-color': 'rgba(255, 255, 255, 1)',
      'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 11, 4, 17, 50]
    }
  },
  {
    id: 'highway_path',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    filter: ['all', ['==', '$type', 'LineString'], ['==', 'class', 'path']],
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint: {
      'line-color': 'rgb(234, 234, 234)',
      'line-width': ['interpolate', ['exponential', 1.2], ['zoom'], 13, 1, 20, 10],
      'line-opacity': 0.9
    }
  },
  {
    id: 'highway_minor_casing',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    minzoom: 8,
    filter: ['all', ['==', '$type', 'LineString'], ['in', 'class', 'minor', 'service', 'track']],
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint: {
      'line-color': 'hsl(0, 0%, 83%)',
      'line-width': ['interpolate', ['exponential', 1.3], ['zoom'], 13, 1.9, 20, 21]
    }
  },
  {
    id: 'highway_minor',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    minzoom: 8,
    filter: ['all', ['==', '$type', 'LineString'], ['in', 'class', 'minor', 'service', 'track']],
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint: {
      'line-color': 'hsl(0, 0%, 92%)',
      'line-width': ['interpolate', ['exponential', 1.55], ['zoom'], 13, 1.8, 20, 20]
    }
  },
  {
    id: 'highway_major_casing',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    minzoom: 11,
    filter: [
      'all',
      ['==', '$type', 'LineString'],
      ['in', 'class', 'primary', 'secondary', 'tertiary', 'trunk']
    ],
    layout: {
      'line-cap': 'butt',
      'line-join': 'miter'
    },
    paint: {
      'line-color': 'rgb(213, 213, 213)',
      'line-dasharray': [12, 0],
      'line-width': ['interpolate', ['exponential', 1.3], ['zoom'], 10, 3, 20, 23]
    }
  },
  {
    id: 'highway_major_inner',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    minzoom: 11,
    filter: [
      'all',
      ['==', '$type', 'LineString'],
      ['in', 'class', 'primary', 'secondary', 'tertiary', 'trunk']
    ],
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint: {
      'line-color': '#fff',
      'line-width': ['interpolate', ['exponential', 1.3], ['zoom'], 10, 2, 20, 20]
    }
  },
  {
    id: 'highway_major_subtle',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    maxzoom: 11,
    filter: [
      'all',
      ['==', '$type', 'LineString'],
      ['in', 'class', 'primary', 'secondary', 'tertiary', 'trunk']
    ],
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint: {
      'line-color': 'hsla(0, 0%, 85%, 0.69)',
      'line-width': 1
    }
  },
  {
    id: 'highway_motorway_casing',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    minzoom: 6,
    filter: [
      'all',
      ['==', '$type', 'LineString'],
      ['all', ['!in', 'brunnel', 'bridge', 'tunnel'], ['==', 'class', 'motorway']]
    ],
    layout: {
      'line-cap': 'butt',
      'line-join': 'miter'
    },
    paint: {
      'line-color': 'rgb(213, 213, 213)',
      'line-width': ['interpolate', ['exponential', 1.4], ['zoom'], 5.8, 0, 6, 3, 20, 40],
      'line-dasharray': [2, 0]
    }
  },
  {
    id: 'highway_motorway_inner',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    minzoom: 6,
    filter: [
      'all',
      ['==', '$type', 'LineString'],
      ['all', ['!in', 'brunnel', 'bridge', 'tunnel'], ['==', 'class', 'motorway']]
    ],
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint: {
      'line-color': ['interpolate', ['linear'], ['zoom'], 6, 'hsla(0, 0%, 85%, 0.53)', 8, '#fff'],
      'line-width': ['interpolate', ['exponential', 1.4], ['zoom'], 4, 2, 6, 1.3, 20, 30]
    }
  },
  {
    id: 'highway_motorway_subtle',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    maxzoom: 6,
    filter: ['all', ['==', '$type', 'LineString'], ['==', 'class', 'motorway']],
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint: {
      'line-color': 'hsla(0, 0%, 85%, 0.53)',
      'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1, 6, 1.3]
    }
  },
  {
    id: 'railway_transit',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    minzoom: 16,
    filter: [
      'all',
      ['==', '$type', 'LineString'],
      ['all', ['==', 'class', 'transit'], ['!in', 'brunnel', 'tunnel']]
    ],
    layout: {
      'line-join': 'round'
    },
    paint: {
      'line-color': '#dddddd',
      'line-width': 3
    }
  },
  {
    id: 'railway_transit_dashline',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    minzoom: 16,
    filter: [
      'all',
      ['==', '$type', 'LineString'],
      ['all', ['==', 'class', 'transit'], ['!in', 'brunnel', 'tunnel']]
    ],
    layout: {
      'line-join': 'round'
    },
    paint: {
      'line-color': '#fafafa',
      'line-width': 2,
      'line-dasharray': [3, 3]
    }
  },
  {
    id: 'railway_service',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    minzoom: 16,
    filter: ['all', ['==', '$type', 'LineString'], ['all', ['==', 'class', 'rail'], ['has', 'service']]],
    layout: {
      'line-join': 'round'
    },
    paint: {
      'line-color': '#dddddd',
      'line-width': 3
    }
  },
  {
    id: 'railway_service_dashline',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    minzoom: 16,
    filter: ['all', ['==', '$type', 'LineString'], ['==', 'class', 'rail'], ['has', 'service']],
    layout: {
      'line-join': 'round'
    },
    paint: {
      'line-color': '#fafafa',
      'line-width': 2,
      'line-dasharray': [3, 3]
    }
  },
  {
    id: 'railway',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    minzoom: 7,
    filter: ['all', ['==', '$type', 'LineString'], ['all', ['!has', 'service'], ['==', 'class', 'rail']]],
    layout: {
      'line-join': 'round'
    },
    paint: {
      'line-color': '#c0c0c0',
      'line-width': ['interpolate', ['exponential', 1.3], ['zoom'], 9, 1, 20, 7]
    }
  },
  {
    id: 'railway_dashline',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    minzoom: 11,
    filter: ['all', ['==', '$type', 'LineString'], ['all', ['!has', 'service'], ['==', 'class', 'rail']]],
    layout: {
      'line-join': 'round'
    },
    paint: {
      'line-color': '#fafafa',
      'line-width': ['interpolate', ['exponential', 1.3], ['zoom'], 11, 1, 20, 6],
      'line-dasharray': [3, 3]
    }
  },
  {
    id: 'highway_motorway_bridge_casing',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    minzoom: 6,
    filter: [
      'all',
      ['==', '$type', 'LineString'],
      ['all', ['==', 'brunnel', 'bridge'], ['==', 'class', 'motorway']]
    ],
    layout: {
      'line-cap': 'butt',
      'line-join': 'miter'
    },
    paint: {
      'line-color': 'rgb(213, 213, 213)',
      'line-width': ['interpolate', ['exponential', 1.4], ['zoom'], 5.8, 0, 6, 5, 20, 45],
      'line-dasharray': [2, 0]
    }
  },
  {
    id: 'highway_motorway_bridge_inner',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    minzoom: 6,
    filter: [
      'all',
      ['==', '$type', 'LineString'],
      ['all', ['==', 'brunnel', 'bridge'], ['==', 'class', 'motorway']]
    ],
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint: {
      'line-color': ['interpolate', ['linear'], ['zoom'], 5.8, 'hsla(0, 0%, 85%, 0.53)', 6, '#fff'],
      'line-width': ['interpolate', ['exponential', 1.4], ['zoom'], 4, 2, 6, 1.3, 20, 30]
    }
  },
  {
    id: 'boundary_country',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'boundary',
    filter: ['==', 'admin_level', 2],
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint: {
      'line-color': ['interpolate-hcl', ['exponential', 1.1], ['zoom'], 2, '#99656B', 8, '#CC9BA1'],
      'line-width': ['interpolate', ['exponential', 1.1], ['zoom'], 3, 1, 22, 20],
      'line-blur': ['interpolate', ['linear'], ['zoom'], 0, 0.4, 22, 4],
      'line-dasharray': [3, 3]
    }
  },
  {
    id: 'black_marble_background',
    type: 'background',
    paint: {
      'background-color': 'rgb(3,1,19)'
    }
  },
  {
    id: 'black_marble',
    type: 'raster',
    source: 'blackmarble'
  }
]

export default layers
