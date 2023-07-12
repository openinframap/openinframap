import "./index.css";
import maplibregl, { IControl } from "maplibre-gl";

// @ts-ignore
import LayerSwitcher from "@russss/maplibregl-layer-switcher";
// @ts-ignore
import URLHash from "@russss/maplibregl-layer-switcher/urlhash";

import EditButton from "./editbutton.js";
import InfoPopup from "./infopopup.js";
import KeyControl from "./key/key.js";

import map_style from "./style/style.json";
import style_base from "./style/style_base.js";
import style_labels from "./style/style_labels.js";
import style_oim_power from "./style/style_oim_power.js";
import style_oim_power_heatmap from "./style/style_oim_power_heatmap.js";
import style_oim_telecoms from "./style/style_oim_telecoms.js";
import style_oim_petroleum from "./style/style_oim_petroleum.js";
import style_oim_water from "./style/style_oim_water.js";
import loadIcons from "./loadIcons.js";

function init() {
  // if (!maplibregl.supported({ failIfMajorPerformanceCaveat: true })) {
  //   const infobox = new InfoBox("Warning");
  //   infobox.update(
  //     "Your browser may have performance or functionality issues with OpenInfraMap.<br/>" +
  //       '<a href="http://webglreport.com">WebGL</a> with hardware acceleration is required for this site ' +
  //       "to perform well."
  //   );
  //   mount(document.body, infobox);
  // }

  maplibregl.setRTLTextPlugin(
    "https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js",
    () => {},
    true // Lazy load the plugin
  );

  var oim_layers = style_oim_power.concat(
    // @ts-ignore
    style_oim_power_heatmap,
    style_oim_petroleum,
    style_oim_telecoms,
    style_oim_water
  );

  oim_layers.sort((a, b) => {
    if (a["zorder"] < b["zorder"]) return -1;
    if (a["zorder"] > b["zorder"]) return 1;
    return 0;
  });

  const layers = {
    Power: "power_",
    "Solar Generation": "heatmap_",
    Telecoms: "telecoms_",
    "Oil & Gas": "petroleum_",
    Water: "water_",
    Labels: "place_",
  };
  const layers_enabled = ["Power", "Labels"];
  const layer_switcher = new LayerSwitcher(layers, layers_enabled);
  var url_hash = new URLHash(layer_switcher);
  layer_switcher.urlhash = url_hash;

  // @ts-ignore
  map_style.layers = style_base.concat(oim_layers, style_labels);

  layer_switcher.setInitialVisibility(map_style);

  if (import.meta.env.DEV) {
    // map_style["sprite"] = "http://localhost:8080/style/sprite";
    // map_style['sources']['openinframap']['url'] = 'http://localhost:8081/capabilities/openinframap.json'
    // map_style['sources']['solar_heatmap']['url'] = 'http://localhost:8081/capabilities/solar_heatmap.json'
  }

  var map = new maplibregl.Map(
    url_hash.init({
      container: "map",
      style: map_style,
      minZoom: 2,
      maxZoom: 17.9,
      center: [12, 26],
    })
  );

  loadIcons(map);

  map.dragRotate.disable();
  map.touchZoomRotate.disableRotation();

  url_hash.enable(map);
  map.addControl(
    new maplibregl.NavigationControl({ showCompass: false }),
    "top-right"
  );
  map.addControl(
    new maplibregl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
      },
      trackUserLocation: true,
    })
  );

  map.addControl(new maplibregl.ScaleControl({}), "bottom-left");

  map.addControl(new KeyControl() as unknown as IControl, "top-right");
  map.addControl(layer_switcher, "top-right");
  map.addControl(new EditButton() as unknown as IControl, "bottom-right");
  new InfoPopup(
    oim_layers.map((layer: { [x: string]: any }) => layer["id"]),
    9
  ).add(map);
}

if (document.readyState != "loading") {
  init();
} else {
  document.addEventListener("DOMContentLoaded", init);
}
