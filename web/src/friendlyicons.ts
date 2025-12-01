import { manifest } from 'virtual:render-svg'

// Map layers icons to show in the infobox
const friendlyIcons: { [key: string]: string } = {
  power_transformer: manifest['svg']['power_transformer'],
  power_tower: manifest['svg']['power_tower'],
  power_pole: manifest['svg']['power_pole'],
  power_generator_symbol: manifest['svg']['power_generator']
}

export default friendlyIcons
