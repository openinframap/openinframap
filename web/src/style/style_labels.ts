import { LayerSpecificationWithZIndex } from './types.ts'
import { get_country_name } from './protomaps_language.ts'
import { font } from './common.ts'
import { DataDrivenPropertyValueSpecification } from 'maplibre-gl'

const label_color = ['hsl(0, 0%, 20%)', 'hsl(0, 0%, 30%)', 'hsl(0, 0%, 40%)']
const text_halo_color = 'rgb(242,243,240)'

function pmLabel(lang: string): DataDrivenPropertyValueSpecification<string> {
  return get_country_name(lang, undefined) as DataDrivenPropertyValueSpecification<string>
}

export default function layers(lang: string): LayerSpecificationWithZIndex[] {
  return [
    {
      id: 'label_address',
      type: 'symbol',
      source: 'basemap',
      'source-layer': 'buildings',
      minzoom: 18,
      filter: ['==', 'kind', 'address'],
      layout: {
        'symbol-placement': 'point',
        'text-font': font,
        'text-field': ['get', 'addr_housenumber'],
        'text-size': 12
      },
      paint: {
        'text-color': label_color[2],
        'text-halo-color': text_halo_color,
        'text-halo-width': 1
      }
    },
    {
      id: 'label_water_waterway',
      type: 'symbol',
      source: 'basemap',
      'source-layer': 'water',
      minzoom: 13,
      filter: ['in', 'kind', 'river', 'stream'],
      layout: {
        'symbol-placement': 'line',
        'text-font': font,
        'text-field': pmLabel(lang),
        'text-size': 12,
        'text-letter-spacing': 0.2
      },
      paint: {
        'text-color': label_color[2],
        'text-halo-color': text_halo_color,
        'text-halo-width': 1
      }
    },
    {
      id: 'label_roads_minor',
      type: 'symbol',
      source: 'basemap',
      'source-layer': 'roads',
      minzoom: 15,
      filter: ['in', 'kind', 'minor_road', 'other', 'path'],
      layout: {
        'symbol-sort-key': ['get', 'min_zoom'],
        'symbol-placement': 'line',
        'text-font': font,
        'text-field': pmLabel(lang),
        'text-size': 12
      },
      paint: {
        'text-color': label_color[2],
        'text-halo-color': text_halo_color,
        'text-halo-width': 1
      }
    },
    {
      id: 'label_roads_major',
      type: 'symbol',
      source: 'basemap',
      'source-layer': 'roads',
      minzoom: 11,
      filter: ['in', 'kind', 'highway', 'major_road'],
      layout: {
        'symbol-sort-key': ['get', 'min_zoom'],
        'symbol-placement': 'line',
        'text-font': font,
        'text-field': pmLabel(lang),
        'text-size': 12
      },
      paint: {
        'text-color': label_color[2],
        'text-halo-color': text_halo_color,
        'text-halo-width': 1
      }
    },
    {
      id: 'label_places_subplace',
      type: 'symbol',
      source: 'basemap',
      'source-layer': 'places',
      minzoom: 13,
      maxzoom: 14,
      filter: ['==', 'kind', 'neighbourhood'],
      layout: {
        'symbol-sort-key': ['get', 'min_zoom'],
        'text-font': font,
        'text-field': pmLabel(lang),
        'text-max-width': 7,
        'text-letter-spacing': 0.1,
        'text-padding': ['interpolate', ['linear'], ['zoom'], 5, 2, 8, 4, 12, 18, 15, 20],
        'text-size': ['interpolate', ['exponential', 1.2], ['zoom'], 11, 8, 14, 14, 18, 24]
      },
      paint: {
        'text-color': label_color[2],
        'text-halo-color': text_halo_color,
        'text-halo-width': 1
      }
    },
    {
      id: 'label_places_locality',
      type: 'symbol',
      source: 'basemap',
      'source-layer': 'places',
      minzoom: 5.5,
      maxzoom: 12,
      filter: ['==', 'kind', 'locality'],
      layout: {
        'icon-size': 0.7,
        'text-font': font,
        'text-field': pmLabel(lang),
        'text-padding': ['interpolate', ['linear'], ['zoom'], 5, 3, 8, 7, 12, 11],
        'text-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          2,
          ['case', ['<', ['get', 'population_rank'], 13], 8, ['>=', ['get', 'population_rank'], 13], 13, 0],
          4,
          ['case', ['<', ['get', 'population_rank'], 13], 10, ['>=', ['get', 'population_rank'], 13], 15, 0],
          6,
          ['case', ['<', ['get', 'population_rank'], 12], 11, ['>=', ['get', 'population_rank'], 12], 17, 0],
          8,
          ['case', ['<', ['get', 'population_rank'], 11], 11, ['>=', ['get', 'population_rank'], 11], 18, 0],
          10,
          ['case', ['<', ['get', 'population_rank'], 9], 12, ['>=', ['get', 'population_rank'], 9], 20, 0],
          15,
          ['case', ['<', ['get', 'population_rank'], 8], 12, ['>=', ['get', 'population_rank'], 8], 22, 0]
        ],
        'icon-padding': ['interpolate', ['linear'], ['zoom'], 0, 0, 8, 4, 10, 8, 12, 6, 22, 2],
        'text-justify': 'auto'
      },
      paint: {
        'text-color': label_color[2],
        'text-halo-color': text_halo_color,
        'text-halo-width': 1.5
      }
    },
    {
      id: 'label_places_region',
      type: 'symbol',
      source: 'basemap',
      'source-layer': 'places',
      minzoom: 5,
      maxzoom: 8,
      filter: ['==', 'kind', 'region'],
      layout: {
        'symbol-sort-key': ['get', 'min_zoom'],
        'text-font': font,
        'text-field': pmLabel(lang),
        'text-size': ['interpolate', ['linear'], ['zoom'], 3, 7, 7, 14],
        'text-radial-offset': 0.2,
        'text-anchor': 'center'
      },
      paint: {
        'text-color': label_color[1],
        'text-halo-color': text_halo_color,
        'text-halo-width': 2
      }
    },
    {
      id: 'label_places_country',
      type: 'symbol',
      source: 'basemap',
      'source-layer': 'places',
      minzoom: 2,
      maxzoom: 8,
      filter: ['==', 'kind', 'country'],
      layout: {
        'symbol-sort-key': ['get', 'min_zoom'],
        'text-field': pmLabel(lang),
        'text-font': font,
        'text-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          2,
          ['case', ['<', ['get', 'population_rank'], 10], 7, ['>=', ['get', 'population_rank'], 10], 10, 0],
          6,
          ['case', ['<', ['get', 'population_rank'], 8], 8, ['>=', ['get', 'population_rank'], 8], 18, 0],
          8,
          ['case', ['<', ['get', 'population_rank'], 7], 11, ['>=', ['get', 'population_rank'], 7], 20, 0]
        ],
        'icon-padding': ['interpolate', ['linear'], ['zoom'], 0, 2, 14, 2, 16, 20, 17, 2, 22, 2]
      },
      paint: {
        'text-color': label_color[0],
        'text-halo-color': text_halo_color,
        'text-halo-width': 2
      }
    }
  ]
}
