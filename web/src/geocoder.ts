import i18next from 'i18next'
import { el } from 'redom'
import { IControl, LngLat, LngLatBounds, Map } from 'maplibre-gl'
import { OpenCageGeoSearchPlugin } from '@opencage/geosearch-core'
import { autocomplete } from '@algolia/autocomplete-js'
import '@algolia/autocomplete-theme-classic'

export default class OpenInfraMapGeocoder implements IControl {
  map?: Map
  container?: HTMLElement

  onAdd(map: Map): HTMLElement {
    this.map = map
    this.container = el('div.maplibregl-ctrl#geo-search')
    autocomplete({
      container: this.container,
      plugins: [
        OpenCageGeoSearchPlugin(
          {
            // This key only works on openinframap.org (and local dev).
            // Thanks to OpenCage for sponsoring!
            key: 'oc_gs_a595f2059dee41d6b7073647aec5c303',
            language: i18next.language
          },
          {
            onSelect: ({ item }) => {
              if (item.bounds) {
                const bounds = new LngLatBounds(
                  new LngLat(item.bounds.southwest.lng, item.bounds.southwest.lat),
                  new LngLat(item.bounds.northeast.lng, item.bounds.northeast.lat)
                )
                map.fitBounds(bounds, { padding: 50 })
              } else {
                map.flyTo({
                  center: [item.geometry.lng, item.geometry.lat],
                  zoom: 12
                })
              }
            }
          }
        )
      ]
    })
    return this.container
  }

  onRemove(): void {}
}
