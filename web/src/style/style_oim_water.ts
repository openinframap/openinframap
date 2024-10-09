import { LayerSpecificationWithZIndex } from './types.ts'
import { text_paint, font } from './common.js'
import { ExpressionSpecification } from 'maplibre-gl'

const colour_freshwater = '#7B7CBA'
const colour_wastewater = '#BAA87B'
const colour_hotwater = '#AD4C4C'
const colour_steam = '#7BBAAC'

const substance_label: ExpressionSpecification = [
  'match',
  ['get', 'substance'],
  'water',
  'Water',
  'rainwater',
  'Rainwater',
  'hot_water',
  'Hot Water',
  'wastewater',
  'Wastewater',
  'sewage',
  'Sewage',
  'waterwaste',
  'Waterwaste',
  'steam',
  'Steam',
  ['get', 'substance']
]

const substance_colour: ExpressionSpecification = [
  'match',
  ['get', 'substance'],
  'water',
  colour_freshwater,
  'rainwater',
  colour_freshwater,
  'hot_water',
  colour_hotwater,
  'wastewater',
  colour_wastewater,
  'sewage',
  colour_wastewater,
  'waterwaste',
  colour_wastewater,
  'steam',
  colour_steam,
  '#7B7CBA'
]

const reservoir_colour: ExpressionSpecification = [
  'match',
  ['get', 'type'],
  'reservoir_covered',
  '#8e8e9a',
  '#3a85d9'
]

const layers: LayerSpecificationWithZIndex[] = [
  {
    zorder: 19,
    id: 'water_treatment_plant',
    type: 'fill',
    source: 'water',
    minzoom: 10,
    'source-layer': 'water_treatment_plant_polygon',
    paint: {
      'fill-color': '#7BBAAC',
      'fill-opacity': 0.3,
      'fill-outline-color': 'rgba(0, 0, 0, 1)'
    }
  },
  {
    zorder: 19,
    id: 'water_sewage_treatment_plant',
    type: 'fill',
    source: 'water',
    minzoom: 10,
    'source-layer': 'wastewater_plant_polygon',
    paint: {
      'fill-color': '#c19653',
      'fill-opacity': 0.3,
      'fill-outline-color': 'rgba(0, 0, 0, 1)'
    }
  },
  {
    zorder: 19,
    id: 'water_pumping_station',
    type: 'fill',
    source: 'water',
    minzoom: 10,
    'source-layer': 'pumping_station_polygon',
    paint: {
      'fill-color': '#7B7CBA',
      'fill-opacity': 0.3,
      'fill-outline-color': 'rgba(0, 0, 0, 1)'
    }
  },
  {
    zorder: 20,
    id: 'water_reservoir',
    type: 'fill',
    source: 'water',
    minzoom: 4,
    'source-layer': 'water_reservoir',
    paint: {
      'fill-color': reservoir_colour,
      'fill-opacity': 1,
      'fill-outline-color': 'rgba(0, 0, 0, 1)',
      'fill-antialias': true
    }
  },
  {
    zorder: 20,
    id: 'water_pipeline_case',
    type: 'line',
    source: 'water',
    minzoom: 7,
    'source-layer': 'water_pipeline',
    paint: {
      'line-color': '#777777',
      'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.5, 16, 7]
    },
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    }
  },
  {
    zorder: 21,
    id: 'water_pipeline',
    type: 'line',
    source: 'water',
    minzoom: 3,
    'source-layer': 'water_pipeline',
    paint: {
      'line-color': substance_colour,
      'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.3, 16, 4]
    }
  },
  {
    zorder: 21,
    id: 'water_pressurised',
    type: 'line',
    source: 'water',
    minzoom: 3,
    'source-layer': 'pressurised_waterway',
    paint: {
      'line-color': substance_colour,
      'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.3, 16, 4]
    }
  },
  {
    zorder: 518,
    id: 'water_reservoir_label',
    type: 'symbol',
    source: 'water',
    'source-layer': 'water_reservoir_point',
    minzoom: 11,
    paint: text_paint,
    layout: {
      'text-field': ['get', 'name'],
      'text-font': font,
      'text-size': ['interpolate', ['linear'], ['zoom'], 11, 9, 18, 17],
      'text-anchor': 'top',
      'text-offset': [0, 1]
    }
  },
  {
    zorder: 519,
    id: 'water_pipeline_label',
    type: 'symbol',
    source: 'water',
    'source-layer': 'water_pipeline',
    minzoom: 11,
    paint: text_paint,
    layout: {
      'text-field': [
        'case',
        ['has', 'name'],
        ['concat', ['get', 'name'], ' (', substance_label, ')'],
        substance_label
      ],
      'text-font': font,
      'symbol-placement': 'line',
      'symbol-spacing': 400,
      'text-size': 10,
      'text-offset': [0, 1],
      'text-max-angle': 10
    }
  },
  {
    zorder: 520,
    id: 'water_pumping_station_symbol',
    type: 'symbol',
    source: 'water',
    'source-layer': 'pumping_station_point',
    minzoom: 9,
    layout: {
      'icon-image': [
        'match',
        ['get', 'substance'],
        'water',
        'water_pumping_station',
        'sewage',
        'sewage_pumping_station',
        'pumping_station'
      ],
      'icon-size': ['interpolate', ['linear'], ['zoom'], 9, 0.08, 12.5, 0.25],
      'text-field': ['step', ['zoom'], '', 10, ['get', 'name']],
      'text-font': font,
      'text-size': ['interpolate', ['linear'], ['zoom'], 11, 10, 18, 16],
      'text-anchor': 'top',
      'text-offset': [0, 1],
      'icon-allow-overlap': true,
      'text-optional': true
    },
    paint: {
      ...text_paint,
      // Control visibility using the opacity property...
      'icon-opacity': ['step', ['zoom'], 1, 13, ['case', ['get', 'is_node'], 1, 0]]
    }
  },
  {
    zorder: 521,
    id: 'water_treatment_plant_symbol',
    type: 'symbol',
    source: 'water',
    'source-layer': 'water_treatment_plant_point',
    minzoom: 8,
    layout: {
      'icon-image': 'water_treatment_plant',
      'icon-size': ['interpolate', ['linear'], ['zoom'], 8, 0.1, 10, 0.2],
      'text-field': ['step', ['zoom'], '', 10, ['get', 'name']],
      'text-font': font,
      'text-size': ['interpolate', ['linear'], ['zoom'], 11, 10, 18, 16],
      'text-anchor': 'top',
      'text-offset': [0, 1],
      'icon-allow-overlap': true,
      'text-optional': true
    },
    paint: {
      ...text_paint,
      // Control visibility using the opacity property...
      'icon-opacity': ['step', ['zoom'], 1, 12, 0]
    }
  },
  {
    zorder: 522,
    id: 'water_sewage_treatment_plant_symbol',
    type: 'symbol',
    source: 'water',
    'source-layer': 'wastewater_plant_point',
    minzoom: 8,
    layout: {
      'icon-image': 'sewage_treatment_plant',
      'icon-size': ['interpolate', ['linear'], ['zoom'], 8, 0.1, 10, 0.2],
      'text-field': ['step', ['zoom'], '', 10, ['get', 'name']],
      'text-font': font,
      'text-size': ['interpolate', ['linear'], ['zoom'], 11, 10, 18, 16],
      'text-anchor': 'top',
      'text-offset': [0, 1],
      'icon-allow-overlap': true,
      'text-optional': true
    },
    paint: {
      ...text_paint,
      // Control visibility using the opacity property...
      'icon-opacity': ['step', ['zoom'], 1, 12, 0]
    }
  }
]

export { layers as default, colour_freshwater, colour_wastewater, colour_hotwater, colour_steam }
