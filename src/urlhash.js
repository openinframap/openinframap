

class URLHash {

  constructor(layerSwitcher) {
    this.layerSwitcher = layerSwitcher;
    this._onHashChange();
  }

  onAdd(map) {
    this._map = map;
    map.on('moveend', () => {
      this._updateHash();
    });

    window.addEventListener(
      'hashchange',
      () => {
        this._onHashChange();
      },
      false,
    );
  }

  _onHashChange() {
    const loc = window.location.hash.replace('#', '').split('/');
    if (loc.length >= 3) {
      let layerString = "";
      if (this._map) {
        this._map.jumpTo({
          center: [+loc[2], +loc[1]],
          zoom: +loc[0],
        });
      }
      for (let i = 3; i < loc.length; i++) {
        let component = loc[i];
        let matches = component.match(/([a-z])=(.*)/);
        if (matches) {
          if (matches[1] == 'm') {
            markerString = matches[2];
          } else {
            return false;
          }
        } else {
          layerString = component;
        }
      }
      this.layerSwitcher.setURLString(layerString);
      return true;
    }
    this.layerSwitcher.setURLString("");
    return false;
  }

  _updateHash() {
    try {
      window.history.replaceState(
        window.history.state,
        '',
        this.getHashString(),
      );
    } catch (e) {
      console.log(e);
    }
  }

  getHashString() {
    const center = this._map.getCenter(),
      zoom = Math.round(this._map.getZoom() * 100) / 100,
      // derived from equation: 512px * 2^z / 360 / 10^d < 0.5px
      precision = Math.ceil(
        (zoom * Math.LN2 + Math.log(512 / 360 / 0.5)) / Math.LN10,
      ),
      m = Math.pow(10, precision),
      lng = Math.round(center.lng * m) / m,
      lat = Math.round(center.lat * m) / m,
      bearing = this._map.getBearing(),
      pitch = this._map.getPitch();
    let hash = `#${zoom}/${lat}/${lng}`;
    let layers = this.layerSwitcher.getURLString();
    if (layers) {
      hash += '/' + layers;
    }
    return hash;
  }

  getPosition() {
    const loc = window.location.hash.replace('#', '').split('/');
    if (loc.length >= 3) {
      return {
        center: [+loc[2], +loc[1]],
        zoom: +loc[0],
      };
    }
    return {};
  }
};

export default URLHash;
