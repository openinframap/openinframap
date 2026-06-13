import './infopopup.css'

import i18next, { t } from 'i18next'
import maplibregl, { LngLat, MapGeoJSONFeature, Popup } from 'maplibre-gl'
import { titleCase } from 'title-case'
import { local_name_tags, formatVoltage, formatFrequency, formatPower } from '../l10n.ts'
import friendlyNames from '../friendlynames.ts'
import friendlyIcons from '../friendlyicons.ts'
import { el, mount, setChildren, RedomElement } from 'redom'
import { ClickRouter } from '../click-router.ts'
import { OpenInfraMapAPI } from '../api.ts'
import { CircuitInspector } from '../circuit/circuitinspector.ts'
import ExternalLinks from '../elements/external-links.ts'

const hidden_keys = [
  'osm_id',
  'name',
  'wikidata',
  'operator_wikidata',
  'wikipedia',
  'construction',
  'tunnel',
  'is_node',
  'area',
  'gid',
  'ref_len',
  'frequency',
  'transition',
  'angle'
]

function fieldName(key: string) {
  return (
    {
      name: t('info.name'),
      operator: t('info.operator'),
      output: t('info.output'),
      source: t('info.source'),
      start_date: t('info.start-date'),
      method: t('info.generation-method'),
      substation: t('info.substation-type'),
      ref: t('info.reference'),
      circuits: t('info.circuits'),
      type: t('info.type'),
      substance: t('info.substance'),
      location: t('info.location'),
      usage: t('info.usage'),
      design: t('info.design'),
      material: t('info.material'),
      line_attachment: t('info.line-attachment'),
      line_management: t('info.line-management'),
      transformer_type: t('info.transformer-type'),
      repd_id: 'REPD ID'
    }[key] || titleCase(key)
  )
}

function fieldValue(key: string, value: any): any {
  if (typeof value !== 'string') {
    return value
  }

  if (key === 'location') {
    return t('location.' + value, value)
  }

  if (key === 'substation') {
    return t('power.substation-type.' + value, value)
  }

  if (key === 'source') {
    if (value == 'oil') {
      return t('names.substance.oil')
    }
    return t('power.source.' + value, value)
  }

  if (key === 'type') {
    return (
      {
        disconnector: t('names.power.switch-disconnector'),
        circuit_breaker: t('names.power.switch-breaker'),
        series_reactor: t('names.power.reactor-series'),
        shunt_reactor: t('names.power.reactor-shunt'),
        series_capacitor: t('names.power.capacitor-series'),
        shunt_capacitor: t('names.power.capacitor-shunt'),
        filter: t('names.power.filter'),
        synchronous_condenser: t('names.power.synchronous-condenser'),
        statcom: t('names.power.statcom')
      }[value] || value
    )
  }

  if (key === 'method') {
    return (
      {
        fission: t('names.method.fission'),
        fusion: t('names.method.fusion'),
        wind_turbine: t('names.method.wind-turbine'),
        'water-storage': t('names.method.water-storage'),
        'water-pumped-storage': t('names.method.water-pumped-storage'),
        'run-of-the-river': t('names.method.water-run-of-river'),
        barrage: t('names.method.tidal-barrage'),
        stream: t('names.method.tidal-stream'),
        thermal: t('names.method.solar-thermal'),
        photovoltaic: t('names.method.solar-photovoltaic'),
        combustion: t('names.method.combustion'),
        gasification: t('names.method.gasification'),
        anaerobic_digestion: t('names.method.anaerobic-digestion')
      }[value] || value
    )
  }

  return titleCase(value)
}

export function circuitName(data) {
  const lang = i18next.language.split('-')[0]

  if (lang in data['local_names']) {
    return data['local_names'][lang]
  }
  if (data['name']) {
    return data['name']
  }
  return `-`
}

function truncateUrl(urlString: string, length: number): string {
  // Trim trailing slash
  urlString = urlString.replace(/\/$/, '')

  if (urlString.length <= length) {
    return urlString
  }

  const parsed = new URL(urlString)
  // Remove www from host
  parsed.host = parsed.host.replace(/^www\./, '')
  if (parsed.toString().length <= length) {
    return parsed.toString()
  }

  const TRUNCATE_SYMBOL_LENGTH = 2
  const pathParts = parsed.pathname.split('/')

  let remainingLength = length - parsed.host.length - TRUNCATE_SYMBOL_LENGTH
  const pathPartsReturnValue = []
  let index = pathParts.length

  while (index--) {
    const x = pathParts[index]

    if (x.length === 0) {
      continue
    }

    if (remainingLength < x.length + 1) {
      pathPartsReturnValue.push('…')
      break
    }

    pathPartsReturnValue.push(x)
    remainingLength -= x.length + 1
  }

  return [parsed.host, ...pathPartsReturnValue.reverse()].join('/')
}

interface InfoPopupOptions {
  layers: string[]
  min_zoom: number
  api: OpenInfraMapAPI
  circuit_inspector: CircuitInspector
}

class InfoPopup {
  layers: string[]
  min_zoom: any
  popup_obj: Popup | null
  _map!: maplibregl.Map
  friendlyNames: { [key: string]: string }
  api: OpenInfraMapAPI
  circuit_inspector: CircuitInspector

  constructor(options: InfoPopupOptions) {
    this.api = options.api
    this.layers = options.layers
    this.min_zoom = options.min_zoom
    this.popup_obj = null
    this.friendlyNames = friendlyNames()
    this.circuit_inspector = options.circuit_inspector
  }

  add(map: maplibregl.Map, clickRouter: ClickRouter) {
    this._map = map

    clickRouter.registerHandler(this.layers, (f, l) => this.popup(f, l))

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.popup_obj) {
        this.popup_obj.remove()
      }
    })
  }

  osmLink(id: number, is_node: boolean) {
    let url
    let value
    if (id > 0) {
      if (is_node) {
        url = `https://openstreetmap.org/node/${id}`
        value = `Node ${id}`
      } else {
        url = `https://openstreetmap.org/way/${id}`
        value = `Way ${id}`
      }
    } else {
      url = `https://openstreetmap.org/relation/${-id}`
      value = `Relation ${-id}`
    }
    return el('a', value, {
      href: url,
      target: '_blank'
    })
  }

  friendlyRender(label: string) {
    let friendlyName = label
    let prefixLen = 0
    for (const name in this.friendlyNames) {
      if (label.startsWith(name) && name.length > prefixLen) {
        friendlyName = this.friendlyNames[name]
        prefixLen = name.length
      }
    }
    return friendlyName
  }

  friendlyIcon(feature: string) {
    if (feature in friendlyIcons) {
      return friendlyIcons[feature]
    } else {
      return null
    }
  }

  renderKey(key: string, value: any): HTMLTableRowElement | null {
    if (hidden_keys.includes(key) || key.startsWith('name_') || key.startsWith('voltage') || !value) {
      return null
    }

    let prettyValue = value

    if (key.startsWith('voltage')) {
      prettyValue = formatVoltage(value)
    }

    if (key == 'output') {
      prettyValue = formatPower(parseFloat(value))
    }

    if (key == 'frequency' && value == '0') {
      prettyValue = t('units.DC')
    }

    let prettyKey
    if (key == 'url') {
      prettyKey = t('info.website')
      prettyValue = el('a', truncateUrl(value, 30), {
        href: value,
        target: '_blank'
      })
    } else {
      prettyKey = fieldName(key)
    }

    return el('tr', el('th', prettyKey), el('td', fieldValue(key, prettyValue)))
  }

  nameTags(feature: MapGeoJSONFeature) {
    let title_text = ''

    for (const tag of local_name_tags()) {
      if (feature.properties[tag]) {
        title_text = feature.properties[tag]
        break
      }
    }

    if (!title_text) {
      title_text = this.friendlyRender(feature.layer['id'])
    }

    let feature_title = el('h3', title_text)
    const feature_iconpath = this.friendlyIcon(feature.layer['id'])
    if (feature_iconpath != null) {
      feature_title = el('h3', el('img', { src: feature_iconpath, height: 35 }), title_text)
    }

    const container = el('div.oim-popup-header', feature_title)

    // If we're showing a translated name, also show the name tag
    if (feature.properties.name && title_text != feature.properties.name) {
      mount(container, el('h4', feature.properties.name))
    }

    return container
  }

  voltageField(feature: MapGeoJSONFeature): RedomElement {
    const voltages = new Set(
      Object.keys(feature.properties)
        .filter((key) => key.startsWith('voltage'))
        .map((key) => parseFloat(feature.properties[key]))
    )

    let text = formatVoltage(Array.from(voltages))

    if (feature.properties['frequency']) {
      const frequencies = feature.properties.frequency.split(';').map((x: string) => parseFloat(x))
      text += ` ${formatFrequency(frequencies)}`
    }

    return el('span.voltages', text)
  }

  async popupHtml(feature: MapGeoJSONFeature) {
    const layer_id = feature.layer.id

    const attrs_table = el('table', { class: 'item_info' })
    const renderedProperties = Object.keys(feature.properties)
      .sort()
      .map((key) => this.renderKey(key, feature.properties[key]))
      .filter((x) => x !== null) as HTMLTableRowElement[]
    setChildren(attrs_table, renderedProperties)

    const content = el('div.oim-popup-content', this.nameTags(feature))

    if (feature.properties['voltage'] || feature.properties['voltage_primary']) {
      mount(content, this.voltageField(feature))
    }
    const image_container = el('div.infobox-image')

    const external_links = new ExternalLinks(feature.properties['osm_id'], feature.properties['is_node'])

    if (feature.properties['wikidata']) {
      this.api.fetchWikidata(feature.properties['wikidata']).then((data) => {
        external_links.updateWikidata(feature.properties['wikidata'], data)
        if (data && data['thumbnail']) {
          mount(
            image_container,
            el(
              'a',
              el('img.wikidata_image', {
                src: data['thumbnail']
              }),
              {
                href: `https://commons.wikimedia.org/wiki/File:${data['image']}`,
                target: '_blank'
              }
            )
          )
        }
      })
    }

    mount(content, image_container)
    mount(content, attrs_table)

    if (layer_id.startsWith('power_substation') || layer_id.startsWith('power_converter')) {
      const circuits_container = await this.fetch_substation_circuits(feature.properties['osm_id'])
      circuits_container.forEach((e) => mount(content, e))
    }

    if (layer_id.startsWith('power_line')) {
      const circuits_container = await this.fetch_line_circuits(feature.properties['osm_id'])
      circuits_container.forEach((e) => mount(content, e))
    }

    const footer = el('div.oim-info-footer')
    mount(content, footer)
    mount(footer, external_links)

    if (layer_id.startsWith('power_plant')) {
      mount(
        footer,
        el('a.oim-button', t('more_info', 'More info'), {
          href: '/stats/object/plant/' + feature.properties['osm_id'],
          target: '_blank'
        })
      )
    }
    return content
  }

  async popup(feature: MapGeoJSONFeature, location: LngLat) {
    if (this.popup_obj && this.popup_obj.isOpen()) {
      this.popup_obj.remove()
    }

    if (import.meta.env.DEV) {
      console.info('Clicked feature on layer', feature.layer.id, 'at', location, '\n', feature.properties)
    }

    this.popup_obj = new maplibregl.Popup()
      .setLngLat(location)
      .setDOMContent(await this.popupHtml(feature))
      .addTo(this._map)
      .addClassName('oim-popup')
      .addClassName('oim-popup-info')
  }

  circuits_table(circuits: Array<object>) {
    return el(
      'table.circuits-table',
      el('tr', el('th', t('info.name')), el('th', t('info.voltage')), el('th', '')),
      circuits
        .sort((a, b) => b['circuit']['voltage'] - a['circuit']['voltage'])
        .map((c) =>
          el(
            'tr',
            el('td', circuitName(c['circuit'])),
            el('td', formatVoltage(c['circuit']['voltage'])),
            el('button', 'view', {
              onclick: () => {
                this.circuit_inspector.show(c['circuit']['id'])
                this.popup_obj?.remove()
              }
            })
          )
        )
    )
  }

  async circuits_section(response) {
    if (response.circuits.length == 0) {
      return []
    }

    return [el('h4', t('info.circuits')), el('div#circuits', this.circuits_table(response.circuits))]
  }

  async fetch_substation_circuits(id: string) {
    const response = await this.api.fetch(`/api/substation/${id}`)
    return this.circuits_section(response)
  }

  async fetch_line_circuits(id: string) {
    const response = await this.api.fetch(`/api/line/${id}`)
    return this.circuits_section(response)
  }
}

export { InfoPopup as default }
