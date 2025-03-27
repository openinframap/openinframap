import maplibregl from 'maplibre-gl'
import { t } from 'i18next'
import { mount } from 'redom'

import { LayerSwitcher, URLHash, Layer, LayerGroup } from '@russss/maplibregl-layer-switcher'

import EditButton from './edit-control.js'
import InfoPopup from './popup/infopopup.js'
import KeyControl from './key/key.js'
import WarningBox from './warning-box/warning-box.js'
import OpenInfraMapGeocoder from './geocoder.js'

import { getStyle, getLayers } from './style/style.js'

import { manifest } from 'virtual:render-svg'
import { ValidationErrorPopup } from './popup/validation-error-popup.js'
import { ClickRouter } from './click-router.js'

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
      infobox.update(t('warnings.webgl'))
      mount(document.body, infobox)
    }

    maplibregl.setRTLTextPlugin(
      'https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js',
      true // Lazy load the plugin
    )
  }

  init() {
    const layer_switcher = new LayerSwitcher(
      [
        new LayerGroup(t('layers.background'), [
          new Layer('N', t('layers.nighttime-lights'), 'black_marble', false),
          new Layer('L', t('layers.labels'), 'label_', true)
        ]),
        new LayerGroup(t('layers.heatmaps'), [
          new Layer('S', t('layers.solar-generation'), 'heatmap_', false)
        ]),
        new LayerGroup(t('layers.infrastructure'), [
          new Layer('P', t('layers.power'), 'power_', true),
          new Layer('T', t('layers.telecoms'), 'telecoms_', false),
          new Layer('O', t('layers.petroleum'), 'petroleum_', false),
          new Layer('I', t('layers.other-pipelines'), 'pipeline_', false),
          new Layer('W', t('layers.water'), 'water_', false)
        ]),
        new LayerGroup(t('layers.validation'), [
          new Layer('E', t('layers.power'), 'osmose_errors_power', false)
        ])
      ],
      t('layers.title', 'Layers')
    )
    const url_hash = new URLHash(layer_switcher)

    const map_style = getStyle()

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

    const clickRouter = new ClickRouter(map, map_style.layers)

    const icon_ratio = Math.min(Math.round(window.devicePixelRatio), 2)
    const icons = manifest[icon_ratio.toString()]
    const loadedIcons = new Set<string>()

    map.on('styleimagemissing', async (e) => {
      const image = await map.loadImage(icons[e.id])
      if (loadedIcons.has(e.id)) return
      loadedIcons.add(e.id)
      map.addImage(e.id, image.data, { pixelRatio: icon_ratio })
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
      getLayers().map((layer: { [x: string]: any }) => layer['id']),
      6
    ).add(map, clickRouter)
    new ValidationErrorPopup(map, clickRouter)

    clickRouter.register()
    this.map = map
  }
}
