import { el } from "redom";

class MapTilerAttribution {
  onAdd(map) {
    this._map = map;

    var img = el(
      "a",
      el("img", {
        src: "img/maptiler.png"
      }),
      {
        href: "https://www.maptiler.com",
        target: "_blank"
      }
    );

    this._control = el("div#maptiler-attribution", img, {
      class: "mapboxgl-ctrl"
    });

    return this._control;
  }
}

export { MapTilerAttribution as default };
