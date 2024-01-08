import { LayerSpecification } from 'maplibre-gl'

export type LayerSpecificationWithZIndex = LayerSpecification & {
  zorder?: number
}
