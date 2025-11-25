import { LayerSpecificationWithZIndex } from './types.ts'
import { text_paint, operator_text, font, oimSymbol, construction_p, disused_p } from './common.js'
import { get_local_name } from './common.ts'
import { all, get, interpolate, match, not, rgb, zoom } from './stylehelpers.ts'

export default function layers(): LayerSpecificationWithZIndex[] {
  return [
    {
      zorder: 40,
      id: 'telecoms_line',
      type: 'line',
      source: 'telecoms',
      minzoom: 2,
      filter: all(not(construction_p), not(disused_p)),
      'source-layer': 'telecoms_communication_line',
      paint: {
        'line-color': '#61637A',
        'line-width': interpolate(zoom, [
          [3, 0.3],
          [11, 2]
        ]),
        'line-dasharray': [3, 2]
      }
    },
    {
      zorder: 140,
      id: 'telecoms_data_center',
      type: 'fill',
      source: 'telecoms',
      filter: all(not(construction_p), not(disused_p)),
      minzoom: 10,
      'source-layer': 'telecoms_data_center',
      paint: {
        'fill-opacity': 0.3,
        'fill-color': '#7D59AB',
        'fill-outline-color': rgb(0, 0, 0)
      }
    },
    oimSymbol({
      zorder: 560,
      id: 'telecoms_cabinet',
      source: 'telecoms',
      sourceLayer: 'telecoms_cabinet',
      minZoom: 14,
      textField: operator_text,
      iconImage: 'cabinet',
      iconScale: 0.4,
      textMinZoom: 16
    }),
    oimSymbol({
      zorder: 561,
      id: 'telecoms_mast',
      source: 'telecoms',
      sourceLayer: 'telecoms_mast',
      filter: all(not(construction_p), not(disused_p)),
      minZoom: 10,
      iconScale: 0.5,
      textField: operator_text,
      iconImage: 'comms_tower',
      iconAnchor: 'bottom',
      iconMaxZoom: 21,
      textMinZoom: 12,
      textOffset: 3
    }),
    oimSymbol({
      zorder: 562,
      id: 'telecoms_exchange_symbol',
      source: 'telecoms',
      sourceLayer: 'telecoms_data_center_point',
      filter: all(
        match(
          get('type'),
          [[['exchange', 'telephone_office', 'telephone_exchange', 'central_office'], true]],
          false
        ),
        not(construction_p),
        not(disused_p)
      ),
      minZoom: 6.5,
      textField: operator_text,
      iconImage: 'telecom_exchange',
      iconScale: 0.4,
      textMinZoom: 11.5,
      iconMaxZoom: 13.5
    }),
    oimSymbol({
      zorder: 563,
      id: 'telecoms_data_center_symbol',
      source: 'telecoms',
      sourceLayer: 'telecoms_data_center_point',
      filter: all(
        match(get('type'), [[['data_center', 'data_centre'], true]], false),
        not(construction_p),
        not(disused_p)
      ),
      minZoom: 5,
      textField: operator_text,
      iconImage: 'telecom_datacenter',
      iconScale: 0.6,
      textMinZoom: 8,
      iconMaxZoom: 13.5,
      textOffset: 1.4
    }),
    {
      zorder: 564,
      id: 'telecoms_line_label',
      type: 'symbol',
      source: 'telecoms',
      minzoom: 9,
      'source-layer': 'telecoms_communication_line',
      filter: all(not(construction_p), not(disused_p)),
      paint: text_paint,
      layout: {
        'text-field': get_local_name(),
        'text-font': font,
        'symbol-placement': 'line',
        'symbol-spacing': 400,
        'text-size': 10,
        'text-offset': [0, 1],
        'text-max-angle': 10
      }
    }
  ]
}
