import {el, text} from 'redom';
import './layerswitcher.css';

class LayerSwitcher {
  constructor(layers, visible = []) {
    this._layers = layers;
    this._visible = visible;
    this._container = el('div', {class: 'mapboxgl-ctrl layer-switcher-list'});
    this._container.appendChild(el('h3', 'Layers'));
  }

  _updateVisibility() {
    var layers = this._map.getStyle().layers;
    for (let layer of layers) {
      let name = layer['id'];
      for (let layer_name in this._layers) {
        let pref = this._layers[layer_name];
        if (name.startsWith(pref)) {
          if (this._visible.includes(layer_name)) {
            this._map.setLayoutProperty(name, 'visibility', 'visible');
          } else {
            this._map.setLayoutProperty(name, 'visibility', 'none');
          }
        }
      }
    }
  }

  setInitialVisibility(style) {
    /** 
     * Modify a map style before adding to the map to set initial visibility states.
     * This prevents flash-of-invisible-layers.
     */
    for (let layer of style['layers']) {
      for (let layer_name in this._layers) {
        let pref = this._layers[layer_name];
        if (
          layer['id'].startsWith(pref) &&
          !this._visible.includes(layer['id'])
        ) {
          if (!('layout' in layer)) {
            layer['layout'] = {};
          }
          layer['layout']['visibility'] = 'none';
        }
      }
    }
  }

  onAdd(map) {
    this._map = map;
    if (map.isStyleLoaded()) {
      this._updateVisibility();
    } else {
      map.on('load', () => {
        this._updateVisibility();
      });
    }
    this._createList();

    const wrapper = el('div', {
      class: 'mapboxgl-ctrl mapboxgl-ctrl-group layer-switcher',
    });
    wrapper.appendChild(this._container);
    wrapper.onmouseover = e => {
      this._container.style.display = 'block';
    };
    wrapper.onmouseout = e => {
      this._container.style.display = 'none';
    };
    return wrapper;
  }

  _createList() {
    var list = el('ul');
    var i = 0;
    for (let name in this._layers) {
      let checkbox = el('input', {
        type: 'checkbox',
        id: 'layer' + i,
        checked: this._visible.includes(name),
      });
      let label = el('label', name, {for: 'layer' + i});

      checkbox.onchange = e => {
        if (e.target.checked) {
          this._visible.push(name);
        } else {
          this._visible = this._visible.filter(item => item !== name);
        }
        this._updateVisibility();
      };

      list.appendChild(el('li', [checkbox, label]));
      i++;
    }
    this._container.appendChild(list);
  }
}

export {LayerSwitcher as default};
