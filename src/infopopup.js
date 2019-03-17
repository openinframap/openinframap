import './infopopup.css';

import mapboxgl from 'mapbox-gl';
import titleCase from 'title-case';
import {el, text, mount, unmount, setChildren, setStyle} from 'redom';

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

  osmLink(id) {
    if (id > 0) {
      return `https://openstreetmap.org/way/${id}`;
    } else {
      return `https://openstreetmap.org/relation/${-id}`;
    }
  }

  renderKey(key, value) {
    if (key == 'name') {
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

    if (key == 'gid') {
      key = 'OSM ID';
      value = el('a', value, {
        href: this.osmLink(value),
        target: '_blank',
      });
    } else {
      key = titleCase(key);
    }

    return el('tr', el('th', key), el('td', value));
  }

  popupHtml(feature) {
    let attrs_table = el('table', {'class': 'item_info'});
    setChildren(
      attrs_table,
      Object.keys(feature.properties).sort().map(key =>
        this.renderKey(key, feature.properties[key]),
      ),
    );

    let title_text = '';
    if (feature.properties['name']) {
      title_text = feature.properties['name'];
    } else {
      title_text = feature.layer['id'];
    }
    let content = el('div', el('h3', title_text), attrs_table);
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
}

export {InfoPopup as default};
