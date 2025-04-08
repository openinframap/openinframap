/*
 * Coordinates search provider - detects if the user has entered lat/lon coordinates
 * and returns them as the most relevant search result.
 */
import { convert as convert_coords } from 'geo-coordinates-parser'
import { SearchResult, ISearchProvider } from './search'

export default class CoordinatesSearch implements ISearchProvider {
  async search(query: string, _limit: number = 5): Promise<SearchResult[]> {
    let coords
    try {
      coords = convert_coords(query)
    } catch (error) {
      return []
    }

    return [
      {
        latitude: parseFloat(coords.decimalLatitude.toFixed(5)),
        longitude: parseFloat(coords.decimalLongitude.toFixed(5)),
        name: query,
        score: 1,
        description: 'Coordinates'
      }
    ]
  }
}
