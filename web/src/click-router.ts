import { LngLat, MapGeoJSONFeature, MapMouseEvent } from 'maplibre-gl'
import { LayerSpecificationWithZIndex } from './style/types'

export type ClickHandler = (feature: MapGeoJSONFeature, location: LngLat, event: MapMouseEvent) => void

type LayerId = string

/*
 * Handles clicks on objects in a MapLibre map and routes them to exactly one registered handler.
 * Also deals with setting the mouse cursor to a pointer when hovering over clickable features.
 *
 * Clicking is disabled at lower zooms to prevent accidental clicks.
 */
export class ClickRouter {
  map: maplibregl.Map
  layerPriorities: { [layerId: LayerId]: number | undefined } = {}
  handlers: { [layerId: LayerId]: ClickHandler } = {}
  minZoom: number = 0

  constructor(map: maplibregl.Map, layers: LayerSpecificationWithZIndex[], minZoom: number = 6) {
    this.minZoom = minZoom
    this.map = map
    for (const layer of layers) {
      this.layerPriorities[layer.id] = layer.zorder
    }

    // Always reset the cursor on zoom
    map.on('zoom', () => this.clearCursor())
  }

  registerHandler(layerIds: LayerId | LayerId[], handler: ClickHandler) {
    if (!Array.isArray(layerIds)) {
      layerIds = [layerIds]
    }
    for (const layerId of layerIds) {
      this.handlers[layerId] = handler
    }
  }

  private handleClick(e: MapMouseEvent & { features?: MapGeoJSONFeature[] | undefined }) {
    if (this.map.getZoom() < this.minZoom) return
    if (e.features === undefined || e.features.length === 0) return

    const data = []
    for (const feature of e.features) {
      const layerId = feature.layer.id
      data.push({
        priority: this.layerPriorities[layerId] || 0,
        feature: feature,
        handler: this.handlers[layerId]
      })
    }

    data.sort((a, b) => b.priority - a.priority)

    const handler = data[0].handler
    this.clearCursor()
    handler(data[0].feature, e.lngLat, e)
  }

  private setCursor() {
    if (this.map.getZoom() < this.minZoom) return
    this.map.getCanvas().style.cursor = 'pointer'
  }

  private clearCursor() {
    if (this.map.getZoom() < this.minZoom) return
    this.map.getCanvas().style.cursor = ''
  }

  private getLayers() {
    return Object.keys(this.handlers).sort()
  }

  register() {
    const layers = this.getLayers()
    this.map.on('click', layers, (e) => this.handleClick(e))
    this.map.on('mouseenter', layers, () => this.setCursor())
    this.map.on('mouseleave', layers, () => this.clearCursor())
  }
}
