import './index.css';
import mapboxgl from 'mapbox-gl';
import map_style from './style.json';

import EditButton from './editbutton.js';

import style_base from './style_base.js';
import style_oim_power from './style_oim_power.js';
import style_oim_telecoms from './style_oim_telecoms.js';

function init() {
  /*
  // Old carto positron basemap in case of issues.
  map_style.layers = [{
    "id": "carto-positron",
    "type": "raster",
    "source": "carto-positron"
  }]
  map_style.sources["carto-positron"] = {
      "type": "raster",
      "url": "https://openinframap.org/carto.json",
      "tileSize": 256
  };
  */
  map_style.layers = style_base;
  map_style.layers = map_style.layers.concat(style_oim_power, style_oim_telecoms);

  if (DEV) {
    map_style['sprite'] = 'http://localhost:8080/style/sprite';
  } else {
    map_style['sprite'] = 'https://openinframap.org/style/sprite';
  }

  var map = new mapboxgl.Map({
    container: 'map',
    style: map_style,
    hash: true,
    minZoom: 2,
    maxZoom: 17.9
  });
  map.addControl(new mapboxgl.NavigationControl(), 'top-right');
  map.addControl(new EditButton(), 'bottom-right');
}

if (document.readyState != 'loading') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
