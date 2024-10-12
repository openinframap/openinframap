import { IControl } from 'maplibre-gl'
import { el } from 'redom'
import './edit-control.css'

class EditControl implements IControl {
  _map: any
  _control!: HTMLDivElement
  _menu!: HTMLUListElement

  onAdd(map: maplibregl.Map) {
    this._map = map

    const edit_button = el('button', 'Edit')
    edit_button.onclick = (ev: MouseEvent) => {
      this.doEdit()
      ev.preventDefault()
    }

    this._menu = el(
      'ul',
      el(
        'li',
        el('button', 'Edit with remote control (JOSM, etc)', { onclick: () => this.doEdit('remote') })
      ),
      el('li', el('button', 'Edit in browser (iD)', { onclick: () => this.doEdit('id') })),
      {
        class: 'maplibregl-ctrl oim-editor-menu'
      }
    )

    const more_button = el('button', '^', {
      class: 'oim-edit-more',
      onclick: () => this._menu.classList.toggle('active')
    })

    this._control = el('div', edit_button, more_button, {
      class: 'maplibregl-ctrl oim-edit-control'
    })
    const container = el('div', this._menu, this._control)

    map.on('zoomend', () => this.updateVisibility())
    map.on('movestart', () => this._menu.classList.remove('active'))

    this.updateVisibility()
    return container
  }

  doEdit(setEditor?: string) {
    let editor = setEditor || localStorage.getItem('editor')
    if (!editor) {
      editor = 'id'
    }
    localStorage.setItem('editor', editor)

    this._menu.classList.remove('active')

    if (editor === 'id') {
      window.open(this._getIdURL(), '_blank')
    } else {
      const url = this._getRemoteURL()
      fetch(url).catch((error) => {
        alert(
          "Unable to load remote editor - make sure it's running and has remote control enabled.\nError: " +
            error
        )
      })
    }
  }

  onRemove(): void {
    this._map = undefined
    this._control.remove()
  }

  updateVisibility() {
    if (this._map.getZoom() > 14) {
      this._control.classList.add('active')
    } else {
      this._control.classList.remove('active')
    }
  }

  _getRemoteURL() {
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

  _getIdURL() {
    const zoom = Math.round(this._map.getZoom())
    const center = this._map.getCenter()
    return `https://www.openstreetmap.org/edit?editor=id#map=${zoom}/${center.lat.toFixed(5)}/${center.lng.toFixed(5)}`
  }
}

export { EditControl as default }
