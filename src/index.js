import './index.css';
import mapboxgl from 'mapbox-gl';
import map_style from './style.json';

import { mount } from 'redom';

import EditButton from './editbutton.js';
import InfoBox from './infobox.js';
import InfoPopup from './infopopup.js';

import style_base from './style_base.js';
import style_oim_power from './style_oim_power.js';
import style_oim_telecoms from './style_oim_telecoms.js';
import style_oim_petroleum from './style_oim_petroleum.js';
import style_oim_water from './style_oim_water.js';

function init() {
  if (!mapboxgl.supported({failIfMajorPerformanceCaveat: true})) {
      const infobox = new InfoBox('Warning');
      infobox.update('Your browser may have performance or functionality issues with OpenInfraMap.<br/>' +
      '<a href="http://webglreport.com">WebGL</a> with hardware acceleration is required for this site ' +
      'to perform well.');
      mount(document.body, infobox);
  }

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
  var oim_layers = style_oim_power.concat(style_oim_petroleum, style_oim_telecoms, style_oim_water);

  oim_layers.sort((a, b) => {
    if (a['zorder'] < b['zorder']) return -1;
    if (a['zorder'] > b['zorder']) return 1;
    return 0;
  });

  map_style.layers = style_base.concat(oim_layers);

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
    maxZoom: 17.9,
    center: [12, 26]
  });
  map.addControl(new mapboxgl.NavigationControl(), 'top-right');
  map.addControl(new EditButton(), 'bottom-right');

  (new InfoPopup(oim_layers.map(layer => layer['id']), 9)).add(map);
}

if (document.readyState != 'loading') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
