import './infopopup.css'

import maplibregl, { MapGeoJSONFeature, MapMouseEvent, Popup } from 'maplibre-gl'
import { titleCase } from 'title-case'
// @ts-expect-error No types
import browserLanguage from 'in-browser-language'
import { local_name_tags } from './l10n.ts'
import friendlyNames from './friendlynames.ts'
import friendlyIcons from './friendlyicons.ts'
import { el, mount, setChildren, RedomElement } from 'redom'

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
  'frequency'
]

class InfoPopup {
  layers: string[]
  min_zoom: any
  popup_obj: Popup | null
  _map!: maplibregl.Map
  constructor(layers: string[], min_zoom: number) {
    this.layers = layers
    this.min_zoom = min_zoom
    this.popup_obj = null
  }

  add(map: maplibregl.Map) {
    this._map = map

    for (const layer of this.layers) {
      map.on('click', layer, (e) => {
        if (this._map.getZoom() > this.min_zoom) {
          this.popup(e)
        }
      })

      map.on('mouseenter', layer, () => {
        if (this._map.getZoom() > this.min_zoom) {
          map.getCanvas().style.cursor = 'pointer'
        }
      })
      map.on('mouseleave', layer, () => {
        if (this._map.getZoom() > this.min_zoom) {
          map.getCanvas().style.cursor = ''
        }
      })
    }
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
    for (const name in friendlyNames) {
      if (label.startsWith(name) && name.length > prefixLen) {
        friendlyName = friendlyNames[name]
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

  renderKey(key: string, value: any) {
    if (hidden_keys.includes(key) || key.startsWith('name_') || key.startsWith('voltage') || !value) {
      return null
    }

    if (key.startsWith('voltage')) {
      value = `${Number(parseFloat(value).toFixed(2))} kV`
    }

    if (key == 'output') {
      const val = parseFloat(value)
      if (val < 1) {
        value = `${(val * 1000).toFixed(2)} kW`
      } else {
        value = `${val.toFixed(2)} MW`
      }
    }

    if (key == 'frequency' && value == '0') {
      value = 'DC'
    }

    if (key == 'url') {
      value = el('a', 'Website', {
        href: value,
        target: '_blank'
      })
      key = 'Website'
    } else {
      key = titleCase(this.friendlyRender(key))
    }

    return el('tr', el('th', key), el('td', value))
  }

  nameTags(feature: MapGeoJSONFeature) {
    let title_text = ''

    for (const tag of local_name_tags) {
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

    const container = el('div.nameContainer', feature_title)

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

    let text = [...voltages]
      .sort((a, b) => a - b)
      .reverse()
      .map((val) => val.toString())
      .join('/')
    text += ' kV'

    if (feature.properties['frequency']) {
      text += ` ${feature.properties['frequency'].replace(';', '/')} Hz`
    }

    return el('span.voltages', text)
  }

  popupHtml(feature: MapGeoJSONFeature) {
    const attrs_table = el('table', { class: 'item_info' })
    const renderedProperties = Object.keys(feature.properties)
      .sort()
      .map((key) => this.renderKey(key, feature.properties[key]))
      .filter((x) => x !== null) as HTMLTableRowElement[]
    setChildren(attrs_table, renderedProperties)

    const content = el('div', this.nameTags(feature))

    if (feature.properties['voltage']) {
      mount(content, this.voltageField(feature))
    }

    const links_container = el('div')
    const wikidata_div = el('div')
    if (feature.properties['wikidata']) {
      this.fetch_wikidata(feature.properties['wikidata'], wikidata_div, links_container)
    } else {
      const wp_link = this.wp_link(feature.properties['wikipedia'])
      if (wp_link) {
        mount(links_container, wp_link)
      }
    }

    mount(content, wikidata_div)
    mount(content, attrs_table)

    if (feature.properties['osm_id']) {
      mount(
        links_container,
        el('a', el('div.ext_link.osm_link'), {
          href: this.osmLink(feature.properties['osm_id'], feature.properties['is_node']),
          target: '_blank',
          title: 'OpenStreetMap'
        })
      )
    }
    mount(content, links_container)

    if (feature.layer.id.startsWith('power_plant')) {
      mount(
        content,
        el('a', 'More info', {
          href: '/stats/object/plant/' + feature.properties['osm_id'],
          target: '_blank'
        })
      )
    }
    return content
  }

  popup(e: MapMouseEvent & { features?: MapGeoJSONFeature[] | undefined }) {
    if (this.popup_obj && this.popup_obj.isOpen()) {
      this.popup_obj.remove()
    }

    if (e.features === undefined || e.features.length == 0) {
      return
    }

    this.popup_obj = new maplibregl.Popup()
      .setLngLat(e.lngLat)
      .setDOMContent(this.popupHtml(e.features[0]))
      .setMaxWidth('350px')
      .addTo(this._map)
    this.popup_obj.addClassName('oim-info')
  }

  fetch_wikidata(id: string, container: RedomElement, links_container: RedomElement) {
    fetch(`https://openinframap.org/wikidata/${id}`)
      .then((response) => {
        return response.json()
      })
      .then((data) => {
        if (data['thumbnail']) {
          mount(
            container,
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

        const languages = browserLanguage.list()
        languages.push('en')
        for (const lang of languages) {
          if (data['sitelinks'][`${lang}wiki`]) {
            mount(
              links_container,
              el('a', el('div.ext_link.wikipedia_link'), {
                href: data['sitelinks'][`${lang}wiki`]['url'],
                target: '_blank',
                title: 'Wikipedia'
              })
            )
            break
          }
        }

        if (data['sitelinks']['commonswiki']) {
          mount(
            links_container,
            el('a', el('div.ext_link.commons_link'), {
              href: data['sitelinks']['commonswiki']['url'],
              target: '_blank',
              title: 'Wikimedia Commons'
            })
          )
        }

        mount(
          links_container,
          el('a', el('div.ext_link.wikidata_link'), {
            href: `https://wikidata.org/wiki/${id}`,
            target: '_blank',
            title: 'Wikidata'
          })
        )
      })
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
        title: 'Wikipedia'
      })
    }
  }
}

export { InfoPopup as default }
