import i18next from 'i18next'
import maplibregl, { MapGeoJSONFeature } from 'maplibre-gl'
import { ClickRouter } from './click-router'

export class ValidationErrorPopup {
  map: maplibregl.Map
  errors_layer = 'osmose_errors_power'
  popup_obj?: maplibregl.Popup

  constructor(map: maplibregl.Map, clickRouter: ClickRouter) {
    this.map = map

    clickRouter.registerHandler(this.errors_layer, (f, l) => this.popup(f, l))

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.popup_obj) {
        this.popup_obj.remove()
      }
    })
  }

  async fetchIssue(uuid: string) {
    const response = await fetch(`https://osmose.openstreetmap.fr/api/0.3/issue/${uuid}`, {
      headers: {
        'Accept-Language': `${i18next.language}, en`
      }
    })
    return await response.json()
  }

  popup_content(issue: any, location: maplibregl.LngLat) {
    const osmose_url = `https://osmose.openstreetmap.fr/en/map/#loc=15/${location.lat}/${location.lng}&issue_uuid=${issue.uuid}`
    return `<h3>${issue.title.auto}</h3><p><a href="${osmose_url}" target="_blank">View on Osmose</a></p>`
  }

  async popup(feature: MapGeoJSONFeature, location: maplibregl.LngLat) {
    const uuid = feature.properties.uuid
    const issue = await this.fetchIssue(uuid)

    this.popup_obj = new maplibregl.Popup()
      .setLngLat(location)
      .setHTML(this.popup_content(issue, location))
      .addTo(this.map)
  }
}
