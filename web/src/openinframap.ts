import maplibregl from 'maplibre-gl'
import { t } from 'i18next'
import { mount } from 'redom'

import { LayerSwitcher, URLHash, Layer } from '@russss/maplibregl-layer-switcher'

import EditButton from './edit-control.js'
import InfoPopup from './infopopup.js'
import KeyControl from './key/key.js'
import WarningBox from './warning-box/warning-box.js'
import OpenInfraMapGeocoder from './geocoder.js'

import map_style from './style/style.js'
import style_base from './style/style_base.js'
import style_labels from './style/style_labels.js'
import style_oim_power from './style/style_oim_power.js'
import style_oim_power_heatmap from './style/style_oim_power_heatmap.js'
import style_oim_telecoms from './style/style_oim_telecoms.js'
import style_oim_petroleum from './style/style_oim_petroleum.js'
import style_oim_water from './style/style_oim_water.js'
import { LayerSpecificationWithZIndex } from './style/types.js'

import { manifest } from 'virtual:render-svg'

export default class OpenInfraMap {
  map?: maplibregl.Map

  isWebglSupported() {
    if (window.WebGLRenderingContext) {
      const canvas = document.createElement('canvas')
      try {
        const context =
          canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true }) ||
          canvas.getContext('webgl', { failIfMajorPerformanceCaveat: true })
        if (context && typeof context.getParameter == 'function') {
          return true
        }
      } catch {
        // WebGL is supported, but disabled
      }
      return false
    }
    // WebGL not supported
    return false
  }

  constructor() {
    if (!this.isWebglSupported()) {
      const infobox = new WarningBox(t('warning', 'Warning'))
      infobox.update(
        t(
          'warnings.webgl',
          '<p>Your browser may have performance or functionality issues with Open Infrastructure Map.</p>' +
            '<p><a href="http://webglreport.com">WebGL</a> with hardware acceleration is required for this site ' +
            'to perform well.</p>' +
            '<p>If your browser supports WebGL, you may need to disable browser fingerprinting protection for this site.</p>'
        )
      )
      mount(document.body, infobox)
    }

    maplibregl.setRTLTextPlugin(
      'https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js',
      true // Lazy load the plugin
    )
  }

  init() {
    const oim_layers: LayerSpecificationWithZIndex[] = [
      ...style_oim_power(),
      ...style_oim_power_heatmap,
      ...style_oim_petroleum(),
      ...style_oim_telecoms(),
      ...style_oim_water()
    ]

    oim_layers.sort((a, b) => {
      if (!a.zorder || !b.zorder) {
        throw new Error('zorder is required for all layers')
      }
      if (a.zorder < b.zorder) return -1
      if (a.zorder > b.zorder) return 1
      return 0
    })

    const layer_switcher = new LayerSwitcher(
      [
        new Layer('P', t('layers.power', 'Power'), 'power_', true),
        new Layer('S', t('layers.heatmap', 'Solar Generation'), 'heatmap_', false),
        new Layer('T', t('layers.telecoms', 'Telecoms'), 'telecoms_', false),
        new Layer('O', t('layers.petroleum', 'Oil & Gas'), 'petroleum_', false),
        new Layer('W', t('layers.water', 'Water'), 'water_', false),
        new Layer('L', t('layers.labels', 'Labels'), 'place_', true)
      ],
      t('layers.title', 'Layers')
    )
    const url_hash = new URLHash(layer_switcher)

    map_style.layers = style_base.concat(oim_layers, style_labels())

    layer_switcher.setInitialVisibility(map_style)

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

    const icon_ratio = Math.min(Math.round(window.devicePixelRatio), 2)
    const icons = manifest[icon_ratio.toString()]
    const loadedIcons = new Set<string>()

    map.on('styleimagemissing', async (e) => {
      const image = await map.loadImage(icons[e.id])
      if (loadedIcons.has(e.id)) return
      loadedIcons.add(e.id)
      map.addImage(e.id, image.data, { pixelRatio: icon_ratio })
    })

    map.on('click', 'place_capital', (e) => {
      console.log(e.features)
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
    map.addControl(new OpenInfraMapGeocoder(), 'top-left')
    new InfoPopup(
      oim_layers.map((layer: { [x: string]: any }) => layer['id']),
      6
    ).add(map)

    this.map = map
  }
}
