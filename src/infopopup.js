import './infopopup.css';

import mapboxgl from 'mapbox-gl';
import titleCase from 'title-case';
import browserLanguage from 'in-browser-language';
import {el, text, mount, unmount, setChildren, setStyle} from 'redom';

const hidden_keys = [
  'name',
  'wikidata',
  'wikipedia',
  'construction',
  'tunnel',
  'is_node',
  'area',
  'gid',
  'ref_len',
];

class InfoPopup {
  constructor(layers, min_zoom) {
    this.layers = layers;
    this.min_zoom = min_zoom;
    this.popup_obj = null;
  }

  add(map) {
    this._map = map;

    for (let layer of this.layers) {
      map.on('click', layer, e => {
        if (this._map.getZoom() > this.min_zoom) {
          this.popup(e);
        }
      });

      map.on('mouseenter', layer, () => {
        if (this._map.getZoom() > this.min_zoom) {
          map.getCanvas().style.cursor = 'pointer';
        }
      });
      map.on('mouseleave', layer, () => {
        if (this._map.getZoom() > this.min_zoom) {
          map.getCanvas().style.cursor = '';
        }
      });
    }
  }

  osmLink(id, is_node) {
    let url = '';
    let value = '';
    if (id > 0) {
      if (is_node) {
        url = `https://openstreetmap.org/node/${id}`;
        value = `Node ${id}`;
      } else {
        url = `https://openstreetmap.org/way/${id}`;
        value = `Way ${id}`;
      }
    } else {
      url = `https://openstreetmap.org/relation/${-id}`;
      value = `Relation ${-id}`;
    }
    return el('a', value, {
      href: url,
      target: '_blank',
    });
  }

  renderKey(key, value, other_props) {
    if (hidden_keys.includes(key)) {
      return null;
    }
    if (!value) {
      return null;
    }

    if (key.startsWith('voltage')) {
      value += ' kV';
    }

    if (key == 'output') {
      value += ' MW';
    }

    if (key == 'frequency' && value == '0') {
      value = 'DC';
    }

    if (key == 'url') {
      value = el('a', 'Website', {
        href: value,
        target: '_blank',
      });
      key = 'Website';
    }

    if (key == 'repd_id') {
      key = 'REPD ID';
      value = value.split(';').map(id =>
        el('span', el('a', id, {
          href: `https://repd.russss.dev/repd/repd/${id}`,
          target: '_blank',
        }), text(', ')),
      );
    } else { 
      key = titleCase(key);
    }

    return el('tr', el('th', key), el('td', value));
  }

  popupHtml(feature) {
    let attrs_table = el('table', {class: 'item_info'});
    setChildren(
      attrs_table,
      Object.keys(feature.properties)
        .sort()
        .map(key =>
          this.renderKey(key, feature.properties[key], feature.properties),
        ),
    );

    let title_text = '';
    if (feature.properties['name']) {
      title_text = feature.properties['name'];
    } else {
      title_text = feature.layer['id'];
    }

    let links_container = el('div');

    mount(
      links_container,
      el('a', el('div.ext_link.osm_link'), {
        href: this.osmLink(
          feature.properties['gid'],
          feature.properties['is_node'],
        ),
        target: '_blank',
        title: 'OpenStreetMap',
      }),
    );

    let wikidata_div = null;
    if (feature.properties['wikidata']) {
      wikidata_div = el('div');
      this.fetch_wikidata(
        feature.properties['wikidata'],
        wikidata_div,
        links_container,
      );
    } else {
      let wp_link = this.wp_link(feature.properties['wikipedia']);
      if (wp_link) {
        mount(links_container, wp_link);
      }
    }

    let content = el(
      'div',
      el('h3', title_text),
      links_container,
      wikidata_div,
      attrs_table,
    );
    return content;
  }

  popup(e) {
    if (this.popup_obj && this.popup_obj.isOpen()) {
      this.popup_obj.remove();
    }

    this.popup_obj = new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setDOMContent(this.popupHtml(e.features[0]))
      .addTo(this._map);
  }

  fetch_wikidata(id, container, links_container) {
    fetch(`https://openinframap.org/wikidata/${id}`)
      .then(response => {
        return response.json();
      })
      .then(data => {
        if (data['thumbnail']) {
          mount(
            container,
            el(
              'a',
              el('img.wikidata_image', {
                src: data['thumbnail'],
              }),
              {
                href: `https://commons.wikimedia.org/wiki/File:${
                  data['image']
                }`,
                target: '_blank',
              },
            ),
          );
        }

        let languages = browserLanguage.list();
        languages.push('en');
        for (const lang of languages) {
          if (data['sitelinks'][`${lang}wiki`]) {
            mount(
              links_container,
              el('a', el('div.ext_link.wikipedia_link'), {
                href: data['sitelinks'][`${lang}wiki`]['url'],
                target: '_blank',
                title: 'Wikipedia',
              }),
            );
            break;
          }
        }

        if (data['sitelinks']['commonswiki']) {
          mount(
            links_container,
            el('a', el('div.ext_link.commons_link'), {
              href: data['sitelinks']['commonswiki']['url'],
              target: '_blank',
              title: 'Wikimedia Commons',
            }),
          );
        }

        mount(
          links_container,
          el('a', el('div.ext_link.wikidata_link'), {
            href: `https://wikidata.org/wiki/${id}`,
            target: '_blank',
            title: 'Wikidata',
          }),
        );
      });
  }

  wp_link(value) {
    if (!value) {
      return null;
    }
    let parts = value.split(':', 2);
    if (parts.length > 1) {
      let url = `https://${parts[0]}.wikipedia.org/wiki/${parts[1]}`;
      return el('a', el('div.ext_link.wikipedia_link'), {
        href: url,
        target: '_blank',
        title: 'Wikipedia',
      });
    }
  }
}

export {InfoPopup as default};
