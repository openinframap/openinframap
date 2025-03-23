import { DataDrivenPropertyValueSpecification } from 'maplibre-gl'
import { LayerSpecificationWithZIndex } from './types.ts'
// Base style, adapted from the Protomaps style.

function landcover_colour(hue: any, sat: any, initial_lum = '85%') {
  return [
    'interpolate-lab',
    ['linear'],
    ['zoom'],
    2,
    `hsl(${hue}, ${sat}, ${initial_lum})`,
    6,
    `hsl(${hue}, ${sat}, 93%)`
  ]
}

const colours: Record<string, any> = {
  background: 'rgb(242,243,240)',
  land: landcover_colour(42, '10%'),
  ice: landcover_colour(180, '10%'),
  urban: landcover_colour(245, '9%', '82%'),
  water: ['interpolate-lab', ['linear'], ['zoom'], 2, 'hsl(207, 25%, 75%)', 12, 'hsl(207, 14%, 86%)'],
  green: landcover_colour(115, '9%', '86%'),
  wood: landcover_colour(100, '20%', '81%'),
  road_casing: 'hsl(0, 0%, 96%)',
  road_minor: 'hsl(0, 0%, 88%)',
  road_major: 'hsl(0, 0%, 86%)',
  rail_2: 'hsl(0, 0%, 92%)',
  rail: 'hsl(0, 0%, 80%)',
  border: ['interpolate-lab', ['linear'], ['zoom'], 2, 'hsl(0, 30%, 60%)', 12, 'hsl(0, 10%, 80%)']
}

const road_base_size = 18
const rail_base_size = 10

const landcover_opacity: DataDrivenPropertyValueSpecification<number> = [
  'interpolate',
  ['linear'],
  ['zoom'],
  6,
  1,
  7,
  0
]

const layers: LayerSpecificationWithZIndex[] = [
  {
    id: 'background',
    type: 'background',
    paint: {
      'background-color': colours['background']
    }
  },
  {
    id: 'earth',
    type: 'fill',
    source: 'basemap',
    'source-layer': 'earth',
    filter: ['==', '$type', 'Polygon'],
    paint: { 'fill-color': colours['land'] }
  },
  {
    id: 'landuse_ice',
    type: 'fill',
    source: 'basemap',
    'source-layer': 'landuse',
    filter: ['==', 'kind', 'glacier'],
    paint: { 'fill-color': colours['ice'] }
  },
  {
    id: 'landcover_ice',
    type: 'fill',
    source: 'basemap',
    'source-layer': 'landcover',
    filter: ['==', 'kind', 'glacier'],
    paint: {
      'fill-color': colours['ice'],
      'fill-opacity': landcover_opacity
    }
  },
  {
    id: 'landuse_green',
    type: 'fill',
    source: 'basemap',
    'source-layer': 'landuse',
    filter: [
      'in',
      'kind',
      'scrub',
      'grassland',
      'grass',
      'national_park',
      'park',
      'cemetery',
      'protected_area',
      'nature_reserve',
      'golf_course',
      'allotments',
      'village_green',
      'playground',
      'farmland',
      'cemetery',
      'orchard'
    ],
    paint: { 'fill-color': colours['green'] }
  },
  {
    id: 'landcover_green',
    type: 'fill',
    source: 'basemap',
    'source-layer': 'landcover',
    filter: ['in', 'kind', 'scrub', 'grassland', 'grass', 'farmland'],
    paint: { 'fill-color': colours['green'], 'fill-opacity': landcover_opacity }
  },
  {
    id: 'landuse_wood',
    type: 'fill',
    source: 'basemap',
    'source-layer': 'landuse',
    filter: ['in', 'kind', 'wood', 'forest'],
    paint: { 'fill-color': colours['wood'] }
  },
  {
    id: 'landcover_wood',
    type: 'fill',
    source: 'basemap',
    'source-layer': 'landcover',
    filter: ['in', 'kind', 'forest'],
    paint: { 'fill-color': colours['wood'], 'fill-opacity': landcover_opacity }
  },
  {
    id: 'landuse_urban',
    type: 'fill',
    source: 'basemap',
    'source-layer': 'landuse',
    filter: [
      'in',
      'kind',
      'military',
      'naval_base',
      'aerodrome',
      'commercial',
      'industrial',
      'residential',
      'farmyard',
      'hospital',
      'university'
    ],
    paint: {
      'fill-color': colours['urban']
    }
  },
  {
    id: 'landcover_urban',
    type: 'fill',
    source: 'basemap',
    'source-layer': 'landcover',
    filter: ['==', 'kind', 'urban_area'],
    paint: {
      'fill-color': colours['urban'],
      'fill-opacity': landcover_opacity
    }
  },
  {
    id: 'water',
    type: 'fill',
    source: 'basemap',
    'source-layer': 'water',
    filter: ['==', '$type', 'Polygon'],
    paint: { 'fill-color': colours['water'] }
  },
  {
    id: 'water_stream',
    type: 'line',
    source: 'basemap',
    'source-layer': 'water',
    minzoom: 14,
    filter: ['in', 'kind', 'stream'],
    paint: { 'line-color': colours['water'], 'line-width': 0.5 }
  },
  {
    id: 'water_river',
    type: 'line',
    source: 'basemap',
    'source-layer': 'water',
    minzoom: 9,
    filter: ['in', 'kind', 'river'],
    paint: {
      'line-color': colours['water'],
      'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 9, 0, 9.5, 1, 18, 12]
    }
  },
  {
    id: 'landuse_pedestrian',
    type: 'fill',
    source: 'basemap',
    'source-layer': 'landuse',
    filter: ['in', 'kind', 'pedestrian', 'dam'],
    paint: { 'fill-color': colours['road_minor'] }
  },
  {
    id: 'landuse_pier',
    type: 'fill',
    source: 'basemap',
    'source-layer': 'landuse',
    filter: ['==', 'kind', 'pier'],
    paint: { 'fill-color': colours['road_minor'] }
  },
  {
    id: 'roads_tunnels_other_casing',
    type: 'line',
    source: 'basemap',
    'source-layer': 'roads',
    filter: ['all', ['has', 'is_tunnel'], ['in', 'kind', 'other', 'path']],
    paint: {
      'line-color': '#d6d6d6',
      'line-gap-width': ['interpolate', ['exponential', 1.6], ['zoom'], 14, 0, 20, 7]
    }
  },
  {
    id: 'roads_tunnels_minor_casing',
    type: 'line',
    source: 'basemap',
    'source-layer': 'roads',
    filter: ['all', ['has', 'is_tunnel'], ['==', 'kind', 'minor_road']],
    paint: {
      'line-color': '#fcfcfc',
      'line-dasharray': [3, 2],
      'line-gap-width': ['interpolate', ['exponential', 1.6], ['zoom'], 11, 0, 12.5, 0.5, 15, 2, 18, 11],
      'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 12, 0, 12.5, 1]
    }
  },
  {
    id: 'roads_tunnels_link_casing',
    type: 'line',
    source: 'basemap',
    'source-layer': 'roads',
    filter: ['all', ['has', 'is_tunnel'], ['has', 'is_link']],
    paint: {
      'line-color': '#fcfcfc',
      'line-dasharray': [3, 2],
      'line-gap-width': ['interpolate', ['exponential', 1.6], ['zoom'], 13, 0, 13.5, 1, 18, 11],
      'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 12, 0, 12.5, 1]
    }
  },
  {
    id: 'roads_tunnels_major_casing',
    type: 'line',
    source: 'basemap',
    'source-layer': 'roads',
    filter: ['all', ['!has', 'is_tunnel'], ['!has', 'is_bridge'], ['==', 'kind', 'major_road']],
    paint: {
      'line-color': '#fcfcfc',
      'line-dasharray': [3, 2],
      'line-gap-width': ['interpolate', ['exponential', 1.6], ['zoom'], 7, 0, 7.5, 0.5, 18, 13],
      'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 9, 0, 9.5, 1]
    }
  },
  {
    id: 'roads_tunnels_highway_casing',
    type: 'line',
    source: 'basemap',
    'source-layer': 'roads',
    filter: [
      'all',
      ['!has', 'is_tunnel'],
      ['!has', 'is_bridge'],
      ['==', 'kind', 'highway'],
      ['!has', 'is_link']
    ],
    paint: {
      'line-color': '#fcfcfc',
      'line-dasharray': [6, 0.5],
      'line-gap-width': ['interpolate', ['exponential', 1.6], ['zoom'], 3, 0, 3.5, 0.5, 18, 15],
      'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 7, 0, 7.5, 1, 20, 15]
    }
  },
  {
    id: 'roads_tunnels_other',
    type: 'line',
    source: 'basemap',
    'source-layer': 'roads',
    filter: ['all', ['has', 'is_tunnel'], ['in', 'kind', 'other', 'path']],
    paint: {
      'line-color': '#d6d6d6',
      'line-dasharray': [4.5, 0.5],
      'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 14, 0, 20, 7]
    }
  },
  {
    id: 'roads_tunnels_minor',
    type: 'line',
    source: 'basemap',
    'source-layer': 'roads',
    filter: ['all', ['has', 'is_tunnel'], ['==', 'kind', 'minor_road']],
    paint: {
      'line-color': '#d6d6d6',
      'line-width': [
        'interpolate',
        ['exponential', 1.6],
        ['zoom'],
        11,
        0,
        12.5,
        0.5,
        15,
        2,
        18,
        road_base_size
      ]
    }
  },
  {
    id: 'roads_tunnels_link',
    type: 'line',
    source: 'basemap',
    'source-layer': 'roads',
    filter: ['all', ['has', 'is_tunnel'], ['has', 'is_link']],
    paint: {
      'line-color': '#d6d6d6',
      'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 13, 0, 13.5, 1, 18, road_base_size]
    }
  },
  {
    id: 'roads_tunnels_major',
    type: 'line',
    source: 'basemap',
    'source-layer': 'roads',
    filter: ['all', ['has', 'is_tunnel'], ['==', 'kind', 'major_road']],
    paint: {
      'line-color': '#d6d6d6',
      'line-width': [
        'interpolate',
        ['exponential', 1.6],
        ['zoom'],
        6,
        0,
        12,
        1.6,
        15,
        3,
        18,
        road_base_size * 1.2
      ]
    }
  },
  {
    id: 'roads_tunnels_highway',
    type: 'line',
    source: 'basemap',
    'source-layer': 'roads',
    filter: ['all', ['has', 'is_tunnel'], ['==', ['get', 'kind'], 'highway'], ['!', ['has', 'is_link']]],
    paint: {
      'line-color': '#d6d6d6',
      'line-width': [
        'interpolate',
        ['exponential', 1.6],
        ['zoom'],
        3,
        0,
        6,
        1.1,
        12,
        1.6,
        15,
        5,
        18,
        road_base_size * 2
      ]
    }
  },
  {
    id: 'buildings',
    type: 'fill',
    source: 'basemap',
    'source-layer': 'buildings',
    filter: ['in', 'kind', 'building', 'building_part'],
    paint: {
      'fill-color': [
        'interpolate-lab',
        ['linear'],
        ['zoom'],
        10,
        'hsl(32, 12%, 96%)',
        15,
        'hsl(32, 12%, 90%)',
        19,
        'hsl(32, 12%, 85%)'
      ]
    }
  },
  {
    id: 'roads_pier',
    type: 'line',
    source: 'basemap',
    'source-layer': 'roads',
    filter: ['==', 'kind_detail', 'pier'],
    paint: {
      'line-color': '#efefef',
      'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 12, 0, 12.5, 0.5, 20, 16]
    }
  },
  {
    id: 'roads_minor_service_casing',
    type: 'line',
    source: 'basemap',
    'source-layer': 'roads',
    minzoom: 13,
    filter: ['all', ['!has', 'is_tunnel'], ['==', 'kind', 'minor_road'], ['==', 'kind_detail', 'service']],
    paint: {
      'line-color': colours['road_casing'],
      'line-gap-width': ['interpolate', ['exponential', 1.6], ['zoom'], 13, 0, 18, 8],
      'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 13, 0, 13.5, 0.8]
    }
  },
  {
    id: 'roads_minor_casing',
    type: 'line',
    source: 'basemap',
    'source-layer': 'roads',
    filter: ['all', ['!has', 'is_tunnel'], ['==', 'kind', 'minor_road'], ['!=', 'kind_detail', 'service']],
    paint: {
      'line-color': colours['road_casing'],
      'line-gap-width': ['interpolate', ['exponential', 1.6], ['zoom'], 11, 0, 12.5, 0.5, 15, 2, 18, 11],
      'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 12, 0, 12.5, 1]
    }
  },
  {
    id: 'roads_link_casing',
    type: 'line',
    source: 'basemap',
    'source-layer': 'roads',
    minzoom: 13,
    filter: ['has', 'is_link'],
    paint: {
      'line-color': colours['road_casing'],
      'line-gap-width': ['interpolate', ['exponential', 1.6], ['zoom'], 13, 0, 13.5, 1, 18, 11],
      'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 13, 0, 13.5, 1.5]
    }
  },
  {
    id: 'roads_major_casing_late',
    type: 'line',
    source: 'basemap',
    'source-layer': 'roads',
    minzoom: 12,
    filter: ['all', ['!has', 'is_tunnel'], ['==', 'kind', 'major_road']],
    paint: {
      'line-color': colours['road_casing'],
      'line-gap-width': ['interpolate', ['exponential', 1.6], ['zoom'], 6, 0, 12, 1.6, 15, 3, 18, 13],
      'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 9, 0, 9.5, 1]
    }
  },
  {
    id: 'roads_highway_casing_late',
    type: 'line',
    source: 'basemap',
    'source-layer': 'roads',
    minzoom: 12,
    filter: ['all', ['!has', 'is_tunnel'], ['==', 'kind', 'highway'], ['!has', 'is_link']],
    paint: {
      'line-color': colours['road_casing'],
      'line-gap-width': ['interpolate', ['exponential', 1.6], ['zoom'], 3, 0, 3.5, 0.5, 18, 15],
      'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 7, 0, 7.5, 1, 20, 15]
    }
  },
  {
    id: 'roads_other',
    type: 'line',
    source: 'basemap',
    'source-layer': 'roads',
    filter: ['all', ['!has', 'is_tunnel'], ['in', 'kind', 'other', 'path'], ['!=', 'kind_detail', 'pier']],
    paint: {
      'line-color': colours['road_minor'],
      'line-dasharray': [3, 1],
      'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 14, 0, 20, road_base_size]
    }
  },
  {
    id: 'roads_link',
    type: 'line',
    source: 'basemap',
    'source-layer': 'roads',
    filter: ['has', 'is_link'],
    paint: {
      'line-color': colours['road_minor'],
      'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 13, 0, 13.5, 1, 18, road_base_size]
    }
  },
  {
    id: 'roads_minor_service',
    type: 'line',
    source: 'basemap',
    'source-layer': 'roads',
    filter: ['all', ['!has', 'is_tunnel'], ['==', 'kind', 'minor_road'], ['==', 'kind_detail', 'service']],
    paint: {
      'line-color': colours['road_minor'],
      'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 13, 0, 18, road_base_size]
    }
  },
  {
    id: 'roads_minor',
    type: 'line',
    source: 'basemap',
    'source-layer': 'roads',
    filter: ['all', ['!has', 'is_tunnel'], ['==', 'kind', 'minor_road'], ['!=', 'kind_detail', 'service']],
    paint: {
      'line-color': ['interpolate', ['exponential', 1.6], ['zoom'], 11, '#ebebeb', 16, colours['road_minor']],
      'line-width': [
        'interpolate',
        ['exponential', 1.6],
        ['zoom'],
        11,
        0,
        12.5,
        0.5,
        15,
        2,
        18,
        road_base_size * 1.2
      ]
    }
  },
  {
    id: 'roads_major',
    type: 'line',
    source: 'basemap',
    'source-layer': 'roads',
    filter: ['all', ['!has', 'is_tunnel'], ['==', 'kind', 'major_road']],
    paint: {
      'line-color': colours['road_major'],
      'line-width': [
        'interpolate',
        ['exponential', 1.6],
        ['zoom'],
        6,
        0,
        12,
        1.6,
        15,
        3,
        18,
        road_base_size * 1.6
      ]
    }
  },
  {
    id: 'roads_highway',
    type: 'line',
    source: 'basemap',
    'source-layer': 'roads',
    filter: ['all', ['!has', 'is_tunnel'], ['==', 'kind', 'highway'], ['!has', 'is_link']],
    paint: {
      'line-color': colours['road_major'],
      'line-width': [
        'interpolate',
        ['exponential', 1.6],
        ['zoom'],
        3,
        0,
        6,
        1.1,
        12,
        1.6,
        15,
        5,
        18,
        road_base_size * 2
      ]
    }
  },
  {
    id: 'roads_taxiway',
    type: 'line',
    source: 'basemap',
    'source-layer': 'roads',
    filter: ['==', 'kind_detail', 'taxiway'],
    paint: {
      'line-color': colours['road_major'],
      'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 10, 0, 12, 2, 20, 100]
    }
  },
  {
    id: 'roads_runway',
    type: 'line',
    source: 'basemap',
    'source-layer': 'roads',
    filter: ['==', 'kind_detail', 'runway'],
    layout: {
      'line-cap': 'round'
    },
    paint: {
      'line-color': colours['road_major'],
      'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 10, 0, 12, 6, 20, 250]
    }
  },
  {
    id: 'landuse_runway',
    type: 'fill',
    source: 'basemap',
    'source-layer': 'landuse',
    filter: ['any', ['in', 'kind', 'runway', 'taxiway']],
    paint: { 'fill-color': '#efefef' }
  },
  {
    id: 'roads_runway_centreline',
    type: 'line',
    source: 'basemap',
    'source-layer': 'roads',
    filter: ['==', 'kind_detail', 'runway'],
    minzoom: 12,
    layout: {
      'line-cap': 'round'
    },
    paint: {
      'line-color': '#ffffff',
      'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 12, 2, 20, 4],
      'line-dasharray': ['step', ['zoom'], ['literal', [2]], 14, ['literal', [2, 4]]]
    }
  },
  {
    id: 'roads_rail_case',
    type: 'line',
    source: 'basemap',
    'source-layer': 'roads',
    filter: ['==', 'kind', 'rail'],
    paint: {
      'line-color': colours['rail_2'],
      'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 3, 0, 6, 1.1, 18, rail_base_size]
    }
  },
  {
    id: 'roads_rail',
    type: 'line',
    source: 'basemap',
    'source-layer': 'roads',
    filter: ['==', 'kind', 'rail'],
    paint: {
      'line-dasharray': [3, 5],
      'line-color': colours['rail'],
      'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 3, 0, 6, 1.1, 18, rail_base_size]
    }
  },
  {
    id: 'boundaries_country',
    type: 'line',
    source: 'basemap',
    'source-layer': 'boundaries',
    filter: ['<=', 'kind_detail', 2],
    layout: { 'line-join': 'round' },
    paint: {
      'line-color': colours['border'],
      'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.5, 20, 9],
      'line-dasharray': [2, 1]
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
