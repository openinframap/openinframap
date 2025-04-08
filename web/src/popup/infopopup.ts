import './infopopup.css'

import i18next, { t } from 'i18next'
import maplibregl, { LngLat, MapGeoJSONFeature, Popup } from 'maplibre-gl'
import { titleCase } from 'title-case'
import { local_name_tags, formatVoltage, formatFrequency, formatPower } from '../l10n.ts'
import friendlyNames from '../friendlynames.ts'
import friendlyIcons from '../friendlyicons.ts'
import { el, mount, setChildren, RedomElement } from 'redom'
import { ClickRouter } from '../click-router.ts'

const hidden_keys = [
  'osm_id',
  'name',
  'wikidata',
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

class InfoPopup {
  layers: string[]
  min_zoom: any
  popup_obj: Popup | null
  _map!: maplibregl.Map
  friendlyNames: { [key: string]: string }

  constructor(layers: string[], min_zoom: number) {
    this.layers = layers
    this.min_zoom = min_zoom
    this.popup_obj = null
    this.friendlyNames = friendlyNames()
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
    let url = ''
    let value = ''
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

    let prettyKey = key
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

    const links_container = el('div.infobox-external-links')
    const image_container = el('div.infobox-image')
    if (feature.properties['wikidata']) {
      // Start wikidata fetching asynchronously
      this.fetch_wikidata(feature.properties['wikidata'], image_container, links_container)
    } else {
      const wp_link = this.wp_link(feature.properties['wikipedia'])
      if (wp_link) {
        mount(links_container, wp_link)
      }
    }

    mount(content, image_container)
    mount(content, attrs_table)

    if (feature.properties['osm_id']) {
      mount(
        links_container,
        el('a', el('div.ext_link.osm_link'), {
          href: this.osmLink(feature.properties['osm_id'], feature.properties['is_node']),
          target: '_blank',
          title: t('info.view-openstreetmap', 'View on OpenStreetMap')
        })
      )
    }

    const footer = el('div.oim-info-footer')
    mount(content, footer)
    mount(footer, links_container)

    if (feature.layer.id.startsWith('power_plant')) {
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

  async fetch_wikidata(id: string, imageContainer: RedomElement, linksContainer: RedomElement) {
    const data = await fetch(`https://openinframap.org/wikidata/${id}`).then((response) => {
      return response.json()
    })

    if (data['thumbnail']) {
      mount(
        imageContainer,
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

    for (const lang of [i18next.language.split('-')[0], 'en']) {
      if (data['sitelinks'][`${lang}wiki`]) {
        mount(
          linksContainer,
          el('a', el('div.ext_link.wikipedia_link'), {
            href: data['sitelinks'][`${lang}wiki`]['url'],
            target: '_blank',
            title: t('wikipedia', 'Wikipedia')
          })
        )
        break
      }
    }

    if (data['sitelinks']['commonswiki']) {
      mount(
        linksContainer,
        el('a', el('div.ext_link.commons_link'), {
          href: data['sitelinks']['commonswiki']['url'],
          target: '_blank',
          title: t('wikimedia-commons', 'Wikimedia Commons')
        })
      )
    }

    if (data['gem_id']) {
      mount(
        linksContainer,
        el('a', el('div.ext_link.gem_link'), {
          href: `https://www.gem.wiki/${data['gem_id']}`,
          target: '_blank',
          title: 'Global Energy Monitor'
        })
      )
    }

    mount(
      linksContainer,
      el('a', el('div.ext_link.wikidata_link'), {
        href: `https://wikidata.org/wiki/${id}`,
        target: '_blank',
        title: t('wikidata', 'Wikidata')
      })
    )
  }

  wp_link(value: string) {
    if (!value) {
      return null
    }
    const parts = value.split(':', 2)
    if (parts.length > 1) {
      const url = `https://${parts[0]}.wikipedia.org/wiki/${parts[1]}`
      return el('a', el('div.ext_link.wikipedia_link'), {
        href: url,
        target: '_blank',
        title: t('wikipedia', 'Wikipedia')
      })
    }
  }
}

export { InfoPopup as default }
