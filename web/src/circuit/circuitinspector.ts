import './circuitinspector.css'
import i18next from 'i18next'
import { URLHash } from '@russss/maplibregl-layer-switcher'
import { el, mount, unmount } from 'redom'
import { OpenInfraMapAPI } from '../api'
import { GeoJSONSource } from 'maplibre-gl'
import { circuitName } from '../popup/infopopup'
import { formatFrequency, formatVoltage } from '../l10n'
import ExternalLinks from '../elements/external-links'

class InspectorComponent {
  el: HTMLElement
  inspector: CircuitInspector
  constructor(data: any, inspector: CircuitInspector) {
    this.inspector = inspector

    const external_links = new ExternalLinks(data['id'], false)

    if (data.wikidata) {
      inspector._api.fetchWikidata(data['wikidata']).then((response) => {
        external_links.updateWikidata(data['wikidata'], response)
      })
    }

    this.el = el(
      'div.oim-popup.circuit-inspector',
      el(
        'div.circuit-inspector-header',
        el('h3', 'Selected circuit'),
        el('button', '×', { onclick: () => inspector.hide() })
      ),
      el(
        'div.oim-popup-content.circuit-inspector-body',
        el('div.circuit-subhead', this.name(data), this.info(data)),
        this.substations(data['substations']),
        el(
          'div.oim-info-footer',
          external_links,
          el('button.oim-button', 'Zoom', { onclick: () => inspector.zoom() })
        )
      )
    )
  }

  name(data: any) {
    const lang = i18next.language.split('-')[0]
    if (data['local_names'][lang]) {
      return [el('h4', data['local_names'][lang]), el('div.main_name', data['name'])]
    }
    if (data['name']) {
      return [el('h4', data['name'])]
    }
    return []
  }

  info(data: any) {
    if (data['type'] == 'power') {
      return el(
        'div.circuit-info',
        el('span', `${data['length']} km`),
        el('span', formatVoltage(data['voltage'])),
        el('span', formatFrequency(data['frequency']))
      )
    }
    return el(
      'div.circuit-legacy',
      el(
        'p',
        el('strong', `Legacy ${data['type']} relation`),
        ': Consider upgrading to a power=circuit relation.'
      )
    )
  }

  substations(data: Array<any>) {
    if (data.length > 0) {
      return [
        el('h4', 'Substations'),
        el(
          'ul',
          data.map((sub) =>
            el(
              'li',
              el('a', circuitName(sub), {
                href: 'javascript:void(0)',
                onclick: () => {
                  this.inspector._map.flyTo({
                    center: sub['location'],
                    zoom: 15
                  })
                }
              })
            )
          )
        )
      ]
    }
    return []
  }
}

export class CircuitInspector {
  _map: maplibregl.Map
  _url_hash: URLHash
  _container?: InspectorComponent
  _api: OpenInfraMapAPI
  _bbox?: number[]

  constructor(map: maplibregl.Map, url_hash: URLHash, api: OpenInfraMapAPI) {
    this._map = map
    this._url_hash = url_hash
    this._api = api
    url_hash.registerHandler('circuit', (value) => {
      this.hashChange(value)
    })
  }

  updateData(data: GeoJSON.GeoJSON) {
    if (!this._map.loaded()) {
      this._map.on('load', () => {
        this.updateData(data)
      })
    }
    this._bbox = data['bbox']
    const source: GeoJSONSource = this._map.getSource('circuit_highlight')!
    source.setData(data)
  }

  zoom() {
    if (!this._bbox) return

    const x_padding = (this._bbox[2] - this._bbox[0]) * 0.05
    const y_padding = (this._bbox[3] - this._bbox[1]) * 0.05

    this._map.fitBounds([
      [this._bbox[0] - x_padding, this._bbox[1] - y_padding],
      [this._bbox[2] + x_padding, this._bbox[3] + y_padding]
    ])
  }

  async show(circuitId: number) {
    if (this._container) {
      unmount(this._map.getContainer(), this._container)
      this._container = undefined
    }
    const data = await this._api.circuitDetail(circuitId)
    if (!data) {
      return
    }

    this.updateData(data.geometry)

    this._container = new InspectorComponent(data, this)
    mount(this._map.getContainer(), this._container)
    this._url_hash.setParameter('circuit', circuitId.toString())
  }

  hide() {
    if (this._container) {
      unmount(this._map.getContainer(), this._container)
      this._container = undefined
    }
    this._url_hash.setParameter('circuit', null)
    this.updateData({
      type: 'FeatureCollection',
      features: []
    })
  }

  hashChange(param: string | null) {
    if (!param) {
      this.hide()
    }

    const id = parseInt(param!)

    if (id) {
      this.show(id)
    } else {
      this.hide()
    }
  }
}
