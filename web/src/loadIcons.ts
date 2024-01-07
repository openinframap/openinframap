// @ts-expect-error Vite virtual module
import { manifest } from 'virtual:render-svg';

export default async function loadIcons(map: maplibregl.Map) {
  const ratio = Math.max(window.devicePixelRatio, 2);
  const icons = manifest[ratio.toString()]

  for (const name in icons) {
    map.loadImage(icons[name], function (error, image) {
      if (error) throw error;
      if (!image) throw new Error("Image not found");
      map.addImage(name, image, { pixelRatio: ratio });
    });
  }
}
