import './validation-error-popup.css'
import { OSMRemoteControl } from '../remote-control'
import i18next, { t } from 'i18next'
import { Marked } from '@ts-stack/markdown'
import { el, mount } from 'redom'
import maplibregl, { MapGeoJSONFeature } from 'maplibre-gl'
import { ClickRouter } from '../click-router'
import { TabPane } from '../elements/tab-pane'

export class ValidationErrorPopup {
  osmose_endpoint = 'https://osmose.openstreetmap.fr/api/0.3'

  map: maplibregl.Map
  layers = ['osmose_errors_power', 'osmose_errors_power_symbol']
  popup_obj?: maplibregl.Popup

  constructor(map: maplibregl.Map, clickRouter: ClickRouter) {
    this.map = map

    clickRouter.registerHandler(this.layers, (f, l) => this.popup(f, l))

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.popup_obj) {
        this.popup_obj.remove()
      }
    })
  }

  async fetchOsmose(path: string) {
    const response = await fetch(`${this.osmose_endpoint}${path}`, {
      headers: {
        'Accept-Language': `${i18next.language}, en`
      }
    })
    return await response.json()
  }

  async fetchIssue(uuid: string) {
    return await this.fetchOsmose(`/issue/${uuid}`)
  }

  async fetchItemDetail(item: string, itemClass: string) {
    return await this.fetchOsmose(`/items/${item}/class/${itemClass}`)
  }

  changesList(elements: any): HTMLElement {
    const list = el('ul.oim-elements')
    elements['add'].forEach((elem: any) => {
      mount(list, el('li.add', el('span.key', elem['k']), el('span.value', elem['v'])))
    })
    elements['del'].forEach((elem: any) => {
      mount(list, el('li.del', el('span.key', elem['k']), el('span.value', elem['v'])))
    })
    return list
  }

  popup_content(issue: any, detail: any, location: maplibregl.LngLat) {
    const content = el(
      'div.oim-popup-content',
      el('div.oim-popup-header', el('h3', issue.title.auto), el('h4', 'Osmose validation issue'))
    )
    const osmose_url = `https://osmose.openstreetmap.fr/en/map/#loc=15/${location.lat}/${location.lng}&tags=power&issue_uuid=${issue.uuid}`
    const clsInfo = detail.categories[0].items[0].class[0]

    const tabPane = new TabPane()
    if (clsInfo.detail) {
      const content = el('div')
      content.innerHTML = Marked.parse(clsInfo.detail.auto)
      tabPane.addTab('Detail', content)
    }
    if (clsInfo.fix) {
      const content = el('div')
      content.innerHTML = Marked.parse(clsInfo.fix.auto)
      if (clsInfo.trap) {
        content.innerHTML += Marked.parse(clsInfo.trap.auto)
      }
      tabPane.addTab('Fix', content)
    }
    if (issue.new_elems && issue.new_elems.length > 0) {
      tabPane.addTab('Suggested', this.changesList(issue.new_elems[0]))
    }
    mount(content, tabPane)

    const actions = el('div.oim-validation-actions')

    if (issue.new_elems && issue.new_elems.length > 0) {
      mount(
        actions,
        el('button', 'Fix in JOSM', {
          class: 'oim-button',
          onclick: () => {
            const fixUrl = `https://osmose.openstreetmap.fr/api/0.3/issue/${issue.uuid}/fix/0`
            const remote = new OSMRemoteControl()
            remote.import(fixUrl).catch((error) => {
              alert(t('edit.error') + error)
            })
          }
        })
      )
    }

    mount(actions, el('a', { href: osmose_url, target: '_blank', class: 'oim-button' }, 'View on Osmose'))

    mount(content, actions)
    return content
  }

  async popup(feature: MapGeoJSONFeature, location: maplibregl.LngLat) {
    const uuid = feature.properties.uuid
    const [issue, detail] = await Promise.all([
      this.fetchIssue(uuid),
      this.fetchItemDetail(feature.properties.item, feature.properties.class)
    ])

    this.popup_obj = new maplibregl.Popup()
      .setLngLat(location)
      .setDOMContent(this.popup_content(issue, detail, location))
      .addTo(this.map)
      .addClassName('oim-popup')
      .addClassName('oim-popup-validation-error')
  }
}
