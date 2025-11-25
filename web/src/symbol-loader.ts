import { Map, StyleImageMetadata, MapStyleImageMissingEvent } from 'maplibre-gl'
import { manifest } from 'virtual:render-svg'

export class SymbolLoader {
  icon_ratio: number
  icons: Record<string, string>
  loadedIcons: Set<string>

  constructor(private map: Map) {
    this.icon_ratio = Math.min(Math.round(window.devicePixelRatio), 2)
    this.icons = manifest[this.icon_ratio.toString()]
    this.loadedIcons = new Set<string>()
    this.map.on('styleimagemissing', this.styleImageMissing.bind(this))
  }

  async styleImageMissing(e: MapStyleImageMissingEvent) {
    if (this.loadedIcons.has(e.id)) return

    const image_url = this.icons[e.id]
    const metadata: StyleImageMetadata = {
      pixelRatio: this.icon_ratio,
      sdf: false
    }

    if (!image_url) {
      console.error(`Icon not found: ${e.id}`)
      return
    }

    const image = await this.map.loadImage(image_url)
    this.loadedIcons.add(e.id)
    this.map.addImage(e.id, image.data, metadata)
  }
}
