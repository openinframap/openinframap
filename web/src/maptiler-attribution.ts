import { el } from "redom";

class MapTilerAttribution {
  _map: any;
  _control!: HTMLElement;
  onAdd(map: maplibregl.Map) {
    this._map = map;

    var img = el(
      "a",
      el("img", {
        src: "img/maptiler.png",
      }),
      {
        href: "https://www.maptiler.com",
        target: "_blank",
      }
    );

    this._control = el("div#maptiler-attribution", img, {
      class: "maplibregl-ctrl",
    });

    return this._control;
  }
}

export { MapTilerAttribution as default };
