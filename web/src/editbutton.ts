import { IControl } from 'maplibre-gl'
import { el, setStyle } from 'redom'

class EditButton implements IControl {
  _map: any
  _control!: HTMLDivElement
  onAdd(map: maplibregl.Map) {
    this._map = map

    const button = el('button', 'Edit in JOSM')
    button.onclick = (ev: MouseEvent) => {
      this._click()
      ev.preventDefault()
    }

    this._control = el('div', button, {
      class: 'maplibregl-ctrl'
    })

    map.on('zoomend', () => {
      this.updateVisibility()
    })

    this.updateVisibility()
    return this._control
  }

  onRemove(): void {
    this._map = undefined
    this._control.remove()
  }

  updateVisibility() {
    if (this._map.getZoom() > 14) {
      setStyle(this._control, { display: 'block' })
    } else {
      setStyle(this._control, { display: 'none' })
    }
  }

  _getJosmURL() {
    const url = 'http://127.0.0.1:8111/load_and_zoom'
    const bounds = this._map.getBounds()
    return (
      url +
      '?left=' +
      bounds.getWest() +
      '&right=' +
      bounds.getEast() +
      '&top=' +
      bounds.getNorth() +
      '&bottom=' +
      bounds.getSouth()
    )
  }

  _click() {
    const url = this._getJosmURL()
    fetch(url).catch((error) => {
      alert(
        "Unable to edit in JOSM - make sure it's running and has remote control enabled.\nError: " + error
      )
    })
  }
}

export { EditButton as default }
