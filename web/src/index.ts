import './index.css'
import maplibregl from 'maplibre-gl'
import { mount } from 'redom'

import LayerSwitcher from '@russss/maplibregl-layer-switcher'
import URLHash from '@russss/maplibregl-layer-switcher/urlhash'

import EditButton from './editbutton.js'
import InfoPopup from './infopopup.js'
import KeyControl from './key/key.js'
import WarningBox from './warning-box/warning-box.js'

import map_style from './style/style.js'
import style_base from './style/style_base.js'
import style_labels from './style/style_labels.js'
import style_oim_power from './style/style_oim_power.js'
import style_oim_power_heatmap from './style/style_oim_power_heatmap.js'
import style_oim_telecoms from './style/style_oim_telecoms.js'
import style_oim_petroleum from './style/style_oim_petroleum.js'
import style_oim_water from './style/style_oim_water.js'
import loadIcons from './loadIcons.js'
import { LayerSpecificationWithZIndex } from './style/types.js'

function isWebglSupported() {
  if (window.WebGLRenderingContext) {
    const canvas = document.createElement('canvas')
    try {
      const context =
        canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true }) ||
        canvas.getContext('webgl', { failIfMajorPerformanceCaveat: true })
      if (context && typeof context.getParameter == 'function') {
        return true
      }
    } catch (e) {
      // WebGL is supported, but disabled
    }
    return false
  }
  // WebGL not supported
  return false
}

function init() {
  if (!isWebglSupported()) {
    const infobox = new WarningBox('Warning')
    infobox.update(
      '<p>Your browser may have performance or functionality issues with Open Infrastructure Map.</p>' +
        '<p><a href="http://webglreport.com">WebGL</a> with hardware acceleration is required for this site ' +
        'to perform well.</p>' +
        '<p>If your browser supports WebGL, you may need to disable browser fingerprinting protection for this site.</p>'
    )
    mount(document.body, infobox)
  }

  const oim_layers: LayerSpecificationWithZIndex[] = [
    ...style_oim_power,
    ...style_oim_power_heatmap,
    ...style_oim_petroleum,
    ...style_oim_telecoms,
    ...style_oim_water
  ]

  oim_layers.sort((a, b) => {
    if (!a.zorder || !b.zorder) {
      throw new Error('zorder is required for all layers')
    }
    if (a.zorder < b.zorder) return -1
    if (a.zorder > b.zorder) return 1
    return 0
  })

  const layers = {
    Power: 'power_',
    'Solar Generation': 'heatmap_',
    Telecoms: 'telecoms_',
    'Oil & Gas': 'petroleum_',
    Water: 'water_',
    Labels: 'place_'
  }
  const layers_enabled = ['Power', 'Labels']
  const layer_switcher = new LayerSwitcher(layers, layers_enabled)
  const url_hash = new URLHash(layer_switcher)
  layer_switcher.urlhash = url_hash

  map_style.layers = style_base.concat(oim_layers, style_labels)

  layer_switcher.setInitialVisibility(map_style)

  if (import.meta.env.DEV) {
    // map_style["sprite"] = "http://localhost:8080/style/sprite";
    // map_style['sources']['openinframap']['url'] = 'http://localhost:8081/capabilities/openinframap.json'
    // map_style['sources']['solar_heatmap']['url'] = 'http://localhost:8081/capabilities/solar_heatmap.json'
  }

  maplibregl.setRTLTextPlugin(
    'https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js',
    true // Lazy load the plugin
  )

  const map = new maplibregl.Map(
    url_hash.init({
      container: 'map',
      style: map_style,
      maxZoom: 20,
      zoom: 2,
      center: [12, 26],
      localIdeographFontFamily: "'Apple LiSung', 'Noto Sans', 'Noto Sans CJK SC', sans-serif"
    })
  )

  map.on('load', () => {
    loadIcons(map)
  })

  map.dragRotate.disable()
  map.touchZoomRotate.disableRotation()

  url_hash.enable(map)
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
  map.addControl(
    new maplibregl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true
    })
  )

  map.addControl(new maplibregl.ScaleControl({}), 'bottom-left')

  map.addControl(new KeyControl(), 'top-right')
  map.addControl(layer_switcher, 'top-right')
  map.addControl(new EditButton(), 'bottom-right')
  new InfoPopup(
    oim_layers.map((layer: { [x: string]: any }) => layer['id']),
    6
  ).add(map)
}

if (document.readyState != 'loading') {
  init()
} else {
  document.addEventListener('DOMContentLoaded', init)
}
