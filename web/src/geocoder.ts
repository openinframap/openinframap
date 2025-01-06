import i18next from 'i18next'
import { el } from 'redom'
import { IControl, LngLat, LngLatBounds, Map, Marker } from 'maplibre-gl'
import { convert as convert_coords } from 'geo-coordinates-parser'
import { OpenCageGeoSearchPlugin } from '@opencage/geosearch-core'
import { autocomplete, AutocompletePlugin } from '@algolia/autocomplete-js'
import '@algolia/autocomplete-theme-classic'

function latLonSearchPlugin(map: Map): AutocompletePlugin<any, any> {
  return {
    getSources() {
      let marker: Marker | null = null
      return [
        {
          sourceId: 'lat-lon',
          getItems({ query }) {
            if (marker) {
              marker.remove()
              marker = null
            }
            if (!query) {
              return []
            }

            let coords
            try {
              coords = convert_coords(query)
            } catch {
              return []
            }

            return [
              {
                label: query,
                value: {
                  geometry: {
                    lat: coords.decimalLatitude.toFixed(5),
                    lng: coords.decimalLongitude.toFixed(5)
                  }
                }
              }
            ]
          },
          onSelect({ item }) {
            marker = new Marker().setLngLat([item.value.geometry.lng, item.value.geometry.lat]).addTo(map)

            map.flyTo({
              center: [item.value.geometry.lng, item.value.geometry.lat],
              zoom: 12
            })
          },
          onReset() {
            if (marker) {
              marker.remove()
              marker = null
            }
          },
          templates: {
            item({ item }) {
              return `Coordinates: ${item.label}`
            }
          }
        }
      ]
    }
  }
}

export default class OpenInfraMapGeocoder implements IControl {
  map?: Map
  container?: HTMLElement

  onAdd(map: Map): HTMLElement {
    this.map = map
    this.container = el('div.maplibregl-ctrl#geo-search')
    autocomplete({
      container: this.container,
      plugins: [
        latLonSearchPlugin(map),
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
