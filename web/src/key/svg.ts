import { svg, setStyle } from "redom";

function getLayer(layers: { [key: string]: any }[], id: string) {
  for (let l of layers) {
    if (l["id"] == id) {
      return l;
    }
  }
  return null;
}

export function svgLine(colour: string, thickness: number, dash = "") {
  const height = 15;
  const width = 30;

  let line = svg("line", {
    x1: 0,
    y1: height / 2,
    x2: width,
    y2: height / 2,
  });

  setStyle(line, {
    stroke: colour,
    "stroke-width": thickness,
    "stroke-dasharray": dash,
  });

  return svg("svg", line, { height: height, width: width });
}

export function svgLineFromLayer(
  layers: { [key: string]: any }[],
  name: string,
  thickness = 2
) {
  let layer = getLayer(layers, name);
  if (layer) {
    let dasharray = layer ? layer["paint"]["line-dasharray"].join(" ") : "";
    return svgLine(layer["paint"]["line-color"], thickness, dasharray);
  }
}

export function svgRect(colour: string, stroke = "black", opacity = 1) {
  const height = 15;
  const width = 30;

  let rect = svg("rect", {
    width: width,
    height: height,
  });

  setStyle(rect, {
    fill: colour,
    stroke: stroke,
    "stroke-width": 1,
    opacity: opacity,
  });

  return svg("svg", rect, { height: height, width: width });
}

export function svgRectFromLayer(
  layers: { [key: string]: any }[],
  name: string
) {
  let layer = getLayer(layers, name);
  if (!layer) {
    return;
  }
  let opacity = 1;
  let outline_color = "";
  if (layer["paint"]["fill-opacity"]) {
    opacity = layer["paint"]["fill-opacity"];
  }
  if (layer["paint"]["fill-outline-color"]) {
    outline_color = layer["paint"]["fill-outline-color"];
  }
  return svgRect(layer["paint"]["fill-color"], outline_color, opacity);
}
