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
  land: landcover_colour(42, '10%'),
  ice: landcover_colour(180, '14%'),
  urban: landcover_colour(245, '6%', '82%'),
  water: ['interpolate-lab', ['linear'], ['zoom'], 2, 'hsl(207, 25%, 75%)', 12, 'hsl(207, 14%, 86%)'],
  green: landcover_colour(90, '20%', '86%'),
  wood: landcover_colour(100, '20%', '81%'),
  sand: landcover_colour(57, '20%'),
  road_casing: 'hsl(0, 0%, 96%)',
  road_minor: 'hsl(0, 0%, 89%)',
  road_minor_low: 'hsl(0, 0%, 91%)',
  road_major: 'hsl(0, 0%, 84%)',
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
    id: 'osm_background',
    type: 'background',
    paint: {
      'background-color': colours['land']
    }
  },
  {
    id: 'osm_landuse_ice',
    type: 'fill',
    source: 'basemap',
    'source-layer': 'landuse',
    filter: ['==', 'kind', 'glacier'],
    paint: { 'fill-color': colours['ice'] }
  },
  {
    id: 'osm_landcover_ice',
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
    id: 'osm_landuse_sand',
    type: 'fill',
    source: 'basemap',
    'source-layer': 'landuse',
    filter: ['in', 'kind', 'beach', 'sand'],
    paint: { 'fill-color': colours['sand'] }
  },
  {
    id: 'osm_landcover_sand',
    type: 'fill',
    source: 'basemap',
    'source-layer': 'landcover',
    filter: ['==', 'kind', 'barren'],
    paint: { 'fill-color': colours['sand'], 'fill-opacity': landcover_opacity }
  },
  {
    id: 'osm_landuse_green',
    type: 'fill',
    source: 'basemap',
    'source-layer': 'landuse',
    filter: [
      'in',
      'kind',
      'scrub',
      'grassland',
      'grass',
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
    id: 'osm_landcover_green',
    type: 'fill',
    source: 'basemap',
    'source-layer': 'landcover',
    filter: ['in', 'kind', 'scrub', 'grassland', 'grass', 'farmland'],
    paint: { 'fill-color': colours['green'], 'fill-opacity': landcover_opacity }
  },
  {
    id: 'osm_landuse_wood',
    type: 'fill',
    source: 'basemap',
    'source-layer': 'landuse',
    filter: ['in', 'kind', 'wood', 'forest'],
    paint: { 'fill-color': colours['wood'] }
  },
  {
    id: 'osm_landcover_wood',
    type: 'fill',
    source: 'basemap',
    'source-layer': 'landcover',
    filter: ['in', 'kind', 'forest'],
    paint: { 'fill-color': colours['wood'], 'fill-opacity': landcover_opacity }
  },
  {
    id: 'osm_landuse_urban',
    type: 'fill',
    source: 'basemap',
    'source-layer': 'landuse',
    filter: [
      'in',
      'kind',
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
    id: 'osm_landcover_urban',
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
    id: 'osm_water',
    type: 'fill',
    source: 'basemap',
    'source-layer': 'water',
    filter: ['==', '$type', 'Polygon'],
    paint: { 'fill-color': colours['water'] }
  },
  {
    id: 'osm_water_stream',
    type: 'line',
    source: 'basemap',
    'source-layer': 'water',
    minzoom: 14,
    filter: ['in', 'kind', 'stream'],
    paint: { 'line-color': colours['water'], 'line-width': 0.5 }
  },
  {
    id: 'osm_water_river',
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
    id: 'osm_landuse_pedestrian',
    type: 'fill',
    source: 'basemap',
    'source-layer': 'landuse',
    filter: ['in', 'kind', 'pedestrian', 'dam'],
    paint: { 'fill-color': colours['road_minor'] }
  },
  {
    id: 'osm_landuse_pier',
    type: 'fill',
    source: 'basemap',
    'source-layer': 'landuse',
    filter: ['==', 'kind', 'pier'],
    paint: { 'fill-color': colours['road_minor'] }
  },
  {
    id: 'osm_roads_tunnels_other_casing',
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
    id: 'osm_roads_tunnels_minor_casing',
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
    id: 'osm_roads_tunnels_link_casing',
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
    id: 'osm_roads_tunnels_major_casing',
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
    id: 'osm_roads_tunnels_highway_casing',
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
    id: 'osm_roads_tunnels_other',
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
    id: 'osm_roads_tunnels_minor',
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
    id: 'osm_roads_tunnels_link',
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
    id: 'osm_roads_tunnels_major',
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
    id: 'osm_roads_tunnels_highway',
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
    id: 'osm_buildings',
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
    id: 'osm_roads_pier',
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
    id: 'osm_roads_minor_service_casing',
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
    id: 'osm_roads_minor_casing',
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
    id: 'osm_roads_link_casing',
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
    id: 'osm_roads_major_casing_late',
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
    id: 'osm_roads_highway_casing_late',
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
    id: 'osm_roads_other',
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
    id: 'osm_roads_link',
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
    id: 'osm_roads_minor_service',
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
    id: 'osm_roads_minor',
    type: 'line',
    source: 'basemap',
    'source-layer': 'roads',
    filter: ['all', ['!has', 'is_tunnel'], ['==', 'kind', 'minor_road'], ['!=', 'kind_detail', 'service']],
    paint: {
      'line-color': [
        'interpolate',
        ['exponential', 1.6],
        ['zoom'],
        11,
        colours['road_minor_low'],
        16,
        colours['road_minor']
      ],
      'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 11, 0, 12.5, 1, 18, road_base_size * 1.2]
    }
  },
  {
    id: 'osm_roads_major',
    type: 'line',
    source: 'basemap',
    'source-layer': 'roads',
    filter: ['all', ['!has', 'is_tunnel'], ['==', 'kind', 'major_road']],
    paint: {
      'line-color': colours['road_major'],
      'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 6, 0, 18, road_base_size * 1.6]
    }
  },
  {
    id: 'osm_roads_highway',
    type: 'line',
    source: 'basemap',
    'source-layer': 'roads',
    filter: ['all', ['!has', 'is_tunnel'], ['==', 'kind', 'highway'], ['!has', 'is_link']],
    paint: {
      'line-color': colours['road_major'],
      'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 3, 0, 6, 1.1, 18, road_base_size * 2]
    }
  },
  {
    id: 'osm_taxiway',
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
    id: 'osm_runway',
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
    id: 'osm_landuse_runway',
    type: 'fill',
    source: 'basemap',
    'source-layer': 'landuse',
    filter: ['any', ['in', 'kind', 'runway', 'taxiway']],
    paint: { 'fill-color': '#efefef' }
  },
  {
    id: 'osm_runway_centreline',
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
    id: 'osm_rail_case',
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
    id: 'osm_rail',
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
    id: 'black_marble_background',
    type: 'background',
    paint: {
      'background-color': 'rgb(0,0,0)'
    }
  },
  {
    id: 'black_marble',
    type: 'raster',
    source: 'blackmarble'
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
  }
]

export default layers
