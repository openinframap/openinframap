/*
 * Search provider for OpenCage
 */
import { SearchResult, ISearchProvider } from './search'
import { t } from 'i18next'

type OpenCageResult = {
  formatted: string
  name: string
  geometry: {
    lat: string
    lng: string
  }
}

type OpenCageResponse = {
  results: OpenCageResult[]
  total_results: number
  status: {
    message: string
    code: string
  }
}

export default class OpenCageSearch implements ISearchProvider {
  apiKey: string
  language: string
  baseScore: number = 0.8
  url = 'https://api.opencagedata.com/geosearch'

  constructor(apiKey: string, language: string = 'en') {
    this.apiKey = apiKey
    this.language = language
  }

  async search(query: string, limit: number = 5): Promise<SearchResult[]> {
    const searchParams = new URLSearchParams({
      q: query,
      limit: limit.toString(),
      language: this.language
    })

    const result = await fetch(`${this.url}?${searchParams.toString()}`, {
      method: 'GET',
      headers: { 'OpenCage-Geosearch-Key': this.apiKey }
    })

    if (!result.ok) {
      throw new Error('Failed to fetch OpenCage results')
    }

    const data = (await result.json()) as OpenCageResponse

    if (data.results.length === 0) {
      return []
    }

    return data.results.map((result: OpenCageResult, index: number) => ({
      latitude: parseFloat(result.geometry.lat),
      longitude: parseFloat(result.geometry.lng),
      name: result.formatted,
      score: this.baseScore - index * 0.1,
      description: t('names.place')
    }))
  }
}
