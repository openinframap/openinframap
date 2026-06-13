import i18next, { t } from 'i18next'
import { el, mount } from 'redom'

function osmLink(id: number, is_node: boolean) {
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

export default class ExternalLinks {
  el: HTMLElement

  constructor(osm_id: number | undefined, is_node: boolean) {
    this.el = el('div.infobox-external-links')

    if (osm_id) {
      mount(
        this.el,
        el('a', el('div.ext_link.osm_link'), {
          href: osmLink(osm_id, is_node),
          target: '_blank',
          title: t('info.view-openstreetmap', 'View on OpenStreetMap')
        })
      )
    }
  }

  updateWikidata(id: string, data: any) {
    if (!data) {
      return
    }
    for (const lang of [i18next.language.split('-')[0], 'en']) {
      if (data['sitelinks'][`${lang}wiki`]) {
        const url =
          `https://${lang}.wikipedia.org/wiki/` + encodeURI(data['sitelinks'][`${lang}wiki`]['title'])
        mount(
          this.el,
          el('a', el('div.ext_link.wikipedia_link'), {
            href: url,
            target: '_blank',
            title: t('wikipedia', 'Wikipedia')
          })
        )
        break
      }
    }

    if (data['sitelinks']['commonswiki']) {
      const url = `https://commons.wikimedia.org/wiki/` + encodeURI(data['sitelinks']['commonswiki']['title'])
      mount(
        this.el,
        el('a', el('div.ext_link.commons_link'), {
          href: url,
          target: '_blank',
          title: t('wikimedia-commons', 'Wikimedia Commons')
        })
      )
    }

    if (data['gem_id']) {
      mount(
        this.el,
        el('a', el('div.ext_link.gem_link'), {
          href: `https://www.gem.wiki/${data['gem_id']}`,
          target: '_blank',
          title: 'Global Energy Monitor'
        })
      )
    }

    if (data['peeringdb_facility_id']) {
      mount(
        this.el,
        el('a', el('div.ext_link.peeringdb_link'), {
          href: `https://www.peeringdb.com/fac/${data['peeringdb_facility_id']}`,
          target: '_blank',
          title: 'PeeringDB'
        })
      )
    }

    mount(
      this.el,
      el('a', el('div.ext_link.wikidata_link'), {
        href: `https://wikidata.org/wiki/${id}`,
        target: '_blank',
        title: t('wikidata', 'Wikidata')
      })
    )
  }
}
