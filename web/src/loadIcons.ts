// @ts-expect-error Vite virtual module
import { manifest } from 'virtual:render-svg'

export default async function loadIcons(map: maplibregl.Map) {
  const ratio = Math.min(Math.round(window.devicePixelRatio), 2)
  const icons = manifest[ratio.toString()]

  for (const name in icons) {
    const image = await map.loadImage(icons[name])
    map.addImage(name, image.data, { pixelRatio: ratio })
  }
}
