import {el, text, mount, unmount, setChildren, setStyle} from 'redom';

class EditButton {
  onAdd(map) {
    this._map = map;

    var button = el('button', 'Edit in JOSM');
    button.onclick = ev => {
      this._click();
      ev.preventDefault();
    };

    this._control = el('div', button, {
      class: 'mapboxgl-ctrl',
    });

    map.on('zoomend', () => {
      this.updateVisibility();
    });

    this.updateVisibility();
    return this._control;
  }

  updateVisibility() {
      if (this._map.getZoom() > 14) {
        setStyle(this._control, {display: 'block'});
      } else {
        setStyle(this._control, {display: 'none'});
      }
  }

  _getJosmURL() {
    var url = 'http://127.0.0.1:8111/load_and_zoom';
    var bounds = this._map.getBounds();
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
    );
  }

  _click() {
    var url = this._getJosmURL();
    fetch(url)
      .catch(error => {
        alert(
          "Unable to edit in JOSM - make sure it's running and has remote control enabled.\nError: " +
            error,
        );
      });
  }
}

export {EditButton as default};
