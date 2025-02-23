// Client for OpenStreetMap editor remote control protocol (JOSM, etc)
// https://wiki.openstreetmap.org/wiki/JOSM/RemoteControl

export interface Bounds {
  minLon: number
  minLat: number
  maxLon: number
  maxLat: number
}

export class OSMRemoteControl {
  host = 'http://127.0.0.1:8111'

  version() {
    return this.fetch('/version')
  }

  loadAndZoom(
    bounds: Bounds,
    options?: { select?: Array<string>; addTags?: Record<string, string> }
  ): Promise<Response> {
    const args = this.convertBounds(bounds)
    if (options && options.select) {
      args['select'] = options.select.join(',')
    }
    if (options && options.addTags) {
      args['addTags'] = Object.entries(options.addTags)
        .map((key, value) => `${key}=${value}`)
        .join('|')
    }
    return this.fetch('/load_and_zoom', args)
  }

  zoom(bounds: Bounds, select?: Array<string>): Promise<Response> {
    const args = this.convertBounds(bounds)
    if (select) {
      args['select'] = select.join(',')
    }
    return this.fetch('/zoom', args)
  }

  import(url: string): Promise<Response> {
    return this.fetch('/import', { url })
  }

  private fetch(path: string, args: Record<string, string> = {}): Promise<Response> {
    const params = new URLSearchParams(args)
    return fetch(`${this.host}${path}?${params}`)
  }

  private convertBounds(bounds: Bounds): Record<string, string> {
    return {
      left: bounds.minLon.toString(),
      right: bounds.maxLon.toString(),
      top: bounds.maxLat.toString(),
      bottom: bounds.minLat.toString()
    }
  }
}
